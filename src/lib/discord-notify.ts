import { supabase } from "@/integrations/supabase/client";

/**
 * Send a Discord notification for an admin dashboard action.
 * Fires and forgets — never blocks UI or shows errors.
 */
export function notifyDiscord(action: string, details: Record<string, string | number | null | undefined>) {
  supabase.functions
    .invoke("notify-discord", {
      body: { action, details },
    })
    .catch(() => {
      // Silently fail — Discord notifications are best-effort
    });
}
