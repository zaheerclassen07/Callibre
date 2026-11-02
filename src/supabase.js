import { createClient } from "@supabase/supabase-js";

// ============================================================
// Callibre talks ONLY to the live Supabase database.
// There is no offline / sample-data mode: if the database can't
// be reached, the app shows an error and a Retry button instead
// of quietly saving to the browser.
// ============================================================

// ============================================================
// Supabase details come from Cloudflare, not from this file:
// Cloudflare -> callibre -> Settings -> Build -> Variables:
//   VITE_SUPABASE_URL       = https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY  = the anon public key (starts with eyJ)
// So you can upload a full new version of the app any time
// without touching your keys.
// ============================================================
let URL = String(import.meta.env.VITE_SUPABASE_URL || "").trim()
  .replace(/\/(rest|auth|storage|realtime)\/.*$/i, "")   // tolerate a pasted API path
  .replace(/\/+$/, "");
let KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

try {
  if (typeof window !== "undefined" && window.localStorage) {
    // Clear an old project override left by earlier builds.
    localStorage.removeItem("custom_supabase_url");
    localStorage.removeItem("custom_supabase_key");
    // One-time clean-up from older builds: clear the stuck
    // "use sample data" flag so browsers go back to the live database.
    localStorage.removeItem("supabase_use_fallback");
  }
} catch (e) {
  // storage blocked: nothing to clean up
}

// If the details haven't been pasted in yet, the app still loads and
// shows "Not connected" instead of a blank page.
export const isConfigured = /^https:\/\//.test(URL) && KEY.length > 20;
export const supabase = createClient(isConfigured ? URL : "https://not-configured.supabase.co", isConfigured ? KEY : "not-configured");

// True when an error means "this table doesn't exist yet"
// (Postgres 42P01, or PostgREST PGRST205 "could not find the table").
export function isMissingTableError(err) {
  if (!err) return false;
  const msg = String(err.message || "").toLowerCase();
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    (msg.includes("relation") && msg.includes("does not exist")) ||
    msg.includes("could not find the table")
  );
}

// Plain-English message for connection problems.
export function friendlyError(err) {
  const msg = String((err && err.message) || err || "");
  if (!isConfigured) {
    return "The app isn't linked to a Supabase project yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Cloudflare (Settings → Build → Variables), then redeploy.";
  }
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return "Can't reach the database. Check your internet connection, then press Retry. Nothing has been saved while offline.";
  }
  return msg;
}
