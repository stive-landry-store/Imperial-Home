-- Step 1 of 2. Run this file alone, then run 20260829140001_super_admin_hierarchy.sql.
-- A new enum value cannot be used in the transaction that creates it.
alter type public.user_role add value if not exists 'super_admin';
