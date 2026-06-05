/*
# Smart Professor - Schema Creation

## Overview
Creates the full multi-user schema for the Smart Professor platform (الأستاذ الذكي).
Each teacher has their own profile and private document library (satchel).

## New Tables

### 1. `profiles`
Stores teacher profile info linked to Supabase Auth.
- `id` (uuid, PK, references auth.users) — user identity
- `full_name` (text) — teacher's display name
- `institution` (text) — school/institute name
- `speciality` (text) — teaching subject/speciality
- `time_saved_hours` (numeric) — cumulative hours saved counter
- `created_at` / `updated_at` (timestamptz)

### 2. `satchel_items`
Stores AI-generated documents per teacher (their "briefcase").
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users, DEFAULT auth.uid()) — owner
- `title` (text, not null) — document title
- `tool` (text, not null) — which tool generated it (lesson_planner, etc.)
- `content` (text, not null) — markdown content
- `image_url` (text) — optional diagram image
- `created_at` (timestamptz)

## Security
- RLS enabled on both tables.
- Users can only read/write their own rows.
- `user_id` defaults to `auth.uid()` so inserts without explicit user_id work.
*/

-- =====================
-- PROFILES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  institution text NOT NULL DEFAULT '',
  speciality text NOT NULL DEFAULT '',
  time_saved_hours numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- =====================
-- SATCHEL ITEMS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS satchel_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  tool text NOT NULL,
  content text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS satchel_items_user_id_idx ON satchel_items(user_id);
CREATE INDEX IF NOT EXISTS satchel_items_created_at_idx ON satchel_items(created_at DESC);

ALTER TABLE satchel_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_satchel" ON satchel_items;
CREATE POLICY "select_own_satchel" ON satchel_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_satchel" ON satchel_items;
CREATE POLICY "insert_own_satchel" ON satchel_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_satchel" ON satchel_items;
CREATE POLICY "update_own_satchel" ON satchel_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_satchel" ON satchel_items;
CREATE POLICY "delete_own_satchel" ON satchel_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =====================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
