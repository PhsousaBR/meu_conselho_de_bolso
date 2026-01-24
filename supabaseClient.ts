import { createClient } from '@supabase/supabase-js';

// NOTE: In a real Next.js app, these would be process.env.NEXT_PUBLIC_SUPABASE_URL
// For this standalone demo, we are using placeholders that the user must replace.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
