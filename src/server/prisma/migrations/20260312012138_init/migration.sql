-- CreateEnum
CREATE TYPE "LinkStorageVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "LinkStorageDataType" AS ENUM ('CHAT_V1');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'DEVELOPER', 'ADMIN', 'MASTER');

-- CreateEnum
CREATE TYPE "FeatureFlag" AS ENUM ('NEPHESH', 'TRAIN', 'FLOWCORE', 'ADMIN_PANEL', 'ABOV3_MODELS');

-- CreateEnum
CREATE TYPE "UserStorageMode" AS ENUM ('LOCAL_ONLY', 'CLOUD_BACKUP', 'CLOUD_FIRST');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'COMMERCIAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('HEARTBEAT', 'SCHEDULED', 'TRIGGERED', 'MANUAL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('IDLE', 'QUEUED', 'RUNNING', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "ChannelPlatform" AS ENUM ('TELEGRAM', 'WHATSAPP', 'SLACK', 'DISCORD');

-- CreateEnum
CREATE TYPE "UpdateStatus" AS ENUM ('PENDING', 'VALIDATING', 'BACKING_UP', 'APPLYING', 'MIGRATING', 'RESTARTING', 'COMPLETED', 'FAILED', 'ROLLED_BACK');

-- CreateTable
CREATE TABLE "LinkStorage" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "visibility" "LinkStorageVisibility" NOT NULL,
    "dataType" "LinkStorageDataType" NOT NULL,
    "dataTitle" TEXT,
    "dataSize" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "upVotes" INTEGER NOT NULL DEFAULT 0,
    "downVotes" INTEGER NOT NULL DEFAULT 0,
    "flagsCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "writeCount" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "deletionKey" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkStorage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "password" TEXT,
    "storageMode" "UserStorageMode" NOT NULL DEFAULT 'LOCAL_ONLY',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isMasterDev" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" "FeatureFlag" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "DConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userTitle" TEXT,
    "autoTitle" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "userSymbol" TEXT,
    "messages" JSONB NOT NULL,
    "systemPurposeId" TEXT,
    "cloudBackupAt" TIMESTAMP(3),
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "llmSettings" JSONB,
    "uiSettings" JSONB,
    "appSettings" JSONB,
    "workflowData" JSONB,
    "autoBackup" BOOLEAN NOT NULL DEFAULT false,
    "backupFrequency" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSettings" (
    "id" TEXT NOT NULL,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpFrom" TEXT,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "emailTemplates" JSONB,
    "allowSignups" BOOLEAN NOT NULL DEFAULT true,
    "requireEmailVerification" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "email" TEXT,
    "note" TEXT,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "status" "InvitationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvitationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationUsage" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NepheshProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemMessage" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "llmId" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 2048,
    "enabledSkills" TEXT[],
    "enabledTools" JSONB NOT NULL,
    "memoryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "memoryMaxItems" INTEGER NOT NULL DEFAULT 1000,
    "channelBindings" JSONB NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NepheshProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NepheshJob" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "schedule" TEXT,
    "status" "JobStatus" NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT,
    "inputPrompt" TEXT,
    "resultMessages" JSONB,
    "heartbeatSkill" TEXT,
    "lastHeartbeat" TIMESTAMP(3),
    "nextHeartbeat" TIMESTAMP(3),
    "logs" JSONB NOT NULL DEFAULT '[]',
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "NepheshJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NepheshMemory" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "source" TEXT,
    "importance" INTEGER NOT NULL DEFAULT 5,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "conversationId" TEXT,

    CONSTRAINT "NepheshMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelIntegration" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "platform" "ChannelPlatform" NOT NULL,
    "config" JSONB NOT NULL,
    "accessToken" TEXT,
    "incomingWebhook" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChannelIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NepheshSkill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "markdown" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "installedBy" TEXT[],
    "permissions" TEXT[],
    "requiredEnvVars" TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "installCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NepheshSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoftwareUpdate" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" "UpdateStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedBy" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "rollbackAt" TIMESTAMP(3),
    "error" TEXT,
    "backupPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoftwareUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_feature_key" ON "UserPermission"("userId", "feature");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "DConversation_userId_idx" ON "DConversation"("userId");

-- CreateIndex
CREATE INDEX "DConversation_userId_updated_idx" ON "DConversation"("userId", "updated");

-- CreateIndex
CREATE INDEX "DConversation_userId_isArchived_idx" ON "DConversation"("userId", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationCode_code_key" ON "InvitationCode"("code");

-- CreateIndex
CREATE INDEX "InvitationCode_code_idx" ON "InvitationCode"("code");

-- CreateIndex
CREATE INDEX "InvitationCode_status_idx" ON "InvitationCode"("status");

-- CreateIndex
CREATE INDEX "InvitationCode_createdById_idx" ON "InvitationCode"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationUsage_userId_key" ON "InvitationUsage"("userId");

-- CreateIndex
CREATE INDEX "InvitationUsage_invitationId_idx" ON "InvitationUsage"("invitationId");

-- CreateIndex
CREATE INDEX "InvitationUsage_userId_idx" ON "InvitationUsage"("userId");

-- CreateIndex
CREATE INDEX "NepheshProfile_userId_idx" ON "NepheshProfile"("userId");

-- CreateIndex
CREATE INDEX "NepheshProfile_userId_enabled_idx" ON "NepheshProfile"("userId", "enabled");

-- CreateIndex
CREATE INDEX "NepheshJob_profileId_idx" ON "NepheshJob"("profileId");

-- CreateIndex
CREATE INDEX "NepheshJob_status_idx" ON "NepheshJob"("status");

-- CreateIndex
CREATE INDEX "NepheshJob_nextHeartbeat_idx" ON "NepheshJob"("nextHeartbeat");

-- CreateIndex
CREATE INDEX "NepheshMemory_profileId_idx" ON "NepheshMemory"("profileId");

-- CreateIndex
CREATE INDEX "NepheshMemory_profileId_timestamp_idx" ON "NepheshMemory"("profileId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelIntegration_profileId_platform_key" ON "ChannelIntegration"("profileId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "NepheshSkill_name_key" ON "NepheshSkill"("name");

-- CreateIndex
CREATE INDEX "NepheshSkill_name_version_idx" ON "NepheshSkill"("name", "version");

-- CreateIndex
CREATE INDEX "SoftwareUpdate_status_idx" ON "SoftwareUpdate"("status");

-- CreateIndex
CREATE INDEX "SoftwareUpdate_createdAt_idx" ON "SoftwareUpdate"("createdAt");

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DConversation" ADD CONSTRAINT "DConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationUsage" ADD CONSTRAINT "InvitationUsage_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "InvitationCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NepheshJob" ADD CONSTRAINT "NepheshJob_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "NepheshProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NepheshMemory" ADD CONSTRAINT "NepheshMemory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "NepheshProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelIntegration" ADD CONSTRAINT "ChannelIntegration_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "NepheshProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
