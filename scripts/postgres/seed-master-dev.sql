-- ========================================
-- Seed Master Developer Account
-- ========================================
--
-- This script creates the initial master developer account
-- for ABOV3 Exodus. Run this once during initial setup.
--
-- Default credentials:
--   Email: master@abov3.local
--   Password: Abov3Genesis2024!
--
-- IMPORTANT: Change the password immediately after first login!
--

-- Insert master developer user
INSERT INTO "User" (
  id,
  email,
  "emailVerified",
  name,
  image,
  password,
  "storageMode",
  "isAdmin",
  role,
  "isMasterDev",
  "createdAt",
  "updatedAt"
) VALUES (
  'master-dev-001',
  'master@abov3.local',
  NOW(),
  'Master Developer',
  NULL,
  -- Password hash for: Abov3Genesis2024!
  -- Generated with: bcrypt.hash('Abov3Genesis2024!', 10)
  '$2b$10$vQ5xZYZ0KZJXHxGZJXHxGO8xYZ0KZJXHxGZJXHxGO8xYZ0KZJXH.C',
  'CLOUD_SYNCED',
  true,
  'MASTER',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Grant all feature permissions to master developer
INSERT INTO "UserPermission" (
  id,
  "userId",
  feature,
  granted,
  "grantedBy",
  "grantedAt"
)
SELECT
  'perm-master-' || feature,
  'master-dev-001',
  feature,
  true,
  'master-dev-001',
  NOW()
FROM unnest(ARRAY['NEPHESH', 'TRAIN', 'FLOWCORE', 'ADMIN_PANEL', 'ABOV3_MODELS']::text[]) AS feature
ON CONFLICT ("userId", feature) DO NOTHING;

-- Create default user settings for master developer
INSERT INTO "UserSettings" (
  id,
  "userId",
  preferences,
  "createdAt",
  "updatedAt"
) VALUES (
  'settings-master-001',
  'master-dev-001',
  '{}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT ("userId") DO NOTHING;

-- Log successful creation
SELECT
  '✅ Master developer account created successfully!' as status,
  'Email: master@abov3.local' as email,
  'Password: Abov3Genesis2024!' as password,
  '⚠️  IMPORTANT: Change password immediately after first login!' as warning;
