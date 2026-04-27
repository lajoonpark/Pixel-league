// Supabase browser client factory.
// Imports Supabase JS v2 from the jsDelivr ESM CDN — no build step required.
// Returns null when credentials are not configured so the rest of the game can
// degrade gracefully (single-player still works).

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabaseConfig.js';

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

let _clientPromise = null;

// Returns a Promise that resolves to the Supabase client, or null when
// credentials are missing.  The client is created once and reused.
export async function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;

  if (!_clientPromise) {
    _clientPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then(
      ({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    );
  }

  return _clientPromise;
}
