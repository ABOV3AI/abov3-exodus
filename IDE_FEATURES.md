# IDE File Management Features

Complete IDE-like file management system for the project browser with delete, rename, and edit operations.

## Features Implemented

### 1. Delete Operations
- **Right-click context menu**: Delete files and folders
- **Hover action button**: Delete icon appears on hover
- **Confirmation dialogs**:
  - Always confirms all deletes
  - Extra warning for folders with contents
  - "This action cannot be undone" message
- **Recursive deletion**: Folders deleted with all contents

### 2. Rename Operations
- **Inline editing**: F2 or context menu → "Rename" triggers inline text field
- **Enter to confirm**: Press Enter to complete rename
- **Escape to cancel**: Press Escape to abort
- **Name validation**:
  - Checks for invalid characters (< > : " / \ | ? *)
  - Prevents reserved names (CON, PRN, AUX, etc.)
  - Checks for name conflicts
  - 255 character limit
- **Copy+delete pattern**: Since FileSystem API has no native rename
  - Copies file/folder to new name
  - Deletes original
  - Automatic rollback on failure

### 3. Edit Operations
- **Edit trigger methods**:
  - Click "Edit" button in file preview toolbar
  - Context menu → "Edit"
  - Hover action button (edit icon)
- **CodeMirror editor**:
  - Syntax highlighting for common languages
  - Line numbers and code folding
  - Auto-indentation and bracket matching
  - IntelliSense-like autocompletion
- **Language support**:
  - JavaScript/TypeScript (.js, .jsx, .ts, .tsx)
  - HTML/CSS (.html, .css, .scss)
  - JSON (.json)
  - Markdown (.md)
  - Python (.py)
  - XML/SVG (.xml, .svg)
- **Save functionality**:
  - Ctrl+S / Cmd+S keyboard shortcut
  - Save button in toolbar
  - Dirty state indicator (*)
  - Unsaved changes warning on close
- **File size limits**:
  - Preview: 1MB max
  - Editor: 10MB max

### 4. Create Operations
- **New File**: Context menu on folder → "New File"
- **New Folder**: Context menu on folder → "New Folder"
- **Name validation**: Same validation as rename
- **Prompt-based**: Simple browser prompt for name

### 5. Tree Refresh
- **Manual refresh**: Context menu on folder → "Refresh"
- **Auto-refresh**: After delete/rename operations
- **Reload children**: Clears cached children and re-enumerates directory

## User Interface

### Context Menu (Right-Click)
**For Files:**
- Edit (if not read-only)
- Rename
- Delete

**For Folders:**
- New File
- New Folder
- Rename
- Delete
- Refresh

### Hover Actions
**Visible on mouse hover:**
- Edit button (files only, if not read-only)
- Delete button (always, if not read-only)

### Keyboard Shortcuts
- **F2**: Rename selected file/folder (when implemented)
- **Delete**: Delete selected file/folder (when implemented)
- **Ctrl+S / Cmd+S**: Save file in editor
- **Enter**: Confirm rename
- **Escape**: Cancel rename

## Mode-Based Behavior

### Chat Mode
- **No file access**: Projects inactive
- **No operations**: All file operations disabled

### Research Mode (Read-Only)
- **View only**: Can browse and preview files
- **No modifications**: Edit, rename, delete disabled
- **Context menu**: Only shows non-destructive actions

### Coding Mode (Read-Write)
- **Full access**: All operations enabled
- **Edit, rename, delete**: All available
- **Create files/folders**: Available

## Technical Implementation

### File Operations Module
**Location**: `src/modules/fileops/fileops.ui-operations.ts`

**Functions:**
- `deleteFileOrDirectory()` - Delete with recursive option
- `renameFile()` - Copy+delete pattern for files
- `renameDirectory()` - Recursive copy+delete for folders
- `writeFile()` - Save file content
- `createFile()` - Create new file with content
- `createDirectory()` - Create new folder
- `validateFileName()` - Name validation with detailed errors

### Components

#### FileContextMenu
**Location**: `src/apps/projects/components/FileContextMenu.tsx`

Context menu with conditional actions based on:
- Item type (file vs directory)
- Read-only mode
- Available handlers

#### FileDeleteDialog
**Location**: `src/apps/projects/components/FileDeleteDialog.tsx`

Confirmation dialog with:
- Item name display
- Warning for folders
- "Cannot be undone" message
- Confirm/Cancel buttons

#### FileEditor
**Location**: `src/apps/projects/components/FileEditor.tsx`

CodeMirror-based editor with:
- Auto-detected syntax highlighting
- Save/close buttons
- Dirty state tracking
- Unsaved changes warning
- Keyboard shortcuts (Ctrl+S)

#### ProjectFileTree (Enhanced)
**Location**: `src/apps/projects/components/ProjectFileTree.tsx`

**New features:**
- Right-click context menu
- Inline rename with validation
- Hover action buttons
- Delete confirmation
- Create file/folder prompts
- Notification snackbars

#### FilePreviewPanel (Enhanced)
**Location**: `src/apps/projects/components/FilePreviewPanel.tsx`

**New features:**
- Edit button in toolbar
- Toggles to FileEditor on edit
- Respects read-only mode

## Browser Compatibility

### FileSystem Access API
✅ **Chrome 86+**: Full support
✅ **Edge 86+**: Full support
✅ **Opera**: Full support
❌ **Firefox**: Limited support
❌ **Safari**: Limited support

**Note**: File management features only work in Chrome/Edge/Opera

### IndexedDB (Handle Persistence)
✅ All modern browsers support IndexedDB for permission persistence

## Security Considerations

### Permission Model
- **Initial grant**: User must grant read-write permission via `showDirectoryPicker()`
- **Persistence**: Handles stored in IndexedDB, permissions verified on load
- **Re-granting**: If permission revoked, user must re-select folder

### Validation
- **Filename validation**: Prevents invalid/reserved names
- **Path security**: Cannot escape project directory
- **No system files**: Browser prevents access to protected directories

### Destructive Operations
- **Confirmation required**: All deletes show confirmation dialog
- **No undo**: Deletions are permanent (no trash/recycle bin)
- **Folder warnings**: Extra warning when deleting folders with contents

## Testing

### Manual Test Scenarios

#### Delete File
1. Right-click a file → Delete
2. Confirm deletion
3. ✅ File should be removed from tree
4. ✅ Notification should show success

#### Delete Folder
1. Right-click a folder with contents → Delete
2. ✅ Should warn about contents
3. Confirm deletion
4. ✅ Folder and all contents removed

#### Rename File
1. Right-click a file → Rename
2. Type new name, press Enter
3. ✅ File should appear with new name
4. ✅ Original file removed

#### Rename to Existing Name
1. Rename file to existing name
2. ✅ Should show error "already exists"
3. ✅ Original file unchanged

#### Edit File
1. Click file → Edit button in toolbar
2. Modify content
3. Press Ctrl+S or click Save
4. ✅ Changes should be saved
5. Close editor
6. Re-open file
7. ✅ Changes should persist

#### Unsaved Changes Warning
1. Edit file
2. Modify content
3. Click Close without saving
4. ✅ Should prompt "unsaved changes"
5. Cancel
6. ✅ Editor still open

#### Create File
1. Right-click folder → New File
2. Enter name "test.txt"
3. ✅ File created in folder
4. ✅ Folder refreshes showing new file

#### Create Folder
1. Right-click folder → New Folder
2. Enter name "subfolder"
3. ✅ Folder created
4. ✅ Can expand to see empty folder

#### Read-Only Mode
1. Switch to Research mode
2. Browse project files
3. ✅ No edit/delete buttons visible
4. ✅ Context menu only shows non-destructive actions

### Error Scenarios

#### Invalid Filename
1. Rename file to "test<file>.txt"
2. ✅ Should show error about invalid characters

#### File Too Large (Edit)
1. Open 15MB file for editing
2. ✅ Should show "File too large for editor (max 10MB)"

#### File Too Large (Preview)
1. Open 2MB file in preview
2. ✅ Should show "File too large for preview (max 1MB)"

## Known Limitations

### No Native Rename/Move
- FileSystem API has no `rename()` method
- Must use copy+delete pattern
- Not atomic (could fail mid-operation)

### No File Watching
- Cannot detect external file changes
- Must manually refresh to see changes made outside browser

### No Undo/Trash
- Deletions are permanent
- Browser API has no trash/recycle bin concept
- Users must be careful with delete operations

### Browser-Specific
- Only works in Chrome/Edge/Opera
- Firefox and Safari have limited FileSystem API support

## Future Enhancements

### Potential Improvements
- [ ] Drag-and-drop file reordering
- [ ] Multi-file selection
- [ ] Batch operations (delete multiple files)
- [ ] File search/grep within project
- [ ] Git integration (show status, stage files)
- [ ] File history/snapshots
- [ ] Diff viewer for changes
- [ ] Auto-save in editor
- [ ] Multiple tabs in editor
- [ ] Split pane editing

### Advanced Features
- [ ] File watchers (polling-based)
- [ ] Conflict resolution for concurrent edits
- [ ] Undo/redo for file operations
- [ ] Trash bin implementation (custom)
- [ ] File templates for new files
- [ ] Snippets and code generation
- [ ] Integrated terminal

## Troubleshooting

### "Permission needed" on every refresh
- Check IndexedDB: DevTools → Application → IndexedDB → `agi-project-handles`
- If empty, handles not persisting
- Try re-adding project

### Context menu not appearing
- Ensure not in Chat mode (no file access)
- Check browser console for errors
- Verify project has read-write permission

### Edit button not visible
- Check if in Research mode (read-only)
- Hover over file to see if edit icon appears
- Verify file is a text file (not binary)

### Save fails in editor
- Check file permissions
- Verify not exceeding file size limits
- Check browser console for errors

### Rename fails
- Check for name conflicts
- Verify name doesn't contain invalid characters
- Ensure not trying to rename root directory

## Documentation References

- **FileSystem Access API**: https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
- **CodeMirror 6**: https://codemirror.net/
- **React CodeMirror**: https://github.com/uiwjs/react-codemirror

## Summary

✅ **Complete IDE file management** with delete, rename, and edit operations
✅ **Context menu** with all common file operations
✅ **Hover actions** for quick access
✅ **CodeMirror editor** with syntax highlighting
✅ **Mode-based permissions** (coding vs research)
✅ **Safety confirmations** for destructive operations
✅ **Name validation** with detailed error messages
✅ **Keyboard shortcuts** for productivity
✅ **Notification system** for operation feedback

**Result**: A fully functional IDE-like file management system within the browser!
