import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTasksRealtime(userId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          // Only invalidate if the changed row belongs to the current user
          const rowUserId =
            payload.eventType === "DELETE"
              ? (payload.old as { user_id?: string })?.user_id
              : (payload.new as { user_id?: string })?.user_id;

          if (rowUserId === userId) {
            qc.invalidateQueries({ queryKey: ["tasks"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
