import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("[Webhook] CLERK_WEBHOOK_SECRET not configured");
    return new Response("Server configuration error", { status: 500 });
  }

  const headerPayload = await headers();
  const svix_headers = {
    "svix-id": headerPayload.get("svix-id") || "",
    "svix-timestamp": headerPayload.get("svix-timestamp") || "",
    "svix-signature": headerPayload.get("svix-signature") || "",
  };

  if (
    !svix_headers["svix-id"] ||
    !svix_headers["svix-timestamp"] ||
    !svix_headers["svix-signature"]
  ) {
    console.error("[Webhook] Missing required Svix headers");
    return new Response("Missing headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;
  try {
    evt = wh.verify(body, svix_headers) as WebhookEvent;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Verification failed";
    console.error("[Webhook] Signature verification failed:", errorMsg);
    return new Response("Verification failed", { status: 400 });
  }

  const { id } = evt.data;

  if (!id) {
    console.error("[Webhook] Event missing user ID");
    return new Response("Invalid event data", { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (evt.type === "user.created") {
    const { error } = await supabase.from("user_settings").insert({
      user_id: id as string,
      preferred_provider: "gemini",
    });

    if (error) {
      console.error("[Webhook] Failed to create user settings:", error.message);
      return new Response("Database sync error", { status: 500 });
    }

    console.log(`[Webhook] User settings created for: ${id}`);
  } else if (evt.type === "user.deleted") {
    const { error } = await supabase
      .from("user_settings")
      .delete()
      .eq("user_id", id as string);

    if (error) {
      console.error("[Webhook] Failed to delete user settings:", error.message);
      return new Response("Database cleanup error", { status: 500 });
    }

    console.log(`[Webhook] User data purged for: ${id}`);
  }

  return new Response("Webhook processed", { status: 200 });
}
