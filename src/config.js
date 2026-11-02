// ============================================================
// DEFAULT BRANDING
// The live name is stored in Supabase (app_settings table) and
// editable by the Super Admin under Settings -> App branding.
// These values are the fallback (and the installed PWA name,
// which is fixed at build time).
// ============================================================
export const DEFAULT_BRAND = {
  name: "Callibre",
  tagline: "Inbound Team Rewards"
};

// kept for vite.config.js (PWA manifest)
export const APP_NAME = DEFAULT_BRAND.name;
export const APP_TAGLINE = DEFAULT_BRAND.tagline;
