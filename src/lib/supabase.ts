import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials. Check your .env file:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING');
  console.error('   VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'set' : 'MISSING');
}

if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  console.error('❌ VITE_SUPABASE_URL must start with https://');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
