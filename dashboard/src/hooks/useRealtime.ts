"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ExecutionLog } from "@/types/database";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useRealtimeLogs(runId: string | null) {
  const [data, setData] = useState<ExecutionLog[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (!runId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
      return;
    }

    const fetchInitial = async () => {
      try {
        const { data: initialLogs, error } = await supabase
          .from("execution_logs")
          .select("*")
          .eq("run_id", runId)
          .order("step_id", { ascending: true });

        if (error) {
          console.error("[useRealtime] Initial fetch error:", error.message);
          return;
        }

        setData(initialLogs || []);
      } catch (err) {
        console.error("[useRealtime] Fetch failed:", err);
        setData([]);
      }
    };

    fetchInitial();

    // Cleanup any existing subscription before creating new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }

    const channel = supabase
      .channel(`live-run-${runId}`)
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

          setData((current) => {
            const updated = [...current, newLog];
            // Limit to last 100 logs to prevent memory issues
            return updated.slice(-100);
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          isSubscribedRef.current = true;
        } else if (status === "CHANNEL_ERROR") {
          console.error("[useRealtime] Subscription error for run:", runId);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [runId]);

  return runId ? data : [];
}
