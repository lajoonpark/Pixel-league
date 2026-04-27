// Supabase browser client factory.
// Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from Vite environment
// variables (set in .env locally or in the Vercel project settings).
// Returns null when credentials are not configured so the rest of the game
// degrades gracefully — single-player still works without Supabase.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

let _client = null;

// Returns the Supabase client, or null when credentials are missing.
// The client is created once and reused.
export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}

