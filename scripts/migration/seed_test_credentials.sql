-- =========================================================================
-- TURN 4: TEST CREDENTIALS SEED (FIXED)
-- Run this in the Supabase SQL Editor AFTER running the Turn 3 script.
-- Populates auth.users, auth.identities, and public.employees.
-- All passwords are set to 'password123'.
-- =========================================================================

DO $$
DECLARE
  dept_it_id UUID := '11111111-1111-1111-1111-111111111111';
  dept_hr_id UUID := '22222222-2222-2222-2222-222222222222';
  dept_ops_id UUID := '33333333-3333-3333-3333-333333333333';

  uid_sysadmin  UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  uid_it_mgr    UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
  uid_it_staff  UUID := 'aaaaaaaa-0000-0000-0000-000000000003';
  uid_hr_mgr    UUID := 'aaaaaaaa-0000-0000-0000-000000000004';
  uid_qms_coord UUID := 'aaaaaaaa-0000-0000-0000-000000000005';
  uid_exec_vp   UUID := 'aaaaaaaa-0000-0000-0000-000000000006';
  uid_viewer    UUID := 'aaaaaaaa-0000-0000-0000-000000000007';

  pw_hash TEXT;
BEGIN
  -- Hash for 'password123'
  pw_hash := crypt('password123', gen_salt('bf'));

  -- FIX: In a previous update, the UI was wired to save visibility_scope to a
  -- custom_metadata JSONB column on the employees table, but the column was
  -- never added to the database schema. We fix that latent bug here.
  ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS custom_metadata JSONB;

  -- ==========================================
  -- 1. System Admin
  -- ==========================================
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  SELECT '00000000-0000-0000-0000-000000000000', uid_sysadmin, 'authenticated', 'authenticated', 'admin@ims.local', pw_hash, now(), '{"provider":"email","providers":["email"]}', '{"name":"System Admin"}', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = uid_sysadmin);
  
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  SELECT gen_random_uuid(), uid_sysadmin, uid_sysadmin::text, format('{"sub":"%s","email":"admin@ims.local"}', uid_sysadmin::text)::jsonb, 'email', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = uid_sysadmin);
  
  INSERT INTO public.employees (id, auth_user_id, firstname, lastname, email, role, is_active)
  VALUES (uid_sysadmin, uid_sysadmin, 'System', 'Admin', 'admin@ims.local', 'SYSTEM_ADMIN', true) ON CONFLICT DO NOTHING;

  -- ==========================================
  -- 2. IT Manager (Approver Step 2)
  -- ==========================================
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  SELECT '00000000-0000-0000-0000-000000000000', uid_it_mgr, 'authenticated', 'authenticated', 'it.manager@ims.local', pw_hash, now(), '{"provider":"email","providers":["email"]}', '{"name":"IT Manager"}', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = uid_it_mgr);
  
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  SELECT gen_random_uuid(), uid_it_mgr, uid_it_mgr::text, format('{"sub":"%s","email":"it.manager@ims.local"}', uid_it_mgr::text)::jsonb, 'email', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = uid_it_mgr);
  
  INSERT INTO public.employees (id, auth_user_id, firstname, lastname, email, role, department_id, is_active)
  VALUES (uid_it_mgr, uid_it_mgr, 'IT', 'Manager', 'it.manager@ims.local', 'WRITER', dept_it_id, true) ON CONFLICT DO NOTHING;

  -- ==========================================
  -- 3. IT Staff (Approver Step 1)
  -- ==========================================
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  SELECT '00000000-0000-0000-0000-000000000000', uid_it_staff, 'authenticated', 'authenticated', 'it.staff@ims.local', pw_hash, now(), '{"provider":"email","providers":["email"]}', '{"name":"IT Staff"}', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = uid_it_staff);
  
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  SELECT gen_random_uuid(), uid_it_staff, uid_it_staff::text, format('{"sub":"%s","email":"it.staff@ims.local"}', uid_it_staff::text)::jsonb, 'email', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = uid_it_staff);
  
  INSERT INTO public.employees (id, auth_user_id, firstname, lastname, email, role, department_id, is_active)
  VALUES (uid_it_staff, uid_it_staff, 'IT', 'Staff', 'it.staff@ims.local', 'WRITER', dept_it_id, true) ON CONFLICT DO NOTHING;

  -- ==========================================
  -- 4. HR Manager (1-Step Approver)
  -- ==========================================
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  SELECT '00000000-0000-0000-0000-000000000000', uid_hr_mgr, 'authenticated', 'authenticated', 'hr.manager@ims.local', pw_hash, now(), '{"provider":"email","providers":["email"]}', '{"name":"HR Manager"}', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = uid_hr_mgr);
  
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  SELECT gen_random_uuid(), uid_hr_mgr, uid_hr_mgr::text, format('{"sub":"%s","email":"hr.manager@ims.local"}', uid_hr_mgr::text)::jsonb, 'email', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = uid_hr_mgr);
  
  INSERT INTO public.employees (id, auth_user_id, firstname, lastname, email, role, department_id, is_active)
  VALUES (uid_hr_mgr, uid_hr_mgr, 'HR', 'Manager', 'hr.manager@ims.local', 'WRITER', dept_hr_id, true) ON CONFLICT DO NOTHING;

  -- ==========================================
  -- 5. QMS Coordinator (Ops Approver Step 1)
  -- ==========================================
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  SELECT '00000000-0000-0000-0000-000000000000', uid_qms_coord, 'authenticated', 'authenticated', 'qms@ims.local', pw_hash, now(), '{"provider":"email","providers":["email"]}', '{"name":"QMS Coordinator"}', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = uid_qms_coord);
  
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  SELECT gen_random_uuid(), uid_qms_coord, uid_qms_coord::text, format('{"sub":"%s","email":"qms@ims.local"}', uid_qms_coord::text)::jsonb, 'email', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = uid_qms_coord);
  
  INSERT INTO public.employees (id, auth_user_id, firstname, lastname, email, role, department_id, is_active)
  VALUES (uid_qms_coord, uid_qms_coord, 'QMS', 'Coordinator', 'qms@ims.local', 'WRITER', dept_ops_id, true) ON CONFLICT DO NOTHING;

  -- ==========================================
  -- 6. Executive VP (Ops Approver Step 2)
  -- ==========================================
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  SELECT '00000000-0000-0000-0000-000000000000', uid_exec_vp, 'authenticated', 'authenticated', 'vp@ims.local', pw_hash, now(), '{"provider":"email","providers":["email"]}', '{"name":"Executive VP"}', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = uid_exec_vp);
  
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  SELECT gen_random_uuid(), uid_exec_vp, uid_exec_vp::text, format('{"sub":"%s","email":"vp@ims.local"}', uid_exec_vp::text)::jsonb, 'email', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = uid_exec_vp);
  
  INSERT INTO public.employees (id, auth_user_id, firstname, lastname, email, role, department_id, is_active)
  VALUES (uid_exec_vp, uid_exec_vp, 'Executive', 'VP', 'vp@ims.local', 'WRITER', dept_ops_id, true) ON CONFLICT DO NOTHING;

  -- ==========================================
  -- 7. Global Viewer (Cross-Department scope)
  -- ==========================================
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  SELECT '00000000-0000-0000-0000-000000000000', uid_viewer, 'authenticated', 'authenticated', 'viewer@ims.local', pw_hash, now(), '{"provider":"email","providers":["email"]}', '{"name":"Global Viewer"}', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = uid_viewer);
  
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  SELECT gen_random_uuid(), uid_viewer, uid_viewer::text, format('{"sub":"%s","email":"viewer@ims.local"}', uid_viewer::text)::jsonb, 'email', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = uid_viewer);
  
  -- Custom metadata injects the "visibility_scope": "ALL" for wide testing
  INSERT INTO public.employees (id, auth_user_id, firstname, lastname, email, role, is_active, custom_metadata)
  VALUES (uid_viewer, uid_viewer, 'Global', 'Viewer', 'viewer@ims.local', 'VIEWER', true, '{"visibility_scope": "ALL"}') ON CONFLICT DO NOTHING;

END $$;
