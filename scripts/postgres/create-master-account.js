#!/usr/bin/env node
/**
 * Create Master Developer Account
 *
 * This script creates the initial master developer account
 * in the PostgreSQL database with proper bcrypt hashed password.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createMasterAccount() {
  try {
    console.log('🔧 Creating master developer account...\n');

    // Default credentials
    const email = 'master@abov3.local';
    const password = 'Abov3Genesis2024!';
    const name = 'Master Developer';

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('⚠️  IMPORTANT: Change password immediately after first login!\n');

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('⚠️  Master developer account already exists!');
      console.log('   Email:', existingUser.email);
      console.log('   Role:', existingUser.role);
      console.log('   Created:', existingUser.createdAt);
      return;
    }

    // Create master developer user
    const user = await prisma.user.create({
      data: {
        email,
        emailVerified: new Date(),
        name,
        password: hashedPassword,
        storageMode: 'CLOUD_FIRST',
        isAdmin: true,
        role: 'MASTER',
        isMasterDev: true,
      },
    });

    console.log('✅ Master developer account created successfully!');
    console.log('   User ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);

    // Grant all feature permissions
    const features = ['NEPHESH', 'TRAIN', 'FLOWCORE', 'ADMIN_PANEL', 'ABOV3_MODELS'];

    for (const feature of features) {
      await prisma.userPermission.create({
        data: {
          userId: user.id,
          feature,
          granted: true,
          grantedBy: user.id,
        },
      });
    }

    console.log('\n✅ Granted all feature permissions:');
    features.forEach(f => console.log('   -', f));

    // Create default user settings
    await prisma.userSettings.create({
      data: {
        userId: user.id,
        preferences: {},
      },
    });

    console.log('\n✅ Created default user settings');
    console.log('\n🎉 Master account setup complete!\n');
    console.log('You can now login with:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('\n⚠️  Remember to change your password after first login!\n');

  } catch (error) {
    console.error('❌ Error creating master account:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createMasterAccount();
