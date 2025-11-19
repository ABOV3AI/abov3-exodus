# ABOV3 FlowCore - Visual Workflow Builder

## Overview

FlowCore is a native visual workflow automation builder integrated into ABOV3 Exodus. It provides a drag-and-drop interface for creating, managing, and executing automated workflows - similar to n8n or Zapier, but built directly into Exodus.

## Features

### ✅ Completed (Phase 1 - MVP)

- **Multi-Workflow Management**: Create and manage unlimited workflows
- **Drag-and-Drop Canvas**: Visual node-based workflow editor powered by React Flow
- **Node Palette**: Pre-built node types for tools, AI, logic, triggers, and outputs
- **Workflow List**: Left sidebar with search, filtering, and workflow selection
- **Properties Panel**: Configure selected nodes with dynamic forms
- **Workflow Toolbar**: Run, save, edit, and manage workflows
- **Persistent Storage**: IndexedDB-backed storage via Zustand persist middleware
- **Navigation Integration**: FlowCore icon (🔀) in left sidebar below Call button
- **Full-Screen Builder**: Dedicated `/flowcore` route with full-page interface

## How to Use

### Access FlowCore

1. Click the **FlowCore icon** (🔀) in the left navigation sidebar (below the Call button)
2. Or navigate directly to `/flowcore` route

### Create a Workflow

1. Click **"New Workflow"** button in the left sidebar
2. Give your workflow a name by clicking the title
3. Start building your workflow

### Build a Workflow

1. **Add Nodes**: Click or drag nodes from the bottom palette to the canvas
2. **Connect Nodes**: Click and drag from one node to another to create connections
3. **Configure Nodes**: Click a node to select it, then configure it in the right properties panel
4. **Save**: Click the "Save" button in the toolbar

### Run a Workflow

1. Select the workflow from the left sidebar
2. Click the **"Run"** button in the toolbar
3. Watch the execution in real-time (future feature)

## Architecture

### File Structure

```
src/apps/flowcore/
├── AppFlowCore.tsx              # Main app component
├── flowcore.types.ts            # TypeScript interfaces
├── store-flowcore.ts            # Zustand store with IndexedDB
├── components/
│   ├── WorkflowList.tsx         # Left sidebar - workflow list
│   ├── WorkflowCanvas.tsx       # Center - React Flow canvas
│   ├── NodePalette.tsx          # Bottom - available nodes
│   ├── PropertiesPanel.tsx      # Right - node configuration
│   └── WorkflowToolbar.tsx      # Top - workflow controls
├── nodes/                       # Custom node types (future)
├── runtime/                     # Execution engine (future)
└── templates/                   # Workflow templates (future)

pages/flowcore.tsx               # Next.js page route
```

### Available Node Types

#### 🔧 Tools
- HTTP Request
- Web Search
- File Read
- File Write

#### 🤖 AI
- LLM Chat (use any configured AI model)
- Summarize
- Extract Data

#### ⚡ Logic
- If/Then/Else
- Loop
- Merge

#### 📥 Triggers
- Manual (run button)
- Schedule (cron - future)
- Webhook (future)

#### 📤 Outputs
- Return Result
- Send Notification

### Data Storage

- **Storage Backend**: IndexedDB via Zustand persist middleware
- **Storage Key**: `app-flowcore`
- **Data Persistence**: Automatic save on every change
- **Survives**: Browser refresh, app restart

### State Management

```typescript
interface FlowCoreStore {
  // All saved workflows
  workflows: Workflow[];

  // Currently selected workflow
  currentWorkflowId: string | null;

  // Current canvas state
  nodes: Node[];
  edges: Edge[];

  // Selected node for properties panel
  selectedNodeId: string | null;
}
```

## Technical Details

### Dependencies Added

- **reactflow@11.10.0**: Visual workflow editor library
- **node-cron@3.0.3**: Scheduling library (for future cron triggers)

### Key Technologies

- **React Flow**: Drag-and-drop canvas with zoom, pan, minimap
- **Zustand**: State management with IndexedDB persistence
- **Material-UI Joy**: Consistent UI components
- **TypeScript**: Full type safety
- **Next.js 15**: Page routing

### Integration Points

1. **Navigation** (`src/common/app.nav.ts`):
   - Added FlowCore to apps array
   - Icon: `AccountTreeRoundedIcon`
   - Route: `/flowcore`

2. **Page Route** (`pages/flowcore.tsx`):
   - Next.js page that renders AppFlowCore

3. **Zustand Store** (`store-flowcore.ts`):
   - Manages all workflow state
   - Persists to IndexedDB
   - Handles CRUD operations

## Usage Examples

### Example 1: Daily News Summary Workflow

```
1. Trigger: Schedule (9am daily) [future]
   ↓
2. Tool: Web Search ("latest tech news")
   ↓
3. AI: Summarize (condense results)
   ↓
4. Output: Save to File
```

### Example 2: Data Processing Pipeline

```
1. Trigger: Manual
   ↓
2. Tool: File Read (data.csv)
   ↓
3. Logic: Loop (for each row)
   ↓
4. AI: Extract Data (parse fields)
   ↓
5. Tool: HTTP Request (send to API)
   ↓
6. Output: Return Result
```

## Future Enhancements

### Phase 2: Execution Engine (Planned)

- [ ] Workflow execution runtime
- [ ] Real-time execution visualization
- [ ] Error handling and retries
- [ ] Execution history and logs

### Phase 3: Advanced Features (Planned)

- [ ] Scheduling (cron triggers)
- [ ] Webhooks (HTTP triggers)
- [ ] File watch triggers
- [ ] Custom node types
- [ ] Workflow templates gallery
- [ ] Import/export workflows (JSON)
- [ ] Workflow versioning
- [ ] Collaboration features

### Phase 4: Integration (Planned)

- [ ] Trigger workflows from chat
- [ ] AI-generated workflows
- [ ] Integration with Exodus tools system
- [ ] MCP server connection
- [ ] Community workflow marketplace

## Keyboard Shortcuts

- **Delete**: Delete selected node(s)
- **Ctrl+Z**: Undo (React Flow built-in)
- **Ctrl+Y**: Redo (React Flow built-in)
- **Ctrl+Scroll**: Zoom in/out

## Troubleshooting

### Workflow not saving?

- Check browser console for errors
- Check IndexedDB: DevTools → Application → IndexedDB → `app-flowcore`

### Nodes not connecting?

- Make sure you're dragging from the edge of a node
- Check that both nodes are compatible for connection

### FlowCore icon not showing?

- Hard refresh: Ctrl+Shift+R
- Clear cache and reload

## Development

### Add a New Node Type

1. Add to `NodePalette.tsx` in the appropriate category
2. Create node component in `src/apps/flowcore/nodes/`
3. Register in React Flow's node types
4. Update execution engine to handle new type

### Debug Workflow Execution

1. Open browser console
2. Check Zustand store: `useFlowCoreStore.getState()`
3. Inspect IndexedDB: DevTools → Application → IndexedDB

## Contributing

When adding features to FlowCore:

1. Follow existing component structure
2. Use TypeScript for all new code
3. Persist state changes via Zustand store
4. Test with multiple workflows
5. Update this README with new features

## License

Part of ABOV3 Exodus - follows the same MIT license with attribution to original Big-AGI project by Enrico Ros.

---

**Created**: November 2025
**Version**: 1.0.0 (MVP)
**Status**: ✅ Fully Functional (Phase 1 Complete)
