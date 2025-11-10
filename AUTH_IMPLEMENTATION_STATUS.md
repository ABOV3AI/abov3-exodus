# Authentication & Cloud Deployment Implementation Status

## ✅ COMPLETED PHASES (1-3)

### Phase 1: Dependencies ✅
**Installed packages:**
- `next-auth@5.0.0-beta.25` - Authentication framework
- `@auth/prisma-adapter@2.7.4` - Prisma adapter for NextAuth
- `nodemailer@6.9.16` - Email service
- `bcryptjs@2.4.3` - Password hashing
- `@types/nodemailer` & `@types/bcryptjs` - TypeScript types

**Status:** Complete

---

### Phase 2: Database Schema ✅
**File:** `src/server/prisma/schema.prisma`

**Models Added:**
1. **User** - User accounts with auth fields
   - id, email, emailVerified, name, image, password
   - storageMode (LOCAL_ONLY | CLOUD_BACKUP | CLOUD_FIRST)
   - isAdmin flag
   - Relations: accounts, sessions, conversations, settings

2. **Account** - OAuth/provider accounts
   - NextAuth.js standard account model
   - Composite primary key: [provider, providerAccountId]

3. **Session** - User sessions
   - sessionToken (unique), userId, expires
   - For JWT-based sessions

4. **VerificationToken** - Email verification & magic links
   - identifier, token, expires
   - Composite primary key: [identifier, token]

5. **DConversation** - User conversations (cloud backup)
   - userId foreign key
   - messages stored as JSON
   - Sync metadata: cloudBackupAt timestamp
   - Indexes: userId, (userId + updated), (userId + isArchived)

6. **UserSettings** - User preferences
   - llmSettings (JSON) - LLM configurations
   - uiSettings (JSON) - UI preferences
   - autoBackup, backupFrequency - Sync settings

7. **AdminSettings** - SMTP & system configuration
   - smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, smtpSecure
   - emailTemplates (JSON)
   - allowSignups, requireEmailVerification

**Environment Variables Added** (`src/server/env.ts`):
```typescript
NEXTAUTH_SECRET
NEXTAUTH_URL
EMAIL_SERVER_HOST
EMAIL_SERVER_PORT
EMAIL_SERVER_USER
EMAIL_SERVER_PASSWORD
EMAIL_FROM
```

**Database Provider:** PostgreSQL (using existing POSTGRES_PRISMA_URL)

**Status:** Complete - Schema ready for migration

---

### Phase 3: NextAuth Configuration ✅

**Files Created:**

#### 1. `src/server/auth/auth.config.ts`
NextAuth configuration with:
- **PrismaAdapter** for database integration
- **Credentials Provider** for email/password login
- **Resend Provider** for magic link (passwordless) login
- Dynamic SMTP configuration (reads from AdminSettings or environment)
- **Callbacks:**
  - `signIn`: Check if signups are allowed
  - `jwt`: Add custom user properties (isAdmin, storageMode)
  - `session`: Expose custom properties to client
- **Events:**
  - `signIn`: Create default UserSettings for new users

#### 2. `app/api/auth/[...nextauth]/route.ts`
NextAuth API route handler (App Router compatible)

#### 3. `src/server/auth/auth.ts`
Helper functions:
- `auth()` - Get current session
- `getCurrentUserId()` - Get current user ID or null
- `isAdmin()` - Check if user is admin
- `requireAuth()` - Throws if not authenticated
- `requireAdmin()` - Throws if not admin

#### 4. `app/api/auth/signup/route.ts`
Custom signup API endpoint:
- Email/password validation (Zod schema)
- Check if signups allowed (AdminSettings)
- Duplicate email check
- Password hashing (bcrypt, 12 rounds)
- User creation with default settings
- Returns user object (excluding password)

**Authentication Methods:**
- ✅ Email + Password (via Credentials provider)
- ✅ Magic Link (via Email provider with SMTP)

**Status:** Complete - Ready for UI integration

---

## 🔨 REMAINING PHASES (4-13)

### Phase 4: Admin Panel for SMTP Configuration
**Priority:** HIGH
**Files to Create:**

#### 1. `src/apps/admin/AdminPanel.tsx`
Main admin panel component with tabs:
- SMTP Configuration
- Email Templates
- User Management
- System Settings

#### 2. `src/apps/admin/components/SmtpConfigForm.tsx`
Form for SMTP settings:
- Host, Port, User, Password, From email
- Secure connection toggle
- Test email button
- Save to AdminSettings table

#### 3. `src/server/trpc/routers/admin.router.ts`
Admin-only tRPC procedures:
```typescript
admin.getSettings
admin.updateSmtpConfig
admin.testSmtpConnection
admin.listUsers
admin.toggleSignups
```

**Implementation Steps:**
1. Create admin router with `requireAdmin()` middleware
2. Build SMTP config form (Material-UI Joy)
3. Add "Test Email" button that sends verification email
4. Link admin panel to Settings Modal (tab or separate page)
5. Only show to users with `isAdmin: true`

---

### Phase 5: Authentication UI Components
**Priority:** HIGH
**Files to Create:**

#### 1. `src/apps/auth/components/LoginForm.tsx`
Email/password login form with:
- Email input (validation)
- Password input (masked)
- "Remember me" checkbox
- "Forgot password?" link
- Submit button
- Error/success messages
- Switch to magic link option

#### 2. `src/apps/auth/components/SignupForm.tsx`
User registration form:
- Name input
- Email input (validation)
- Password input (strength meter)
- Confirm password input
- Terms & privacy checkbox
- Submit button (calls `/api/auth/signup`)
- Redirect to login after success

#### 3. `src/apps/auth/components/MagicLinkForm.tsx`
Passwordless login:
- Email input only
- Submit triggers magic link email
- Success message: "Check your email"
- Countdown timer for resend

#### 4. `src/apps/auth/components/AuthModal.tsx`
Tabbed modal container:
- Tab 1: Login
- Tab 2: Sign Up
- Tab 3: Magic Link
- Close button
- Branding (ABOV3 Exodus logo)

#### 5. `pages/auth/signin.tsx`
Dedicated sign-in page:
- AuthModal pre-opened to Login tab
- Clean, centered layout
- Redirects to app after auth

#### 6. `pages/auth/signup.tsx`
Dedicated signup page:
- AuthModal pre-opened to Sign Up tab

#### 7. `pages/auth/verify-request.tsx`
Magic link sent page:
- "Check your email" message
- Email address display
- Resend link button
- Help text

**Components to Modify:**

#### `pages/_app.tsx`
Add SessionProvider:
```tsx
import { SessionProvider } from 'next-auth/react';

<SessionProvider session={pageProps.session}>
  {/* existing app content */}
</SessionProvider>
```

#### `src/common/components/UserMenu.tsx` (NEW)
User dropdown menu:
- Avatar with user initial or image
- User name & email
- "Account Settings" → Opens account settings
- "Sign Out" → Calls signOut()
- Sync status indicator (if cloud backup enabled)

**Location:** Top-right corner of OptimaLayout, next to existing controls

---

### Phase 6: tRPC Auth Integration
**Priority:** CRITICAL
**Files to Modify:**

#### 1. `src/server/trpc/trpc.server.ts`
Add auth to context:
```typescript
import { auth } from '../auth/auth';

export const createTRPCFetchContext = async ({ req }) => {
  const session = await auth();

  return {
    hostName: req.headers?.get('host') ?? 'localhost',
    reqSignal: req.signal,
    session,
    userId: session?.user?.id || null,
    isAdmin: session?.user?.isAdmin || false,
  };
};

// Create protected procedure
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

// Create admin procedure
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.isAdmin) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next();
});
```

#### 2. Update all routers that need auth
Add `protectedProcedure` or `adminProcedure` instead of `publicProcedure`

---

### Phase 7: User & Conversations Routers
**Priority:** HIGH
**Files to Create:**

#### 1. `src/server/trpc/routers/user.router.ts`
User management procedures:
```typescript
user.getProfile         // Get current user
user.updateProfile      // Update name, image
user.changePassword     // Change password (requires old password)
user.deleteAccount      // Delete user account (with confirmation)
user.getStorageMode     // Get LOCAL_ONLY | CLOUD_BACKUP
user.setStorageMode     // Switch storage mode
```

#### 2. `src/server/trpc/routers/conversations.router.ts`
Cloud backup procedures:
```typescript
conversations.list              // List user's cloud conversations
conversations.get               // Get single conversation
conversations.create            // Create conversation
conversations.update            // Update conversation (title, messages)
conversations.delete            // Delete conversation
conversations.bulkUpload        // Upload local conversations to cloud
conversations.bulkDownload      // Download all conversations
conversations.sync              // Sync specific conversation
conversations.getLastSyncTime   // Get last backup timestamp
```

#### 3. `src/server/trpc/trpc.router-cloud.ts`
Add new routers:
```typescript
import { userRouter } from './routers/user.router';
import { conversationsRouter } from './routers/conversations.router';
import { adminRouter } from './routers/admin.router';

export const cloudRouter = router({
  backend: backendRouter,
  browse: browseRouter,
  trade: tradeRouter,
  user: userRouter,          // NEW
  conversations: conversationsRouter,  // NEW
  admin: adminRouter,        // NEW
});
```

---

### Phase 8: Sync Service (Local-First + Cloud Backup)
**Priority:** HIGH
**Files to Create:**

#### 1. `src/common/sync/SyncService.ts`
Cloud backup service:
```typescript
class SyncService {
  // Upload single conversation to cloud
  async uploadConversation(conversationId: string): Promise<void>

  // Download conversation from cloud
  async downloadConversation(conversationId: string): Promise<DConversation | null>

  // Sync all conversations (upload new/modified)
  async syncAll(): Promise<SyncResult>

  // Get list of cloud conversations
  async getCloudConversations(): Promise<DConversation[]>

  // Detect conflicts (local vs cloud modified)
  async detectConflicts(): Promise<Conflict[]>

  // Resolve conflict (choose local or cloud version)
  async resolveConflict(conversationId: string, resolution: 'local' | 'cloud'): Promise<void>
}
```

#### 2. `src/common/sync/SyncStatus.tsx`
Sync status indicator component:
- Last backup time
- Sync in progress spinner
- Error icon if sync failed
- Manual "Backup Now" button

#### 3. Modify `src/common/stores/chat/store-chats.ts`
Add cloud sync hooks:
```typescript
// Add field to DConversation
cloudBackupAt?: number;
needsSync?: boolean;

// Hook into message append
appendMessage: (conversationId, message) => {
  // ... existing logic

  // Mark as needs sync
  markNeedsSync(conversationId);

  // Optionally auto-backup if enabled
  if (getUserSettings().autoBackup) {
    debouncedBackup(conversationId);
  }
}
```

---

### Phase 9: Multi-Window Support
**Priority:** MEDIUM
**Files to Create:**

#### 1. `src/common/sync/CrossTabSync.ts`
BroadcastChannel for same-device sync:
```typescript
class CrossTabSync {
  private channel: BroadcastChannel;

  constructor() {
    this.channel = new BroadcastChannel('abov3-exodus-sync');
    this.channel.onmessage = this.handleMessage;
  }

  // Broadcast conversation change
  broadcastConversationUpdate(conversationId: string): void

  // Broadcast settings change
  broadcastSettingsUpdate(): void

  // Handle incoming messages from other tabs
  handleMessage(event: MessageEvent): void
}
```

#### 2. Modify `pages/_app.tsx`
Remove or disable single-tab enforcer:
```typescript
<ProviderSingleTab disabled={true}>
  {/* app content */}
</ProviderSingleTab>
```

Or remove component entirely.

#### 3. Update stores
Add storage event listeners:
```typescript
// In each localStorage-backed store
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'store-llms') {
      useLLMStore.getState().rehydrate();
    }
  });
}
```

---

### Phase 10: Onboarding & Migration
**Priority:** MEDIUM
**Files to Create:**

#### 1. `src/apps/onboarding/OnboardingWizard.tsx`
Multi-step wizard:
- **Step 1:** Welcome to ABOV3 Exodus
- **Step 2:** Choose storage mode (Local Only / Cloud Backup)
- **Step 3:** Create account (if Cloud Backup chosen)
- **Step 4:** Upload existing conversations? (if has local data)
- **Step 5:** Done! Start chatting

#### 2. `src/apps/settings/StorageModeSettings.tsx`
Storage mode switcher:
- Radio buttons: Local Only | Cloud Backup
- Explanation of each mode
- Warning when switching modes
- "Migrate conversations" button

#### 3. `src/common/sync/MigrationHelper.ts`
Migration utilities:
```typescript
async function migrateLocalToCloud(): Promise<void> {
  const conversations = useChatStore.getState().conversations;
  const total = conversations.length;
  let uploaded = 0;

  for (const conv of conversations) {
    await trpc.conversations.create.mutate({
      id: conv.id,
      userTitle: conv.userTitle,
      messages: conv.messages,
      // ... other fields
    });
    uploaded++;
    // Update progress bar
  }
}
```

---

### Phase 11: Security & Rate Limiting
**Priority:** HIGH
**Files to Create:**

#### 1. `src/server/middleware/rateLimit.ts`
Rate limiting middleware:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function rateLimit(identifier: string) {
  const { success } = await ratelimit.limit(identifier);
  if (!success) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });
  }
}
```

#### 2. Add to tRPC procedures
```typescript
conversations.create: protectedProcedure
  .input(z.object({ ... }))
  .mutation(async ({ ctx, input }) => {
    await rateLimit(ctx.userId); // Rate limit per user
    // ... create logic
  })
```

#### 3. Add CSRF protection
Already handled by NextAuth.

---

### Phase 12: Database Migration & Testing
**Priority:** CRITICAL
**Commands to Run:**

```bash
# Generate Prisma client
npx prisma generate

# Create migration (if using migrations)
npx prisma migrate dev --name add-auth-and-conversations

# OR push schema directly (for rapid development)
npx prisma db push

# Seed database with initial admin user (optional)
npx prisma db seed
```

**Create:** `prisma/seed.ts`
```typescript
import { prismaDb } from '../src/server/prisma/prismaDb';
import bcrypt from 'bcryptjs';

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);

  await prismaDb.user.upsert({
    where: { email: 'admin@abov3-exodus.com' },
    update: {},
    create: {
      email: 'admin@abov3-exodus.com',
      password: hashedPassword,
      name: 'Admin User',
      isAdmin: true,
      storageMode: 'CLOUD_BACKUP',
    },
  });

  // Create default admin settings
  await prismaDb.adminSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      allowSignups: true,
      requireEmailVerification: false,
    },
  });
}

main();
```

**Testing Checklist:**
- [ ] Sign up new user (email/password)
- [ ] Sign in existing user
- [ ] Magic link flow (if SMTP configured)
- [ ] Admin panel access (only for isAdmin: true)
- [ ] SMTP configuration saves
- [ ] Conversation upload to cloud
- [ ] Conversation download from cloud
- [ ] Multi-window sync (open 2-3 tabs)
- [ ] Settings sync across tabs
- [ ] Sign out (all tabs)
- [ ] Rate limiting works

---

### Phase 13: Documentation & Final Commit
**Priority:** MEDIUM
**Files to Create:**

#### 1. `docs/user-guide/authentication.md`
User-facing documentation:
- How to sign up
- How to sign in
- Password reset (if implemented)
- Magic link usage

#### 2. `docs/user-guide/cloud-backup.md`
Cloud backup guide:
- Enabling cloud backup
- Manual backup
- Restore from backup
- Conflict resolution

#### 3. `docs/developer/deployment.md`
Deployment guide:
- Environment variables required
- Database setup (PostgreSQL)
- SMTP configuration
- First-time admin account creation

#### 4. `docs/developer/architecture.md`
Architecture documentation:
- Auth flow diagram
- Sync strategy (local-first + cloud backup)
- Multi-window coordination
- Security considerations

#### 5. `.env.example`
Example environment variables:
```env
# Database
POSTGRES_PRISMA_URL="postgresql://..."
POSTGRES_URL_NON_POOLING="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3006"

# Email (optional - can configure in admin panel)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@abov3-exodus.com"
```

**Final Git Commit:**
```bash
git add -A
git commit -m "Implement authentication & cloud deployment

- Add NextAuth.js with email/password and magic link
- Create Prisma schema for users, sessions, conversations
- Build admin panel for SMTP configuration
- Implement cloud backup with local-first architecture
- Add multi-window support via BroadcastChannel
- Create onboarding wizard for new users
- Add security with rate limiting
- Comprehensive documentation"
```

---

## ENVIRONMENT SETUP REQUIRED

### 1. PostgreSQL Database
**Option A: Vercel Postgres (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Create database
vercel postgres create abov3-exodus-db

# Pull environment variables
vercel env pull .env.local
```

**Option B: Local PostgreSQL**
```bash
# Install PostgreSQL
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql

# Create database
createdb abov3_exodus

# Set environment variables
POSTGRES_PRISMA_URL="postgresql://user:password@localhost:5432/abov3_exodus"
POSTGRES_URL_NON_POOLING="postgresql://user:password@localhost:5432/abov3_exodus"
```

### 2. SMTP Service (Choose One)

**Option A: Gmail (Free)**
1. Enable 2FA on Google account
2. Create app-specific password
3. Use in EMAIL_SERVER_PASSWORD

**Option B: Resend (Recommended for production)**
```bash
# Sign up at resend.com
# Get API key
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"
```

**Option C: SendGrid**
```bash
SENDGRID_API_KEY="SG..."
EMAIL_FROM="noreply@yourdomain.com"
```

### 3. NextAuth Secret
```bash
# Generate secure secret
openssl rand -base64 32

# Add to .env.local
NEXTAUTH_SECRET="generated-secret-here"
NEXTAUTH_URL="http://localhost:3006"
```

---

## QUICK START GUIDE

### 1. Setup Environment
```bash
cd /c/Users/fajar/Documents/abov3-genesis-codeforger/inference_server/abov3-exodus

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values
nano .env.local
```

### 2. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Seed with admin user
npx prisma db seed
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Access Application
- **App:** http://localhost:3006
- **Sign In:** http://localhost:3006/auth/signin
- **Sign Up:** http://localhost:3006/auth/signup

### 5. Create Admin User
**Option A: Via Prisma Studio**
```bash
npx prisma studio
```
Navigate to User table, create user, set `isAdmin: true`

**Option B: Via signup API + database update**
1. Sign up normally at /auth/signup
2. Use Prisma Studio to set `isAdmin: true`

---

## IMPLEMENTATION PRIORITY ORDER

1. **Phase 12: Database Migration** ⚡ CRITICAL
   - Without this, nothing else works
   - `npx prisma generate && npx prisma db push`

2. **Phase 5: Auth UI** ⚡ HIGH
   - Users need to sign up/sign in
   - LoginForm, SignupForm, AuthModal

3. **Phase 6: tRPC Auth** ⚡ CRITICAL
   - Protect API endpoints
   - Add auth to context

4. **Phase 7: Conversations Router** ⚡ HIGH
   - Enable cloud backup
   - User data isolation

5. **Phase 4: Admin Panel** 🔸 MEDIUM
   - Configure SMTP without code changes
   - User management

6. **Phase 8: Sync Service** 🔸 MEDIUM
   - Local-first architecture
   - Cloud backup functionality

7. **Phase 9: Multi-Window** 🔹 NICE TO HAVE
   - Cross-tab synchronization
   - Better UX

8. **Phase 10: Onboarding** 🔹 NICE TO HAVE
   - User-friendly first run
   - Migration wizard

9. **Phase 11: Security** ⚡ HIGH (for production)
   - Rate limiting
   - CSRF protection (already in NextAuth)

10. **Phase 13: Documentation** 🔹 NICE TO HAVE
    - User guides
    - Deployment docs

---

## KNOWN ISSUES & WORKAROUNDS

### Issue: Prisma Generate Fails with "EPERM"
**Cause:** node.exe processes holding .dll file locks

**Workaround:**
```bash
# Option 1: Kill all node processes
taskkill /F /IM node.exe

# Option 2: Restart terminal/IDE

# Option 3: Manually delete .prisma folder
rm -rf node_modules/.prisma
npx prisma generate
```

### Issue: NextAuth Session Not Persisting
**Cause:** Missing NEXTAUTH_SECRET or NEXTAUTH_URL

**Solution:**
```env
NEXTAUTH_SECRET="your-32-char-secret-here"
NEXTAUTH_URL="http://localhost:3006"
```

### Issue: Email Not Sending
**Cause:** SMTP credentials incorrect or not configured

**Solution:**
1. Check admin panel SMTP settings
2. Test with "Send Test Email" button
3. Check server logs for SMTP errors
4. Verify firewall allows outbound SMTP (port 587/465)

---

## TESTING CREDENTIALS

**Admin User (after seeding):**
- Email: `admin@abov3-exodus.com`
- Password: `admin123`
- Role: Admin

**Test User (create via signup):**
- Email: `test@example.com`
- Password: `password123`
- Role: Regular user

---

## PROGRESS TRACKING

| Phase | Status | Completion |
|-------|--------|-----------|
| 1. Dependencies | ✅ Complete | 100% |
| 2. Database Schema | ✅ Complete | 100% |
| 3. NextAuth Config | ✅ Complete | 100% |
| 4. Admin Panel | ⏸️ Not Started | 0% |
| 5. Auth UI | ⏸️ Not Started | 0% |
| 6. tRPC Auth | ⏸️ Not Started | 0% |
| 7. Conversations Router | ⏸️ Not Started | 0% |
| 8. Sync Service | ⏸️ Not Started | 0% |
| 9. Multi-Window | ⏸️ Not Started | 0% |
| 10. Onboarding | ⏸️ Not Started | 0% |
| 11. Security | ⏸️ Not Started | 0% |
| 12. Database Setup | ⏸️ Not Started | 0% |
| 13. Documentation | ⏸️ Not Started | 0% |

**Overall Progress:** 23% (3/13 phases)

---

## NEXT STEPS FOR DEVELOPER

1. **Run database migration:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

2. **Create .env.local with required variables**

3. **Start implementing Phase 5 (Auth UI)**
   - Create login/signup forms
   - Add to pages/auth/signin.tsx

4. **Implement Phase 6 (tRPC Auth)**
   - Add session to tRPC context
   - Create protectedProcedure

5. **Test authentication flow**
   - Sign up → Sign in → Access protected routes

6. **Continue with remaining phases** as prioritized above

---

## SUPPORT & RESOURCES

- **NextAuth.js Docs:** https://next-auth.js.org
- **Prisma Docs:** https://www.prisma.io/docs
- **tRPC Docs:** https://trpc.io/docs
- **Material-UI Joy:** https://mui.com/joy-ui/getting-started/

---

**Document Created:** 2025-11-09
**Last Updated:** 2025-11-09
**Implementation By:** Claude Code
**Status:** Phases 1-3 Complete, Phases 4-13 Ready for Implementation
