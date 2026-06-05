import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  full_name: string;
  institution: string;
  speciality: string;
  time_saved_hours: number;
  created_at: string;
  updated_at: string;
}

export interface SatchelItem {
  id: string;
  user_id: string;
  title: string;
  tool: string;
  content: string;
  image_url: string | null;
  created_at: string;
}
