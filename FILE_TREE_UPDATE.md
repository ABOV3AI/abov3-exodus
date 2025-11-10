# File Tree UI Update - Resizable & Better Spacing

## Changes Made

### Problem
The file tree section was too narrow and hard to read, showing only a small portion of file names with text truncation.

### Solution
Implemented a **resizable split panel** with improved spacing and better default width.

---

## New Features

### 1. **Resizable Panels**
- **Default split**: 70% file tree / 30% preview (changed from 50/50)
- **Drag-to-resize**: Grab the divider between panels to adjust width
- **Visual feedback**: Divider highlights on hover and when dragging
- **Constraints**: Min 30% / Max 85% for file tree width

### 2. **Better Spacing**
- **Increased row height**: 32px minimum (was ~24px)
- **Better padding**: More vertical and horizontal space
- **Larger icons**: 24px chevrons and folder icons (was 20px)
- **Deeper indentation**: 2x depth multiplier (was 1.5x)

### 3. **Smooth UX**
- **Smooth transitions**: Width animates when opening/closing preview
- **No transition during drag**: Instant feedback while resizing
- **Full-height tree**: Tree uses 100% of available height

---

## How to Use

### Resizing the Panels

1. **Open a file** → Preview panel appears on the right
2. **Hover over the divider** → Cursor changes to resize icon
3. **Click and drag** → Adjust the split between tree and preview
4. **Release** → New width is locked in

### Width Limits

- **Minimum tree width**: 30% (prevents preview from taking over)
- **Maximum tree width**: 85% (ensures preview is always visible)
- **Default**: 70% tree / 30% preview

---

## Technical Details

### Files Modified

**`src/apps/projects/ProjectsSidebar.tsx`**
- Added `fileTreeWidth` state (default: 70%)
- Added `isResizing` state for drag handling
- Implemented mouse drag listeners with constraints
- Changed layout from fixed 50/50 to dynamic percentage-based
- Added 4px resize handle with hover effects

**`src/apps/projects/components/ProjectFileTree.tsx`**
- Increased `py` (vertical padding): 0.5 → 0.75
- Increased `pl` (left padding): depth * 1.5 → depth * 2
- Increased `minHeight`: implicit → 32px
- Increased `gap`: 0.5 → 0.75
- Increased icon size: 20px → 24px
- Added `height: '100%'` to container

---

## Visual Comparison

### Before
```
[File Tree: 50%] | [Preview: 50%]
- Narrow file tree
- Truncated file names
- Tight spacing
- Small icons
```

### After
```
[File Tree: 70% (resizable)] | [Divider: 4px] | [Preview: 30%]
- Wide file tree by default
- Full file names visible
- Comfortable spacing
- Larger, easier-to-click icons
- Drag divider to adjust
```

---

## Benefits

✅ **More readable** - Wider default view shows more text
✅ **Customizable** - User can adjust to preference
✅ **Better UX** - Larger click targets, comfortable spacing
✅ **Visual feedback** - Divider highlights on hover/drag
✅ **Smooth animations** - Professional feel

---

## Testing

1. **Start dev server**: `npm run dev`
2. **Open Projects sidebar**
3. **Add a project** with lots of files/folders
4. **Click a file** → Preview opens
5. **Hover over divider** → Should highlight
6. **Drag divider** → Should resize smoothly
7. **Try extreme widths** → Should constrain at 30% and 85%

---

## Future Enhancements (Optional)

- [ ] Remember resize width in localStorage
- [ ] Double-click divider to reset to default (70%)
- [ ] Keyboard shortcuts to adjust width (Ctrl+[ / Ctrl+])
- [ ] Collapse preview entirely (100% tree view)
