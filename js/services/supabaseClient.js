/**
 * DEVFLOW — Supabase Client & Service Layer
 * Initializes and exports the public Supabase client using client-safe environment variables.
 * 
 * SECURITY RULE:
 * NEVER use or expose the Supabase service_role key, database password, or private API keys.
 * Only the public Supabase URL and anon/publishable key are used in browser-side code.
 */

import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables across Vite import.meta.env and runtime configurations
const getEnvVar = (key, viteKey) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (viteKey && import.meta.env[viteKey]) return import.meta.env[viteKey];
    if (key && import.meta.env[key]) return import.meta.env[key];
  }
  if (typeof window !== 'undefined' && window.__ENV__) {
    if (viteKey && window.__ENV__[viteKey]) return window.__ENV__[viteKey];
    if (key && window.__ENV__[key]) return window.__ENV__[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    if (viteKey && process.env[viteKey]) return process.env[viteKey];
    if (key && process.env[key]) return process.env[key];
  }
  return '';
};

const supabaseUrl = getEnvVar('SUPABASE_URL', 'VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

// Verify if valid Supabase credentials have been injected
export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.trim().length > 0 &&
    !supabaseUrl.includes('your-project.supabase.co') &&
    supabaseAnonKey &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseAnonKey.includes('your-anon-key')
  );
};

// Initialize the Supabase client
// When credentials are not yet configured, initialize with a safe placeholder URL/key to prevent initialization crashes
const effectiveUrl = isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co';
const effectiveKey = isSupabaseConfigured() ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase = createClient(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export const getSupabaseConfig = () => ({
  url: supabaseUrl,
  isConfigured: isSupabaseConfigured()
});

/**
 * Safe read-only connection test against existing public table 'workspaces'.
 * Does not insert, update, delete, or mutate any data.
 * Does not log any secret keys or passwords.
 */
export const testSupabaseConnection = async () => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase connection: FAILED (Credentials not configured)');
    return { success: false, reason: 'Credentials not configured' };
  }

  try {
    const { data, error, status } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1);

    if (error && status !== 200 && status !== 406 && status !== 0) {
      // If error is table not found or permission or network
      // Note: 200 or 406 or empty array is valid connected response
      console.log(`Supabase connection: FAILED (Status ${status}: ${error.message})`);
      return { success: false, reason: error.message, status };
    }

    console.log('Supabase connection: SUCCESS');
    return { success: true, count: Array.isArray(data) ? data.length : 0 };
  } catch (err) {
    console.log(`Supabase connection: FAILED (${err.message || 'Network error'})`);
    return { success: false, reason: err.message };
  }
};

