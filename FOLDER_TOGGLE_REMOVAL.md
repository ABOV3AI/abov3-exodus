# Chat Folder Toggle Removal

## Changes Made

### Removed Collapsible Feature from Chat Folders
The toggle button that allowed users to collapse/expand the Chat Folders panel has been completely removed. Folders are now always visible and cannot be hidden.

---

## Files Modified

### 1. `src/apps/chat/components/layout-drawer/folders/ChatFolderList.tsx`

**Removed Imports:**
- `IconButton` and `Tooltip` from MUI Joy (no longer needed for toggle button)
- Removed unused icon imports for toggle functionality

**Removed Props:**
- `enableFolders: boolean` - No longer needed as folders are always visible
- `toggleEnableFolders: () => void` - No toggle function needed

**Removed JSX:**
- Header section with "Chat Folders" title and toggle button (lines 105-121)
- The List component now renders directly without the header wrapper

**Before:**
```tsx
export function ChatFolderList(props: {
  folders: DFolder[];
  folderChatCounts?: Record<DFolder['id'], number>;
  contentScaling: ContentScaling;
  activeFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  enableFolders: boolean;
  toggleEnableFolders: () => void;
  sx?: SxProps;
})

// JSX included header with toggle button
<Box sx={props.sx}>
  {/* Header with toggle button */}
  <Box sx={{...}}>
    <Typography level="title-sm">Chat Folders</Typography>
    <Tooltip title={enableFolders ? 'Hide Folders' : 'Show Folders'}>
      <IconButton size='sm' onClick={toggleEnableFolders}>
        {enableFolders ? <FoldersToggleOn /> : <FoldersToggleOff />}
      </IconButton>
    </Tooltip>
  </Box>
  <List>...</List>
</Box>
```

**After:**
```tsx
export function ChatFolderList(props: {
  folders: DFolder[];
  folderChatCounts?: Record<DFolder['id'], number>;
  contentScaling: ContentScaling;
  activeFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  sx?: SxProps;
})

// No header, just the List
<Box sx={props.sx}>
  <List>...</List>
</Box>
```

---

### 2. `src/apps/chat/components/layout-drawer/ChatDrawer.tsx`

**Modified useFolders Hook:**
- Removed `enableFolders` and `toggleEnableFolders` from the hook
- Removed conditional logic - folders are always returned
- Removed `noFolders` constant (no longer needed)

**Before:**
```tsx
const noFolders: DFolder[] = [];

export const useFolders = (activeFolderId: string | null) =>
  useFolderStore(useShallow(({ enableFolders, folders, toggleEnableFolders }) => {
    const activeFolder = (enableFolders && activeFolderId)
      ? folders.find(folder => folder.id === activeFolderId) ?? null
      : null;

    return {
      activeFolder,
      allFolders: enableFolders ? folders : noFolders,
      enableFolders,
      toggleEnableFolders,
    };
  }));
```

**After:**
```tsx
export const useFolders = (activeFolderId: string | null) =>
  useFolderStore(useShallow(({ folders }) => {
    const activeFolder = activeFolderId
      ? folders.find(folder => folder.id === activeFolderId) ?? null
      : null;

    return {
      activeFolder,
      allFolders: folders,
    };
  }));
```

**Updated ChatFolderList Usage:**
- Removed `enableFolders` and `toggleEnableFolders` props
- Simplified `sx` props - removed conditional logic based on enableFolders
- Changed conditional ListDivider to always show

**Before:**
```tsx
const { activeFolder, allFolders, enableFolders, toggleEnableFolders } = useFolders(props.activeFolderId);

<ChatFolderList
  folders={allFolders}
  contentScaling={contentScaling}
  activeFolderId={props.activeFolderId}
  onFolderSelect={props.setActiveFolderId}
  enableFolders={enableFolders}
  toggleEnableFolders={toggleEnableFolders}
  sx={{
    flexGrow: 0, flexShrink: 2,
    overflow: enableFolders ? 'hidden' : 'visible',
    minHeight: enableFolders ? '7.5rem' : 'auto',
    p: 2,
    backgroundColor: 'background.level1',
  }}
/>

{enableFolders && <ListDivider sx={{ mb: 0 }} />}
```

**After:**
```tsx
const { activeFolder, allFolders } = useFolders(props.activeFolderId);

<ChatFolderList
  folders={allFolders}
  contentScaling={contentScaling}
  activeFolderId={props.activeFolderId}
  onFolderSelect={props.setActiveFolderId}
  sx={{
    flexGrow: 0, flexShrink: 2,
    overflow: 'hidden',
    minHeight: '7.5rem',
    p: 2,
    backgroundColor: 'background.level1',
  }}
/>

<ListDivider sx={{ mb: 0 }} />
```

---

## User Experience

### Before
- Users could click a toggle button to hide/show the Chat Folders panel
- Toggle icon was located in the folders panel header
- Folders could be collapsed to save vertical space

### After
- Chat Folders panel is always visible
- No toggle button or ability to hide folders
- Cleaner, simpler interface without the toggle controls
- More consistent UI - folders are a permanent part of the layout

---

## Benefits

1. **Simpler UI**: Removed unnecessary controls for a cleaner interface
2. **Consistent Experience**: Folders are always accessible in the same place
3. **Reduced Complexity**: Less state management and conditional rendering
4. **Cleaner Code**: Removed props, imports, and conditional logic

---

## Notes

- The `enableFolders` state still exists in `store-chat-folders.ts` but is no longer used
- The store could be cleaned up in a future update if the toggle feature is permanently removed
- This change does not affect folder functionality (create, delete, organize, etc.)
- All drag-and-drop and folder management features remain intact

---

## Testing

✅ Compilation successful
✅ Dev server running without errors on http://localhost:3006
✅ Fast refresh working correctly

**To verify:**
1. Open http://localhost:3006
2. Confirm Chat Folders panel is always visible
3. Verify no toggle button appears in the folders area
4. Test folder management features (create, delete, drag-and-drop)

---

## Implementation Complete ✅

All changes have been successfully implemented and are running in the development server.
