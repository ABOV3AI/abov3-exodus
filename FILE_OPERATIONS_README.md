# File Operations Feature - Implementation Guide

This document describes the native file operations feature added to BIG-AGI fork.

## Overview

The file operations feature enables AI-driven file manipulation directly from the browser without Docker or server-side file access. It uses the modern **File System Access API** available in Chromium-based browsers.

## Architecture

### Components Created

1. **Projects Store** (`src/apps/projects/store-projects.ts`)
   - Zustand store with localStorage persistence
   - Manages project directories and their metadata
   - Stores `FileSystemDirectoryHandle` in-memory (non-serializable)
   - Persists project metadata (id, name, path, addedAt) to localStorage

2. **Projects Sidebar** (`src/apps/projects/ProjectsSidebar.tsx`)
   - UI component for managing projects
   - Add/remove/select project directories
   - Uses `window.showDirectoryPicker()` for folder selection

3. **File Operations Tools** (`src/modules/fileops/fileops.tools.ts`)
   - AIX tool definitions for 4 operations:
     - `read_file` - Read complete file contents
     - `write_file` - Write/create files
     - `list_files` - List directory contents
     - `create_directory` - Create directories recursively

4. **File Operations Executor** (`src/modules/fileops/fileops.executor.ts`)
   - Client-side execution using File System Access API
   - Handles path traversal and permissions
   - Error handling and validation

5. **Chat Integration** (`src/apps/chat/editors/chat-persona.ts`)
   - Injects file tools when active project exists
   - Executes tool invocations client-side
   - Handles tool response loop (AI → tool call → execute → AI response)

## How It Works

### 1. Project Selection
```typescript
// User clicks "Add" in Projects sidebar
const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
await addProject(dirHandle);
```

### 2. Tool Injection
```typescript
// When active project exists, file tools are passed to AI
const activeProject = useProjectsStore.getState().getActiveProject();
const tools = activeProject?.handle ? FILE_OPERATIONS_TOOLS : undefined;
```

### 3. AI Tool Invocation
```typescript
// AI response includes tool invocation
{
  type: 'function_call',
  invocation: {
    type: 'function_call',
    name: 'read_file',
    args: '{"path":"package.json"}'
  }
}
```

### 4. Client-Side Execution
```typescript
// Execute file operation using File System Access API
const result = await executeFileOperation(
  'read_file',
  '{"path":"package.json"}',
  projectHandle
);
```

### 5. Tool Response Loop
```typescript
// Append tool response to conversation
cHandler.messageAppendCustom(toolResponseFragments, 'tool');

// Trigger AI continuation with results
await runPersonaOnConversationHead(assistantLlmId, conversationId);
```

## Usage

### For End Users

1. **Open BIG-AGI** at http://localhost:3001
2. **Open left drawer** (chat sidebar)
3. **Add a project:**
   - Click "+ Add" in Projects section
   - Select a local folder
   - Grant read/write permissions
4. **Chat with AI:**
   - "List all files in the project"
   - "Read the contents of package.json"
   - "Create a new file called test.txt with hello world"
   - "Write documentation to README.md"

### For Developers

#### Adding New File Operations

1. Define tool in `fileops.tools.ts`:
```typescript
{
  type: 'function_call',
  function_call: {
    name: 'your_operation',
    description: 'What it does...',
    input_schema: {
      properties: {
        param: { type: 'string', description: '...' }
      },
      required: ['param']
    }
  }
}
```

2. Implement in `fileops.executor.ts`:
```typescript
case 'your_operation': {
  const { param } = args;
  // Your implementation
  return { result: 'success message' };
}
```

3. Add to tool list in `chat-persona.ts:131`:
```typescript
const fileOperationTools = [
  'read_file', 'write_file', 'list_files', 'create_directory',
  'your_operation' // Add here
];
```

## Browser Compatibility

**Supported:**
- Chrome 86+
- Edge 86+
- Opera 72+

**Not Supported:**
- Firefox (no File System Access API)
- Safari (no File System Access API)

## Security & Permissions

- Users must explicitly grant read/write permissions for each directory
- Permissions are requested via browser's native permission dialog
- FileSystemDirectoryHandle requires user gesture (e.g., button click)
- Handles are not persisted; users may need to re-select after refresh

## File Structure

```
src/
├── apps/
│   ├── chat/
│   │   ├── editors/
│   │   │   └── chat-persona.ts          # Integrates file tools into chat
│   │   └── components/
│   │       └── layout-drawer/
│   │           └── ChatDrawer.tsx        # Includes Projects sidebar
│   └── projects/
│       ├── store-projects.ts             # Zustand store for projects
│       └── ProjectsSidebar.tsx           # UI component
└── modules/
    ├── aix/
    │   └── client/
    │       └── aix.client.ts             # Extended to accept tools param
    └── fileops/
        ├── fileops.tools.ts              # AIX tool definitions
        └── fileops.executor.ts           # Client-side executor
```

## Limitations

1. **Browser-only**: File operations only work in browser, not in server-side code
2. **No persistence**: `FileSystemDirectoryHandle` lost on page refresh (metadata persists)
3. **Chrome/Edge only**: Requires File System Access API
4. **User gesture required**: Must be triggered by user interaction
5. **No background operations**: Operations run synchronously in main thread

## Future Enhancements

- [ ] Handle permission re-request on page refresh
- [ ] Add file search/grep capabilities
- [ ] Implement file watching for live updates
- [ ] Add batch file operations
- [ ] Support drag-and-drop file uploads
- [ ] Add file diff/patch operations
- [ ] Implement version control integration

## Troubleshooting

### "Module not found" errors
- Clear `.next` cache: `rm -rf .next`
- Restart dev server

### File operations not appearing
- Ensure project is selected and active
- Check browser console for File System Access API errors
- Verify browser compatibility (Chrome/Edge)

### Permission denied errors
- Re-select the directory to grant permissions again
- Check that directory isn't in protected system location

### Tool invocations not executing
- Check browser console for JavaScript errors
- Verify `activeProject.handle` exists
- Ensure project was added with 'readwrite' mode

## Implementation Notes

### Why Client-Side?
- No server access to user's file system
- Browser security model handles permissions
- Zero backend configuration
- Works offline

### Why Not IndexedDB for Handles?
- `FileSystemDirectoryHandle` is not serializable
- Can't be stored in localStorage/IndexedDB
- Must be recreated via `showDirectoryPicker()`
- Metadata stored, handles kept in-memory

### Tool Response Loop
- AI calls tool → Execute → Append response → Recurse
- Recursion terminates when no more tool calls
- Prevents infinite loops via natural AI behavior

## Related Files

- **AIX Wiretypes**: `src/modules/aix/server/api/aix.wiretypes.ts` (tool type definitions)
- **Chat Fragments**: `src/common/stores/chat/chat.fragments.ts` (message structure)
- **Conversations Manager**: `src/common/chat-overlay/ConversationsManager.ts` (conversation handling)
