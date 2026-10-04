import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// Vite exposes VITE_* variables to the browser. If Vercel has not injected
// them yet, use harmless placeholders so the UI still renders instead of
// crashing during module initialization. Supabase calls will simply fail
// until the real variables are configured.
export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-publishable-key",
);
