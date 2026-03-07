/**
 * Prisma Seed Script
 *
 * Creates the master developer account and initial admin settings.
 * Run with: npx prisma db seed
 */

import { PrismaClient, UserRole, FeatureFlag } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Master developer credentials - REQUIRED environment variables
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`ERROR: ${name} environment variable is required!`);
    console.error('Set these before running the seed script:');
    console.error('  MASTER_DEV_EMAIL=your-email@domain.com');
    console.error('  MASTER_DEV_PASSWORD=your-secure-password (min 12 chars)');
    process.exit(1);
  }
  return value;
}

const MASTER_DEV_EMAIL = getRequiredEnv('MASTER_DEV_EMAIL');
const MASTER_DEV_PASSWORD = getRequiredEnv('MASTER_DEV_PASSWORD');
const MASTER_DEV_NAME = process.env.MASTER_DEV_NAME || 'Master Developer';

// Validate password strength
if (MASTER_DEV_PASSWORD.length < 12) {
  console.error('ERROR: MASTER_DEV_PASSWORD must be at least 12 characters!');
  process.exit(1);
}

async function main() {
  console.log('Starting database seed...');

  // Create or update master developer account
  const hashedPassword = await bcrypt.hash(MASTER_DEV_PASSWORD, 12);

  const masterDev = await prisma.user.upsert({
    where: { email: MASTER_DEV_EMAIL.toLowerCase() },
    update: {
      // Don't update password if user already exists (they may have changed it)
      name: MASTER_DEV_NAME,
      role: UserRole.MASTER,
      isAdmin: true,
      isMasterDev: true,
    },
    create: {
      email: MASTER_DEV_EMAIL.toLowerCase(),
      password: hashedPassword,
      name: MASTER_DEV_NAME,
      role: UserRole.MASTER,
      isAdmin: true,
      isMasterDev: true,
      storageMode: 'CLOUD_FIRST',
    },
  });

  console.log(`Master developer account created/updated: ${masterDev.email}`);

  // Grant all feature permissions to master developer
  const allFeatures = Object.values(FeatureFlag);

  for (const feature of allFeatures) {
    await prisma.userPermission.upsert({
      where: {
        userId_feature: {
          userId: masterDev.id,
          feature: feature,
        },
      },
      update: {
        granted: true,
      },
      create: {
        userId: masterDev.id,
        feature: feature,
        granted: true,
        grantedBy: masterDev.id,
      },
    });
  }

  console.log('All feature permissions granted to master developer');

  // Create default admin settings if they don't exist
  const adminSettings = await prisma.adminSettings.findFirst();

  if (!adminSettings) {
    await prisma.adminSettings.create({
      data: {
        allowSignups: false, // Disable public signups by default for beta
        requireEmailVerification: false,
        smtpSecure: true,
      },
    });
    console.log('Admin settings created (signups disabled by default)');
  } else {
    console.log('Admin settings already exist');
  }

  // Create user settings for master dev if they don't exist
  await prisma.userSettings.upsert({
    where: { userId: masterDev.id },
    update: {},
    create: {
      userId: masterDev.id,
      autoBackup: true,
      llmSettings: {},
      uiSettings: {},
    },
  });

  console.log('Database seed completed successfully!');
  console.log(`Master developer account ready: ${MASTER_DEV_EMAIL}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
