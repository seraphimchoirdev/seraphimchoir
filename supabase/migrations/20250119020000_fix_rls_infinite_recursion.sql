-- Fix RLS infinite recursion in user_profiles policies
-- The problem: RLS policies were querying user_profiles table,
-- which triggered the same policies again, causing infinite recursion.
--
-- Solution: Use SECURITY DEFINER helper functions to bypass RLS when checking roles.

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Members are editable by part leaders and above" ON members;
DROP POLICY IF EXISTS "Attendances are editable by part leaders and above" ON attendances;
DROP POLICY IF EXISTS "Arrangements are editable by conductors and above" ON arrangements;
DROP POLICY IF EXISTS "Seats are editable by conductors and above" ON seats;

-- Create helper function to get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.user_profiles
    WHERE id = auth.uid()
  );
END;
$$;

-- Create helper function to check if user has any of the required roles
CREATE OR REPLACE FUNCTION public.has_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := public.get_user_role();
  RETURN user_role = ANY(required_roles);
END;
$$;

-- Recreate Members policies using helper function
CREATE POLICY "Members are editable by part leaders and above"
  ON members FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']));

-- Recreate Attendances policies using helper function
CREATE POLICY "Attendances are editable by part leaders and above"
  ON attendances FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']));

-- Recreate Arrangements policies using helper function
CREATE POLICY "Arrangements are editable by conductors and above"
  ON arrangements FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']));

-- Recreate Seats policies using helper function
CREATE POLICY "Seats are editable by conductors and above"
  ON seats FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR']));

-- Recreate Admin policy for user_profiles using helper function
CREATE POLICY "Admins can manage all profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN']))
  WITH CHECK (public.has_role(ARRAY['ADMIN']));

-- Grant execute permission on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT[]) TO authenticated;
