# Persistence & Expanded Width Update

## Overview

Enhanced the resizable panels with localStorage persistence and increased maximum sidebar width.

---

## What's New

### 1. **Increased Sidebar Width Range**
- **Before**: 250px - 600px
- **After**: 250px - **1200px** (doubled!)
- You can now drag the sidebar **much wider** for better visualization

### 2. **Persistent Preferences**
Both panel sizes now **save automatically** and restore on page refresh:

#### **Sidebar Width**
- Saves to: `localStorage['agi-drawer-width']`
- Restores on: Page load
- Default: 300px

#### **Projects Panel Height**
- Saves to: `localStorage['agi-projects-panel-height']`
- Restores on: Page load
- Default: 30vh (30% of viewport height)

---

## How It Works

### Automatic Saving

**When you resize**:
1. Drag the resize handle
2. Release mouse button
3. → **Automatically saved** to localStorage

**On next visit**:
1. Page loads
2. → **Automatically restored** to your last size
3. If no saved preference → Uses default

### Reset to Defaults

To reset either panel to default size, use browser DevTools console:

```javascript
// Reset sidebar width to default (300px)
localStorage.removeItem('agi-drawer-width');
location.reload();

// Reset Projects panel height to default (30vh)
localStorage.removeItem('agi-projects-panel-height');
location.reload();

// Reset both
localStorage.removeItem('agi-drawer-width');
localStorage.removeItem('agi-projects-panel-height');
location.reload();
```

Or clear all localStorage:
```javascript
localStorage.clear();
location.reload();
```

---

## Technical Details

### localStorage Keys

| Key | Value Type | Range | Default |
|-----|-----------|-------|---------|
| `agi-drawer-width` | Integer (px) | 250-1200 | 300 |
| `agi-projects-panel-height` | Integer (vh) | 15-70 | 30 |

### Validation

Both values are validated on load:
- Must be valid integer
- Must be within allowed range
- If invalid → Falls back to default

### Implementation

**Sidebar Width** (`DesktopDrawer.tsx`):
```typescript
const [drawerWidth, setDrawerWidth] = React.useState(() => {
  // Load from localStorage
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('agi-drawer-width');
    if (saved) {
      const width = parseInt(saved, 10);
      if (!isNaN(width) && width >= 250 && width <= 1200) {
        return width;
      }
    }
  }
  return 300; // default
});

// Save on resize complete
const handleMouseUp = () => {
  setIsResizingDrawer(false);
  localStorage.setItem('agi-drawer-width', drawerWidth.toString());
};
```

**Projects Panel Height** (`ChatDrawer.tsx`):
```typescript
const [projectsPanelHeight, setProjectsPanelHeight] = React.useState(() => {
  // Load from localStorage
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('agi-projects-panel-height');
    if (saved) {
      const height = parseInt(saved, 10);
      if (!isNaN(height) && height >= 15 && height <= 70) {
        return height;
      }
    }
  }
  return 30; // default (vh)
});

// Save on resize complete
const handleMouseUp = () => {
  setIsResizingProjects(false);
  localStorage.setItem('agi-projects-panel-height', projectsPanelHeight.toString());
};
```

---

## Files Modified

### 1. `src/common/layout/optima/drawer/DesktopDrawer.tsx`
**Changes**:
- Increased max width: 600px → **1200px**
- Added localStorage initialization in `useState`
- Added localStorage save in `handleMouseUp`
- Simplified initialization (removed redundant effect)

**Lines changed**:
- Line 80-92: Load from localStorage on mount
- Line 112-126: Increased constraint to 1200px + save on release
- Line 138-141: Apply saved width to CSS variable

### 2. `src/apps/chat/components/layout-drawer/ChatDrawer.tsx`
**Changes**:
- Added localStorage initialization in `useState`
- Added localStorage save in `handleMouseUp`

**Lines changed**:
- Line 88-100: Load from localStorage on mount
- Line 134-140: Save to localStorage on release

---

## User Experience

### Before
- Sidebar max width: 600px (limited)
- No persistence (reset on refresh)
- Manual resize every session

### After
- Sidebar max width: **1200px** (2x wider!)
- **Auto-saves** your preferences
- **Auto-restores** on page load
- Set once, use forever (until you change it)

---

## Examples

### Scenario 1: Power User
1. **First visit**: Drag sidebar to 800px wide
2. **Resize Projects panel**: Drag to 50vh tall
3. **Refresh page**: → Both sizes **restored**
4. **Next day**: → Still **800px wide, 50vh tall**

### Scenario 2: Narrow Screen
1. **Set sidebar**: 250px (minimum)
2. **Set Projects**: 15vh (minimum)
3. **Refresh**: → Sizes **preserved**

### Scenario 3: Wide Monitor
1. **Set sidebar**: 1200px (maximum)
2. **Set Projects**: 70vh (maximum)
3. **Refresh**: → Sizes **preserved**

### Scenario 4: Reset to Default
1. Open DevTools console (F12)
2. Run: `localStorage.clear(); location.reload();`
3. → Back to **300px sidebar, 30vh Projects**

---

## Benefits

✅ **Wider visualization**: Up to 1200px sidebar (was 600px)
✅ **Persistent preferences**: Auto-save and restore
✅ **No manual setup**: Adjust once, works forever
✅ **Cross-session**: Survives page refresh
✅ **Validated**: Safe fallback if corrupted
✅ **Easy reset**: Clear localStorage anytime

---

## Constraints Summary

| Panel | Min | Max | Default | Saved To |
|-------|-----|-----|---------|----------|
| **Sidebar Width** | 250px | 1200px | 300px | `agi-drawer-width` |
| **Projects Height** | 15vh | 70vh | 30vh | `agi-projects-panel-height` |

---

## Future Enhancements (Optional)

- [ ] Add UI button to reset to defaults
- [ ] Add preset sizes (Small/Medium/Large)
- [ ] Sync across browser tabs (BroadcastChannel)
- [ ] Export/import layout preferences
- [ ] Add visual indicator when at min/max limits
