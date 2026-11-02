import { createClient } from "@supabase/supabase-js";

// ============================================================
// Callibre talks ONLY to the live Supabase database.
// There is no offline / sample-data mode: if the database can't
// be reached, the app shows an error and a Retry button instead
// of quietly saving to the browser.
// ============================================================

// ============================================================
// PASTE YOUR SUPABASE PROJECT DETAILS HERE (2 lines below)
// Supabase -> your project -> Project Settings -> API Keys
//   URL: the Project URL (https://xxxx.supabase.co)
//   KEY: the "anon public" key (long text starting with eyJ)
// ============================================================
let URL = "PASTE_YOUR_PROJECT_URL_HERE";
let KEY = "PASTE_YOUR_ANON_PUBLIC_KEY_HERE";

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
export const isConfigured = /^https:\/\//.test(URL) && !KEY.startsWith("PASTE_");
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
    return "The app isn't linked to a Supabase project yet. Paste the Project URL and anon key into src/supabase.js.";
  }
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return "Can't reach the database. Check your internet connection, then press Retry. Nothing has been saved while offline.";
  }
  return msg;
}
