# Project Permission Persistence Fix

## Problem

The app was asking for permission to access project folders **every time** the page refreshed, even though the user had already granted permission before.

### Why This Happened

**FileSystem API handles are special**:
- They **cannot** be stored in `localStorage` (not serializable)
- They **cannot** be stored in Zustand persist (not serializable)
- They were only stored in **memory** (lost on page refresh)

## Solution

Implemented **IndexedDB storage** for FileSystem handles, which supports storing non-serializable objects.

---

## How It Works Now

### First Time Adding a Project

1. User clicks "Add Project"
2. Selects folder via `showDirectoryPicker()`
3. Browser asks for permission → User grants
4. **Handle saved to IndexedDB** ✅
5. Project added to list

### On Page Refresh

1. App starts up
2. **Loads all handles from IndexedDB** automatically
3. Checks if permission still granted
4. If yes → Project accessible immediately ✅
5. If no → User sees "Permission needed" warning

### Permission Verification

The browser **automatically checks** if permission is still valid:
```typescript
const permission = await handle.queryPermission({ mode: 'readwrite' });
if (permission === 'granted') {
  // Use the handle
} else {
  // Show "Permission needed"
}
```

---

## Technical Implementation

### IndexedDB Database

**Database**: `agi-project-handles`
**Version**: 1
**Store**: `handles`

**Operations**:
- `saveHandleToIDB()` - Save handle when project added
- `loadHandleFromIDB()` - Load handle with permission check
- `removeHandleFromIDB()` - Delete handle when project removed

### Auto-Loading on Startup

**Location**: `src/common/providers/ProviderBootstrapLogic.tsx`

```typescript
React.useEffect(() => {
  const loadProjectHandles = async () => {
    await useProjectsStore.getState().loadPersistedHandles();
  };
  void loadProjectHandles();
}, []);
```

**When**: Runs once on app mount
**What**: Loads all saved handles from IndexedDB

### Store Integration

**Location**: `src/apps/projects/store-projects.ts`

**New method**: `loadPersistedHandles()`
- Iterates through all projects
- Loads handle from IndexedDB
- Verifies permission still granted
- Adds to in-memory map

---

## Files Modified

### 1. `src/apps/projects/store-projects.ts`

**Added**:
- IndexedDB helper functions (95 lines)
  - `openHandlesDB()` - Opens/creates database
  - `saveHandleToIDB()` - Saves handle
  - `loadHandleFromIDB()` - Loads handle with permission check
  - `removeHandleFromIDB()` - Deletes handle
- `loadPersistedHandles()` action - Loads all handles on startup

**Modified**:
- `addProject()` - Now saves to IndexedDB
- `removeProject()` - Now removes from IndexedDB
- `setProjectHandle()` - Now saves to IndexedDB when permission granted

### 2. `src/common/providers/ProviderBootstrapLogic.tsx`

**Added**:
- Import `useProjectsStore`
- Effect to call `loadPersistedHandles()` on mount

---

## User Experience

### Before Fix
```
1. Add project → Grant permission ✅
2. Use project ✅
3. Refresh page 🔄
4. Permission lost ❌
5. Click project → "Permission needed" ⚠️
6. Select folder again → Re-grant permission 😞
```

### After Fix
```
1. Add project → Grant permission ✅
2. Use project ✅
3. Refresh page 🔄
4. Permission restored ✅
5. Use project immediately ✅
6. No re-granting needed! 🎉
```

---

## Permission States

### State 1: Fresh Grant
- User adds new project
- Browser prompts for permission
- User grants → Saved to IndexedDB

### State 2: Persisted & Valid
- App loads from IndexedDB
- Permission check: `granted`
- Project accessible immediately
- **No prompt needed** ✅

### State 3: Persisted but Revoked
- App loads from IndexedDB
- Permission check: `denied` or `prompt`
- Shows "Permission needed" warning
- User clicks → Re-grant prompt

### State 4: Not Persisted
- Old project (added before this fix)
- No handle in IndexedDB
- Shows "Permission needed" warning
- User clicks → Grant prompt

---

## Browser Compatibility

### IndexedDB Support
✅ **Chrome**: Full support
✅ **Edge**: Full support
✅ **Opera**: Full support
✅ **Firefox**: Full support (but FileSystem API limited)
✅ **Safari**: Limited support

**Note**: FileSystem API itself is Chrome/Edge/Opera only, so this fix applies to those browsers.

---

## Security & Privacy

### What's Stored in IndexedDB

**Stored**:
- `FileSystemDirectoryHandle` objects
- Project IDs (keys)

**NOT Stored**:
- File contents
- File paths (only folder name)
- User data

### Permission Checks

**Every time a handle is loaded**:
1. Check if permission still granted
2. If revoked → Don't use handle
3. User must re-grant

### User Control

Users can:
- Revoke permission anytime (browser settings)
- Clear IndexedDB (DevTools → Application → IndexedDB)
- Remove project (deletes handle)

---

## Testing

### Test Scenario 1: Fresh Project
1. Clear IndexedDB
2. Add new project
3. Grant permission
4. Refresh page
5. ✅ Project should work immediately (no prompt)

### Test Scenario 2: Multiple Projects
1. Add 3 projects
2. Grant permission for all
3. Refresh page
4. ✅ All 3 projects should work immediately

### Test Scenario 3: Revoked Permission
1. Add project
2. Grant permission
3. Revoke in browser settings
4. Refresh page
5. ✅ Should show "Permission needed" warning

### Test Scenario 4: Removed Project
1. Add project
2. Check IndexedDB (should have handle)
3. Remove project
4. Check IndexedDB (handle should be deleted)

---

## Debugging

### Check IndexedDB Contents

**DevTools → Application → IndexedDB → agi-project-handles**

You should see:
- Database: `agi-project-handles`
- Object Store: `handles`
- Keys: Project IDs (`proj_1234...`)
- Values: `FileSystemDirectoryHandle` objects

### Clear IndexedDB

```javascript
// Delete specific handle
const db = await indexedDB.open('agi-project-handles', 1);
// ... delete operations

// Delete entire database
indexedDB.deleteDatabase('agi-project-handles');
```

### Check Permissions

```javascript
// Get handle from memory
const handle = useProjectsStore.getState().getProjectHandle('proj_...');

// Check permission
const permission = await handle.queryPermission({ mode: 'readwrite' });
console.log(permission); // 'granted', 'denied', or 'prompt'

// Request permission
if (permission !== 'granted') {
  await handle.requestPermission({ mode: 'readwrite' });
}
```

---

## Summary

✅ **Problem solved**: No more repeated permission prompts
✅ **Persistence**: Handles saved to IndexedDB
✅ **Auto-restore**: Loads on app startup
✅ **Permission check**: Verifies permission still valid
✅ **Secure**: Follows browser security model

**Result**: Grant permission **once**, use **forever** (until revoked)! 🎉
