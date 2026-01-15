-- Check if RLS policies exist for rsvps tables
-- Run this FIRST to see what policies currently exist

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('rsvps', 'rsvp_guests')
ORDER BY tablename, cmd, policyname;

-- If this returns 0 rows, the policies don't exist and you need to run the fix script
