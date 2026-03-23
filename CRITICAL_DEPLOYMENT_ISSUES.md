# Critical Deployment Issues - ABOV3 Exodus

## ❗ MUST-HAVE for Future Deployments

This document lists critical issues found during production deployment that **MUST** be addressed in future network deployments.

---

## 1. ❌ Permissions Debug Logging Not Working (CRITICAL)

### Issue
- Added extensive debug logging to `src/server/auth/permissions.ts`
- Logs never appear in production even though code is deployed
- Permission checks return false even for Master Developer accounts
- Users with `isMasterDev=true`, `role=MASTER`, `isAdmin=true` get "Access Denied"

### Root Cause Investigation Needed
1. **Check if API route is being called**:
   - Middleware calls `/api/auth/check-feature`
   - API route exists and calls `hasFeatureAccess()`
   - But no debug logs appear in `kubectl logs`

2. **Possible Issues**:
   - Console.log may not work in Edge runtime (check runtime)
   - Logs might be going to a different output stream
   - Function might not be executing at all
   - Build process might be stripping console.log statements

### Master Account Details
```
email: devops@abov3.com
id: 23b768b9-0a68-41de-ae16-98c4bcecded2
isMasterDev: true
role: MASTER
isAdmin: true
```

### Database State
- User record: ✅ Correct attributes
- UserPermission table: ⚠️ Empty (0 rows) - but this should be OK because Master role should bypass

### Temporary Workaround
Since debug logging isn't working, need to add alternative debugging:
```typescript
// Instead of console.log, use:
throw new Error(`[DEBUG] User: ${user.email}, isMasterDev: ${user.isMasterDev}`);
// Or write to file/database
```

### Files Involved
- `middleware.ts` (line 83-94) - Calls check-feature API
- `app/api/auth/check-feature/route.ts` - Calls hasFeatureAccess()
- `src/server/auth/permissions.ts` - Permission logic with debug logs

---

## 2. ❌ Theme Settings Shared Between Users (CRITICAL)

### Issue
When user A selects light/dark theme, user B sees the same theme. Settings should be isolated per user.

### Expected Behavior
- Each user has independent theme preference
- Theme stored per user in database or browser (not shared)

### Investigation Needed
1. Find where theme is stored (database? localStorage? cookie?)
2. Check if theme is user-specific or global
3. Fix storage to be per-user

### Files to Check
```bash
grep -r "theme" src/common/stores/
grep -r "dark.*mode\|light.*mode" src/
```

---

## 3. ❌ Pauline URL Validation Too Lenient (CRITICAL) ✅ **FIXED**

### Issue
Status shows "✓ ABOV3 Pauline is ready" when user only types "https://" in the endpoint field, which is clearly invalid.

### Root Cause
The validation function `isValidPaulineEndpoint()` in `src/modules/pauline/pauline.client.ts` only checked if the string starts with "http://" or "https://", accepting incomplete URLs.

**Before (BROKEN)**:
```typescript
export const isValidPaulineEndpoint = (endpoint?: string) => {
  if (!endpoint) return false;
  const trimmed = endpoint.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
};
```

### Fix Applied ✅
Enhanced validation to:
1. Check protocol exists
2. Reject protocol-only strings ("http://", "https://")
3. Parse as URL object to validate format
4. Verify hostname exists and is not empty

**After (FIXED)**:
```typescript
export const isValidPaulineEndpoint = (endpoint?: string) => {
  if (!endpoint) return false;
  const trimmed = endpoint.trim();

  // Must start with http:// or https://
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }

  // Must have more than just the protocol (e.g., "https://" alone is invalid)
  if (trimmed === 'http://' || trimmed === 'https://') {
    return false;
  }

  // Try to parse as URL to validate format
  try {
    const url = new URL(trimmed);
    // Must have a hostname (e.g., not just "https://")
    return url.hostname.length > 0;
  } catch {
    return false;
  }
};
```

**Result**: Now correctly rejects incomplete URLs and only shows "ready" status for valid endpoints like "https://pauline.abov3.ai"

**Files Modified**: `src/modules/pauline/pauline.client.ts`

---

## 4. ⚠️ Pauline JavaScript Frontend Error

### Issue
Backend works perfectly:
- Logs show: "Found 2 predefined voices in /app/voices"
- API responds to requests
- No backend errors

Frontend shows error:
- "isUserInteraction is not defined"
- Settings may not save properly

### User Report
> "My local docker is working it should be simple"

This indicates:
1. Local development image works fine
2. Production image might be:
   - Using cached/old version (`:latest` tag issue)
   - Missing environment variable
   - Have different build config

### Investigation Needed
1. **Check if image is actually latest**:
   ```bash
   kubectl describe pod <pauline-pod> | grep "Image ID"
   docker pull ghcr.io/abov3ai/abov3-pauline:latest
   docker inspect ghcr.io/abov3ai/abov3-pauline:latest | grep Created
   ```

2. **Force image rebuild**:
   ```bash
   docker build -t ghcr.io/abov3ai/abov3-pauline:$(date +%Y%m%d-%H%M%S) .
   docker push ghcr.io/abov3ai/abov3-pauline:20260323-150000
   kubectl set image deployment/abov3-pauline pauline=ghcr.io/abov3ai/abov3-pauline:20260323-150000
   ```

3. **Check frontend console for exact error**:
   - Open https://pauline.abov3.ai in browser
   - Open DevTools Console (F12)
   - Look for JavaScript error with "isUserInteraction"

### Files Involved
- Pauline frontend JavaScript bundle
- Deployment: `k8s/pauline-deployment.yaml`

---

## 4. ⚠️ Permissions API Not Logging (Debugging Issue)

### Symptoms
- No `[permissions]` logs appear in pod logs
- Even with explicit console.log statements
- Function appears to run (returns result) but logs don't show

### Possible Causes

#### A. Edge Runtime Restrictions
Next.js Edge Runtime might not support console.log or redirect output:
```typescript
// Check in app/api/auth/check-feature/route.ts
export const runtime = 'edge'; // If this exists, console.log might not work
```

**Fix**: Remove edge runtime or use Node runtime:
```typescript
export const runtime = 'nodejs'; // Force Node.js runtime
```

#### B. Build Optimization Stripping Logs
Production builds might remove console.log:
```javascript
// next.config.ts might have:
compiler: {
  removeConsole: true, // This removes all console statements!
}
```

**Fix**: Check `next.config.ts` and disable for debugging:
```typescript
compiler: {
  removeConsole: false, // Keep console.log in production
}
```

#### C. Logs Going to Wrong Stream
```typescript
// Try these instead of console.log:
console.error('[permissions] ...'); // stderr instead of stdout
process.stdout.write('[permissions] ...\n'); // Direct write
```

#### D. Kubernetes Logging Issues
```bash
# Check all logging streams
kubectl logs deployment/abov3-exodus -n abov3-prod --all-containers=true

# Check previous container
kubectl logs deployment/abov3-exodus -n abov3-prod --previous
```

---

## 5. 📝 Deployment Checklist for Future Networks

### Pre-Deployment
- [ ] Build all images with version tags (not `:latest`)
- [ ] Test permissions system locally first
- [ ] Verify theme settings are user-isolated
- [ ] Test all frontend JavaScript bundles

### Database Setup
- [ ] Create master account:
  ```sql
  INSERT INTO "User" (id, email, "isMasterDev", role, "isAdmin")
  VALUES ('...', 'admin@domain.com', true, 'MASTER', true);
  ```

- [ ] Verify UserPermission table exists (not required for Master, but should exist)

### Debugging Tools
- [ ] Add health check endpoints that show:
  - Current user session
  - User permissions
  - Feature access results

- [ ] Create admin debug page:
  ```typescript
  // /api/admin/debug-permissions?userId=xxx
  // Returns: user record, permissions, feature checks
  ```

### Post-Deployment Tests
- [ ] Test master account can access all features
- [ ] Test regular user sees only granted features
- [ ] Test theme changes per user (multiple browser profiles)
- [ ] Test Pauline frontend loads without JavaScript errors
- [ ] Check all pod logs for startup errors

---

## 6. 🔧 Quick Fixes for Production

### Fix 1: Bypass Permissions Check Temporarily (Emergency)
If permissions are blocking production use, temporarily bypass:

```typescript
// middleware.ts - line 96-98
// EMERGENCY BYPASS - REMOVE AFTER FIXING
if (!checkRes.ok) {
  // Allow all authenticated users temporarily
  console.warn('[middleware] EMERGENCY BYPASS: Allowing access');
  // return NextResponse.redirect(new URL('/unauthorized', request.url));
  return NextResponse.next(); // Allow through
}
```

⚠️ **WARNING**: This disables all feature protection!

### Fix 2: Add Debug Endpoint
Create `/api/admin/test-permissions` to manually test:

```typescript
// app/api/admin/test-permissions/route.ts
export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return NextResponse.json({ error: 'Not logged in' });

  const user = await prismaDb.user.findUnique({
    where: { id: userId },
    include: { permissions: true },
  });

  const nepheshAccess = await hasFeatureAccess(userId, 'NEPHESH');
  const trainAccess = await hasFeatureAccess(userId, 'TRAIN');
  const flowcoreAccess = await hasFeatureAccess(userId, 'FLOWCORE');

  return NextResponse.json({
    user: {
      email: user?.email,
      isMasterDev: user?.isMasterDev,
      role: user?.role,
      isAdmin: user?.isAdmin,
    },
    permissions: user?.permissions,
    featureAccess: {
      NEPHESH: nepheshAccess,
      TRAIN: trainAccess,
      FLOWCORE: flowcoreAccess,
    },
  });
}
```

Then visit: `https://exodus.abov3.ai/api/admin/test-permissions`

### Fix 3: Force Pauline Image Rebuild
```bash
cd <pauline-directory>
docker build --no-cache -t ghcr.io/abov3ai/abov3-pauline:20260323 .
docker push ghcr.io/abov3ai/abov3-pauline:20260323
kubectl set image deployment/abov3-pauline -n abov3-prod pauline=ghcr.io/abov3ai/abov3-pauline:20260323
```

---

## 7. 🚨 Critical Files for Future Reference

### Permissions System
```
middleware.ts                                # Route protection
app/api/auth/check-feature/route.ts        # Permission API
src/server/auth/permissions.ts              # Permission logic
src/server/prisma/schema.prisma             # Database schema
```

### Theme System
```
src/common/stores/store-ux-labs.ts         # UI preferences?
src/common/layout/optima/AppLayout.tsx     # Theme provider?
```

### Database Access
```bash
# Connect to database
kubectl exec -n abov3-prod postgres-primary-0 -- psql -U abov3 -d abov3

# Check user
SELECT id, email, "isMasterDev", role, "isAdmin" FROM "User" WHERE email = 'devops@abov3.com';

# Check permissions
SELECT * FROM "UserPermission" WHERE "userId" = '23b768b9-0a68-41de-ae16-98c4bcecded2';

# Grant permission manually (if needed)
INSERT INTO "UserPermission" ("id", "userId", feature, granted, "grantedBy")
VALUES (gen_random_uuid(), '23b768b9-0a68-41de-ae16-98c4bcecded2', 'NEPHESH', true, '23b768b9-0a68-41de-ae16-98c4bcecded2');
```

---

## 8. 📊 Current Status

| Issue | Status | Blocker | Fix Complexity |
|-------|--------|---------|----------------|
| Permissions not working | ❌ Unresolved | YES - blocks all features | HIGH - needs investigation |
| Debug logs not appearing | ❌ Unresolved | YES - blocks debugging | MEDIUM - runtime/build issue |
| Theme shared between users | ❌ Unresolved | NO - UX issue | MEDIUM - storage fix |
| Pauline frontend error | ⚠️ Backend OK | NO - cosmetic | LOW - image rebuild |

---

## 9. 💡 Recommended Immediate Actions

1. **Create Debug API Endpoint** (Fix 2 above) - 15 minutes
   - Allows manual testing of permission system
   - Shows exact user state and access results
   - Can verify if hasFeatureAccess() works at all

2. **Test with curl** - 5 minutes
   ```bash
   # Get session cookie from browser (DevTools -> Application -> Cookies)
   curl -X POST https://exodus.abov3.ai/api/auth/check-feature \
     -H "Cookie: next-auth.session-token=..." \
     -H "Content-Type: application/json" \
     -d '{"feature":"NEPHESH"}' \
     -v
   ```

3. **Check Edge vs Node Runtime** - 5 minutes
   ```bash
   grep -r "export const runtime" app/api/
   ```

4. **Emergency Bypass** (if needed for demo) - 2 minutes
   - Uncomment middleware bypass (Fix 1 above)
   - Redeploy
   - All users can access all features

5. **Rebuild Pauline** - 10 minutes
   - Build with version tag
   - Push and deploy
   - Test frontend

---

**Created**: 2026-03-23
**Priority**: CRITICAL - Blocks production use
**Next Steps**: Implement debug endpoint, test API directly, investigate runtime issues
