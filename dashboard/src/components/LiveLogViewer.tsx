"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import StepCard from "./StepCard";
import type { Database } from "@/lib/supabase";
import { Terminal } from "lucide-react";

type ExecutionLog = Database["public"]["Tables"]["execution_logs"]["Row"];

interface LiveLogViewerProps {
  runId: string;
  initialLogs: ExecutionLog[];
}

export default function LiveLogViewer({
  runId,
  initialLogs = [],
}: LiveLogViewerProps) {
  const [logs, setLogs] = useState<ExecutionLog[]>(initialLogs);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!runId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`live-trace-${runId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "execution_logs",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          if (!payload.new) return;

          const newLog = payload.new as ExecutionLog;

          setLogs((prev) => {
            if (newLog.status === "COMPLETED" || newLog.status === "FAILED") {
              setTimeout(() => {
                if (channelRef.current) {
                  supabase.removeChannel(channelRef.current);
                  channelRef.current = null;
                }
              }, 1000);
            }

            const updated = [...prev, newLog];
            return updated.slice(-100);
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [runId]);

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
        <div className="flex items-center gap-3 text-blue-500/50 font-mono text-xs uppercase tracking-[0.3em]">
          <Terminal size={14} className="animate-pulse" />
          <span>Awaiting Uplink...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 pb-20">
      <div className="absolute left-5.25 top-4 bottom-4 w-px bg-slate-800" />

      {logs.map((log, index) => (
        <div
          key={log.id}
          className="animate-in fade-in slide-in-from-left-4 duration-500"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <StepCard
            step={{
              step_id: log.step_id ?? 0,
              role: log.role ?? "system",
              action: log.action ?? "LOG",
              status: log.status ?? "INFO",
              message: log.message ?? "",
              created_at: log.created_at ?? new Date().toISOString(),
              selector: log.selector ?? undefined,
              value: log.value ?? undefined,
              screenshot_url: log.screenshot_url ?? undefined,
            }}
          />
        </div>
      ))}
    </div>
  );
}
