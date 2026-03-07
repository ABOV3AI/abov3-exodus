/**
 * Nephesh - Autonomous AI Agent System
 * Type definitions for profiles, jobs, skills, memory, and channels
 */

//
// Subscription Tiers
//

export type SubscriptionTier = 'FREE' | 'COMMERCIAL' | 'ENTERPRISE';

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, { profiles: number; jobsPerDay: number; costLimit: number }> = {
  FREE: { profiles: 1, jobsPerDay: 100, costLimit: 5 },
  COMMERCIAL: { profiles: 10, jobsPerDay: 1000, costLimit: 50 },
  ENTERPRISE: { profiles: 50, jobsPerDay: -1, costLimit: -1 }, // -1 = unlimited
};

//
// Nephesh Profile
//

export interface NepheshProfile {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  systemMessage: string;

  // Execution configuration
  enabled: boolean;
  llmId: string; // DLLMId from user's configured models
  temperature: number;
  maxTokens: number;

  // Skills & Tools
  enabledSkills: string[]; // Skill IDs
  enabledTools: ToolPermissions;

  // Memory configuration
  memoryEnabled: boolean;
  memoryMaxItems: number;

  // Multi-channel bindings
  channelBindings: ChannelBindings;

  // Subscription tier
  tier: SubscriptionTier;

  // Timestamps (string for JSON serialization)
  createdAt: string;
  updatedAt: string;
}

export interface ToolPermissions {
  fileOps: boolean;
  web: boolean;
  codeExec: boolean;
  mcp: boolean;
  customTools: string[]; // Tool IDs
}

export interface ChannelBindings {
  telegram?: {
    chatId: string;
    botToken?: string;
  };
  whatsapp?: {
    phoneNumber: string;
    accessToken?: string;
  };
  slack?: {
    channelId: string;
    botToken?: string;
  };
  discord?: {
    channelId: string;
    botToken?: string;
  };
}

//
// Nephesh Job
//

export type JobType = 'HEARTBEAT' | 'SCHEDULED' | 'TRIGGERED' | 'MANUAL';
export type JobStatus = 'IDLE' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'ERROR';

export interface NepheshJob {
  id: string;
  profileId: string;
  name: string;
  type: JobType;
  schedule: string | null; // Cron expression

  status: JobStatus;
  progress: number;
  currentStep: string | null;

  inputPrompt: string | null;
  resultMessages: any | null; // DMessage[] when populated

  heartbeatSkill: string | null;
  lastHeartbeat: string | null;
  nextHeartbeat: string | null;

  logs: JobLog[];
  executionCount: number;
  totalTokens: number;

  error: string | null;
  retryCount: number;
  maxRetries: number;

  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface JobLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

//
// Nephesh Skill
//

export interface NepheshSkill {
  id: string;
  name: string;
  version: string;
  description: string | null;

  markdown: string;
  manifest: SkillManifest;

  installedBy: string[]; // User IDs
  permissions: string[];
  requiredEnvVars: string[];

  verified: boolean;
  installCount: number;
}

export interface SkillManifest {
  name: string;
  version: string;
  description?: string;
  permissions: string[];
  env?: string[];
  author?: string;
  tags?: string[];
}

//
// Nephesh Memory
//

export interface NepheshMemory {
  id: string;
  profileId: string;
  content: string;
  summary: string | null;
  embedding: number[] | null; // Vector embedding

  source: 'conversation' | 'user_note' | 'heartbeat' | null;
  importance: number; // 1-10 scale

  timestamp: string;
  expiresAt: string | null;
  lastAccessedAt: string | null;

  conversationId: string | null;
}

//
// Channel Integration
//

export type ChannelPlatform = 'TELEGRAM' | 'WHATSAPP' | 'SLACK' | 'DISCORD';

export interface ChannelIntegration {
  id: string;
  profileId: string;
  platform: ChannelPlatform;

  config: ChannelConfig;
  accessToken: string | null;

  incomingWebhook: string | null;
  enabled: boolean;
}

export type ChannelConfig =
  | TelegramConfig
  | WhatsAppConfig
  | SlackConfig
  | DiscordConfig;

export interface TelegramConfig {
  platform: 'TELEGRAM';
  chatId: string;
  botToken: string;
  botUsername?: string;
}

export interface WhatsAppConfig {
  platform: 'WHATSAPP';
  phoneNumber: string;
  businessAccountId: string;
  verifyToken: string;
}

export interface SlackConfig {
  platform: 'SLACK';
  channelId: string;
  teamId: string;
  botUserId?: string;
}

export interface DiscordConfig {
  platform: 'DISCORD';
  channelId: string;
  guildId: string;
  botId?: string;
}

//
// Profile Execution Context
//

export interface ProfileExecutionContext {
  profile: NepheshProfile;
  skills: NepheshSkill[];
  recentMemories: NepheshMemory[];
  relevantMemories?: NepheshMemory[]; // From vector search
  channelContext?: ChannelMessageContext;
}

export interface ChannelMessageContext {
  platform: ChannelPlatform;
  messageId: string;
  senderId: string;
  senderName?: string;
  threadId?: string;
  replyToId?: string;
}

//
// Profile Stats
//

export interface ProfileStats {
  profileId: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalTokens: number;
  estimatedCost: number;
  lastExecution: string | null;
  memoryCount: number;
  memoryUsage: number; // bytes
}
