"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";
import { encrypt, decrypt } from "@/lib/encryption";

export interface ActionResponse {
  success: boolean;
  message: string;
  runId?: string;
  error?: string;
}

export interface RiskItem {
  url: string;
  risk_score: number;
  status: "CRITICAL" | "BRITTLE" | "STABLE";
  recommendation: string;
}

export interface CrawlRecord {
  id: string;
  url: string;
  report_path: string;
  timestamp: string;
}

interface ProviderRequestBody {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  max_tokens?: number;
  [key: string]: unknown;
}

const PROVIDER_STRATEGIES: Record<
  string,
  {
    url: string;
    method: "GET" | "POST";
    headers: (key: string) => Record<string, string>;
    body?: ProviderRequestBody;
  }
> = {
  openai: {
    url: "https://api.openai.com/v1/models",
    method: "GET",
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  groq: {
    url: "https://api.groq.com/openai/v1/models",
    method: "GET",
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    method: "POST",
    headers: (key) => ({
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "dangerously-allow-browser": "true",
    }),
    body: {
      messages: [{ role: "user", content: "Hi" }],
      model: "claude-3-haiku-20240307",
      max_tokens: 1,
    },
  },
  sonar: {
    url: "https://api.perplexity.ai/chat/completions",
    method: "POST",
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    body: {
      model: "sonar",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    },
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/models",
    method: "GET",
    headers: () => ({}),
  },
};

export async function saveVault(formData: FormData): Promise<ActionResponse> {
  const { userId } = await auth();
  if (!userId) return { success: false, message: "Unauthorized" };

  try {
    const admin = getSupabaseAdmin();
    const { data: existing } = await admin
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const resolve = (
      key: string,
      old: string | null | undefined
    ): string | null => {
      const val = formData.get(key) as string | null;
      return val && val.trim() !== "" ? encrypt(val) : old ?? null;
    };

    const preferredInput = formData.get("preferred_provider") as string | null;

    const { error } = await admin.from("user_settings").upsert(
      {
        user_id: userId,
        encrypted_openai_key: resolve(
          "openai_key",
          existing?.encrypted_openai_key
        ),
        encrypted_gemini_key: resolve(
          "gemini_key",
          existing?.encrypted_gemini_key
        ),
        encrypted_groq_key: resolve("groq_key", existing?.encrypted_groq_key),
        encrypted_anthropic_key: resolve(
          "anthropic_key",
          existing?.encrypted_anthropic_key
        ),
        encrypted_perplexity_key: resolve(
          "perplexity_key",
          existing?.encrypted_perplexity_key
        ),
        preferred_provider:
          preferredInput || existing?.preferred_provider || "openai",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) throw error;

    revalidatePath("/settings");
    return { success: true, message: "Vault secured successfully." };
  } catch (err) {
    console.error("[Vault] Save failed:", err);
    const msg = err instanceof Error ? err.message : "Vault failure";
    return { success: false, message: "Error saving vault", error: msg };
  }
}

export async function getVaultStatus() {
  const { userId } = await auth();
  if (!userId) {
    return {
      keys: {
        openai: false,
        gemini: false,
        groq: false,
        anthropic: false,
        sonar: false,
      },
      preferred: "gemini",
    };
  }

  const admin = getSupabaseAdmin();
  const { data: settings } = await admin
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    keys: {
      openai: !!settings?.encrypted_openai_key,
      gemini: !!settings?.encrypted_gemini_key,
      groq: !!settings?.encrypted_groq_key,
      anthropic: !!settings?.encrypted_anthropic_key,
      sonar: !!settings?.encrypted_perplexity_key,
    },
    preferred: settings?.preferred_provider || "gemini",
  };
}

export async function runTest(formData: FormData): Promise<ActionResponse> {
  const { userId } = await auth();
  if (!userId) return { success: false, message: "Unauthorized" };

  const url = formData.get("url") as string;
  const intent = formData.get("intent") as string;
  const isChaos = formData.get("is_chaos") === "on";
  const provider = (formData.get("provider") as string) || "groq";
  const testData = (formData.get("test_data") as string) || "{}";

  try {
    const admin = getSupabaseAdmin();

    const { data: settings, error: settingsError } = await admin
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (settingsError || !settings) {
      return { success: false, message: "ABORTED: No API keys found." };
    }

    const keyMap: Record<string, string | null> = {
      openai: settings.encrypted_openai_key,
      gemini: settings.encrypted_gemini_key,
      groq: settings.encrypted_groq_key,
      anthropic: settings.encrypted_anthropic_key,
      sonar: settings.encrypted_perplexity_key,
    };

    const encryptedKey = keyMap[provider];
    if (!encryptedKey) {
      return {
        success: false,
        message: `Access Denied: No encrypted key found for ${provider.toUpperCase()}.`,
      };
    }

    const { data: run, error: dbError } = await admin
      .from("test_runs")
      .insert({
        user_id: userId,
        url,
        intent,
        status: "QUEUED",
        mode: isChaos ? "chaos" : "sniper",
      })
      .select()
      .single();

    if (dbError || !run) throw new Error("Cloud DB Registration Failed");

    const payload = Buffer.from(
      JSON.stringify({
        user_id: userId,
        run_id: run.id,
        api_key: encryptedKey,
        context: { baseUrl: url, testData: JSON.parse(testData) },
        instructions: intent,
        mode: isChaos ? "chaos" : "sniper",
        provider,
      })
    ).toString("base64");

    await fetch(process.env.AI_WORKER_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [payload] }),
    });

    revalidatePath("/");
    return { success: true, message: "Mission Launched", runId: run.id };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown launch error";
    return { success: false, message: "Launch Failed", error: errMsg };
  }
}

export async function runScoutMission(
  url: string,
  username?: string,
  password?: string
): Promise<ActionResponse> {
  const { userId } = await auth();
  if (!userId) return { success: false, message: "Unauthorized" };

  try {
    const admin = getSupabaseAdmin();

    const { data: settings, error: settingsError } = await admin
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (settingsError || !settings) {
      return { success: false, message: "ABORTED: API keys missing." };
    }

    const { data: run, error: dbError } = await admin
      .from("test_runs")
      .insert({
        user_id: userId,
        url,
        intent: "AUTONOMOUS SCOUT: Discovering site structure.",
        status: "QUEUED",
        mode: "scout",
      })
      .select("id")
      .single();

    if (dbError || !run) throw new Error("Scout Registration Failed");

    const pref = settings.preferred_provider || "gemini";
    const keyMap: Record<string, string | null> = {
      openai: settings.encrypted_openai_key,
      gemini: settings.encrypted_gemini_key,
      groq: settings.encrypted_groq_key,
      anthropic: settings.encrypted_anthropic_key,
      sonar: settings.encrypted_perplexity_key,
    };

    const encryptedKey = keyMap[pref] || settings.encrypted_gemini_key;

    const payload = Buffer.from(
      JSON.stringify({
        user_id: userId,
        run_id: run.id,
        api_key: encryptedKey,
        url,
        credentials: { username, password },
        mode: "scout",
      })
    ).toString("base64");

    await fetch(process.env.AI_WORKER_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [payload] }),
    });

    revalidatePath("/crawler");
    return { success: true, message: "Scout drone launched.", runId: run.id };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown scout error";
    return { success: false, message: "Scout Launch Failed", error: errMsg };
  }
}

export async function getRiskHeatmap(): Promise<RiskItem[]> {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("execution_logs")
    .select("status, test_runs!inner(url)")
    .limit(100);

  if (error || !data) return [];

  const stats: Record<string, { total: number; weight: number }> = {};

  data.forEach((log) => {
    const url = log.test_runs?.url;
    if (!url) return;

    if (!stats[url]) stats[url] = { total: 0, weight: 0 };
    stats[url].total += 1;
    if (log.status === "FAILED") stats[url].weight += 70;
    if (log.status === "HEALED") stats[url].weight += 30;
  });

  return Object.entries(stats)
    .map(([url, val]): RiskItem => {
      const score = Math.min(Math.round(val.weight / val.total), 100);
      const status = (
        score > 60 ? "CRITICAL" : score > 25 ? "BRITTLE" : "STABLE"
      ) as RiskItem["status"];

      return {
        url,
        risk_score: score,
        status,
        recommendation:
          score > 60 ? "Immediate Logic Audit" : "Selector Optimization",
      };
    })
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 5);
}

export async function saveRunToRegistry(
  runId: string,
  testName: string
): Promise<ActionResponse> {
  const { userId } = await auth();
  if (!userId) return { success: false, message: "Unauthorized" };

  try {
    const supabase = getSupabaseAdmin();

    const { data: run, error: runError } = await supabase
      .from("test_runs")
      .select("*")
      .eq("id", runId)
      .eq("user_id", userId)
      .single();

    if (runError || !run) {
      return {
        success: false,
        message: "Run not found",
        error: runError?.message,
      };
    }

    const { error: insertError } = await supabase.from("saved_tests").insert({
      user_id: run.user_id,
      name: testName,
      intent: run.intent,
      url: run.url,
      run_id: run.id,
      steps_json: {},
    });

    if (insertError) throw insertError;

    revalidatePath("/registry");
    return { success: true, message: "Promoted to Golden Path." };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Registry save failed";
    return { success: false, message: "Registry Save Failed", error: errMsg };
  }
}

export async function runSavedTest(testId: string): Promise<ActionResponse> {
  const { userId } = await auth();
  if (!userId) return { success: false, message: "Unauthorized" };

  try {
    const admin = getSupabaseAdmin();

    const { data: settings, error: settingsError } = await admin
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    const { data: blueprint, error: blueprintError } = await admin
      .from("saved_tests")
      .select("*")
      .eq("id", Number(testId))
      .eq("user_id", userId)
      .single();

    if (settingsError || blueprintError || !settings || !blueprint) {
      return { success: false, message: "System Config or Blueprint missing." };
    }

    const pref = settings.preferred_provider || "gemini";
    const keyMap: Record<string, string | null> = {
      openai: settings.encrypted_openai_key,
      gemini: settings.encrypted_gemini_key,
      groq: settings.encrypted_groq_key,
      anthropic: settings.encrypted_anthropic_key,
      sonar: settings.encrypted_perplexity_key,
    };

    const encryptedKey = keyMap[pref];
    if (!encryptedKey) {
      return {
        success: false,
        message: `Access Denied: No encrypted key found for ${pref.toUpperCase()}.`,
      };
    }

    const { data: run, error: dbError } = await admin
      .from("test_runs")
      .insert({
        user_id: userId,
        url: blueprint.url || "SAVED_BLUEPRINT",
        intent: `REPLAY: ${blueprint.name}`,
        status: "QUEUED",
        mode: "replay",
      })
      .select()
      .single();

    if (dbError || !run) throw new Error("Replay Registration Failed");

    const payload = Buffer.from(
      JSON.stringify({
        user_id: userId,
        run_id: run.id,
        api_key: encryptedKey,
        mode: "replay",
        provider: pref,
        steps:
          typeof blueprint.steps_json === "string"
            ? JSON.parse(blueprint.steps_json)
            : blueprint.steps_json,
      })
    ).toString("base64");

    await fetch(process.env.AI_WORKER_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [payload] }),
    });

    revalidatePath("/");
    return {
      success: true,
      message: "Regression Replay Initiated",
      runId: run.id,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Replay failed";
    return { success: false, message: "Replay Failed", error: errMsg };
  }
}

export async function getReportContent(runId: string) {
  const { userId } = await auth();
  if (!userId) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("test_runs")
    .select("*, execution_logs(*)")
    .eq("id", runId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getCrawlHistory() {
  const { userId } = await auth();
  if (!userId) return { success: false, history: [] };

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("test_runs")
      .select("id, url, created_at")
      .eq("user_id", userId)
      .eq("mode", "scout")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !data) throw error;

    const history: CrawlRecord[] = data.map((item) => ({
      id: item.id,
      url: item.url,
      timestamp: item.created_at ?? new Date().toISOString(),
      report_path: `QA_REPORT_${item.id}.md`,
    }));

    return { success: true, history };
  } catch {
    return { success: false, history: [] };
  }
}

export async function testProviderKey(
  provider: string,
  manualKey?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("AUTH_UNAUTHORIZED");

    let apiKey: string | null = null;

    if (manualKey && manualKey.trim() !== "") {
      apiKey = manualKey.trim();
    } else {
      const admin = getSupabaseAdmin();
      const { data: settings } = await admin
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!settings) throw new Error("VAULT_NOT_FOUND");

      const keyMap: Record<string, string | null> = {
        openai: settings.encrypted_openai_key,
        gemini: settings.encrypted_gemini_key,
        groq: settings.encrypted_groq_key,
        anthropic: settings.encrypted_anthropic_key,
        sonar: settings.encrypted_perplexity_key,
      };

      const encryptedKey = keyMap[provider];
      if (!encryptedKey) throw new Error("KEY_NOT_STORED");

      apiKey = decrypt(encryptedKey);
    }

    if (!apiKey) throw new Error("KEY_NOT_FOUND");

    const strategy = PROVIDER_STRATEGIES[provider];
    if (!strategy) throw new Error("UNSUPPORTED_PROVIDER");

    const finalUrl =
      provider === "gemini" ? `${strategy.url}?key=${apiKey}` : strategy.url;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(finalUrl, {
      method: strategy.method,
      headers: strategy.headers(apiKey),
      body: strategy.body ? JSON.stringify(strategy.body) : undefined,
    });

    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: "Invalid API Key" };
    }

    if (!response.ok)
      return { success: false, message: `Invalid Key (${response.status})` };

    return { success: true, message: "Connection Successful" };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorName = err instanceof Error ? err.name : "UnknownError";

    console.error(`[Vault Test] ${provider}:`, errorMessage);

    const errorMap: Record<string, string> = {
      AUTH_UNAUTHORIZED: "Session expired. Please re-login.",
      VAULT_NOT_FOUND: "No settings found. Save your keys first.",
      KEY_NOT_STORED: "Key not found in vault. Store it first.",
      DECRYPTION_FAILED: "Vault master key mismatch. Re-save your keys.",
      AbortError: "Connection timed out. API may be down.",
    };

    return {
      success: false,
      message:
        errorMap[errorMessage] || errorMap[errorName] || "System Network Error",
    };
  }
}

export async function testHFConnection(): Promise<ActionResponse> {
  const workerUrl = process.env.AI_WORKER_URL;
  if (!workerUrl) return { success: false, message: "Missing AI_WORKER_URL" };

  try {
    const res = await fetch(workerUrl, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
    });
    if (res.status === 503) {
      return {
        success: false,
        message: "Space is Sleeping",
        error: "Wake it up manually.",
      };
    }
    return {
      success: res.ok || res.status === 405,
      message: "AI Worker is Online.",
    };
  } catch {
    return { success: false, message: "Connection Refused" };
  }
}

export async function deleteRun(runId: string): Promise<ActionResponse> {
  const { userId } = await auth();
  if (!userId) return { success: false, message: "Unauthorized" };

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("test_runs")
      .delete()
      .eq("id", runId)
      .eq("user_id", userId);
    if (error) throw error;
    revalidatePath("/");
    return { success: true, message: "Mission purged." };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Purge failed";
    return { success: false, message: "Purge Failed", error: errMsg };
  }
}

export async function deleteSavedTest(testId: number): Promise<ActionResponse> {
  const { userId } = await auth();
  if (!userId) return { success: false, message: "Unauthorized" };

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("saved_tests")
      .delete()
      .eq("id", testId)
      .eq("user_id", userId);

    if (error) throw error;

    revalidatePath("/registry");
    return { success: true, message: "Test removed from registry." };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Delete failed";
    return { success: false, message: "Delete Failed", error: errMsg };
  }
}
