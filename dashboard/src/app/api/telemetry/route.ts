import { getSupabaseAdmin } from "@/lib/supabase";

interface TelemetryPayload {
  run_id: string;
  message?: string;
  status?: string;
  details?: string | object;
  role?: string;
  action?: string;
  step_id?: number;
  selector?: string;
  value?: string;
  screenshot_url?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TelemetryPayload;

    if (!body.run_id) {
      return Response.json({ error: "Missing run_id" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const logEntry = {
      run_id: body.run_id,
      message: body.message || "No message provided",
      status: body.status || "INFO",
      details:
        typeof body.details === "object"
          ? JSON.stringify(body.details)
          : body.details || "",
      role: body.role || "assistant",
      action: body.action || "log",
      step_id:
        typeof body.step_id === "number"
          ? body.step_id
          : Math.floor(Date.now() / 1000),
      selector: body.selector || null,
      value: body.value || null,
      screenshot_url: body.screenshot_url || null,
    };

    const { error: logError } = await supabase
      .from("execution_logs")
      .insert(logEntry);

    if (logError) {
      console.error("[Telemetry] Log insertion failed:", logError.message);
      return Response.json({ error: logError.message }, { status: 500 });
    }

    // Update run status if terminal state reached
    if (body.status === "COMPLETED" || body.status === "FAILED") {
      const { error: updateError } = await supabase
        .from("test_runs")
        .update({ status: body.status })
        .eq("id", body.run_id);

      if (updateError) {
        console.error("[Telemetry] Status update failed:", updateError.message);
      }
    }

    return new Response("Telemetry Received", { status: 200 });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown telemetry error";
    console.error("[Telemetry] Request crashed:", errorMessage);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
