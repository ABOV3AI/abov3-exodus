# ABOV3 FlowCore - Visual Workflow Builder

## Overview

FlowCore is a native visual workflow automation builder integrated into ABOV3 Exodus. It provides a drag-and-drop interface for creating, managing, and executing automated workflows - similar to n8n or Zapier, but built directly into Exodus.

## Features

### ✅ Completed

**Phase 1 - Core Builder (MVP)**
- **Multi-Workflow Management**: Create and manage unlimited workflows
- **Drag-and-Drop Canvas**: Visual node-based workflow editor powered by React Flow
- **Node Palette**: Pre-built node types for tools, AI, logic, triggers, and outputs
- **Workflow List**: Left sidebar with search, filtering, and workflow selection
- **Properties Panel**: Configure selected nodes with dynamic forms
- **Workflow Toolbar**: Run, save, edit, and manage workflows
- **Persistent Storage**: IndexedDB-backed storage via Zustand persist middleware
- **Navigation Integration**: FlowCore icon (🔀) in left sidebar below Call button
- **Full-Screen Builder**: Dedicated `/flowcore` route with full-page interface

**Phase 2 - Execution Engine**
- **Workflow Executor**: Graph-based execution engine with sequential node processing
- **Real-time Visualization**: Live execution viewer showing current node and progress
- **Visual Highlighting**: Canvas nodes highlight during execution (blue=current, green=completed, red=error)
- **Error Handling**: Automatic retry with exponential backoff (3 retries: 1s, 2s, 4s delays)
- **Execution History**: View past workflow runs with timing, results, and errors
- **Execution Context**: Track variables, node results, and errors throughout execution

**Phase 3 - Scheduling & Templates**
- **Cron Scheduler**: Schedule workflows with cron expressions (e.g., '0 9 * * *' = 9am daily)
- **Schedule Presets**: Common schedules (every minute, hourly, daily, weekly, custom)
- **Webhook Triggers**: HTTP endpoint to trigger workflows remotely via POST
- **Template Gallery**: Pre-built workflow templates (News Summary, Data Pipeline, Website Monitor, Content Generator)
- **Template Categories**: Browse templates by All/Research/Data/Monitoring/Content
- **Import/Export**: JSON-based workflow import/export with copy and download
- **Active/Inactive Toggle**: Enable/disable workflows without deletion

**Phase 4 - Integration**
- **Enhanced Store**: Zustand store with execution tracking and scheduler integration
- **Scheduler Lifecycle**: Auto-initialize on app startup, cleanup on unmount
- **Execution Persistence**: Workflow runs saved to history (keeps last 50)
- **Template Instantiation**: One-click template usage with auto-import

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
3. Watch the execution in real-time:
   - Current node highlights in **blue** with glow effect
   - Completed nodes turn **green**
   - Failed nodes turn **red**
   - ExecutionViewer panel shows live progress in bottom-right

### Schedule a Workflow

1. Open a workflow
2. Click the **"More" menu (⋮)** in the toolbar
3. Configure trigger type (manual or schedule)
4. For scheduled workflows:
   - Choose a cron preset (hourly, daily, weekly, etc.)
   - Or enter a custom cron expression
5. Toggle workflow to **Active** to enable scheduling
6. Scheduler runs automatically in the background

### Use Templates

1. When no workflow is selected, click **"Browse Templates"**
2. Or click **"More" menu → "Browse Templates"**
3. Browse by category: All, Research, Data, Monitoring, Content
4. Click **"Use Template"** to instantly create a new workflow
5. Customize the template workflow as needed

### Import/Export Workflows

**Export:**
1. Open a workflow
2. Click **"More" menu → "Export Workflow"**
3. Copy JSON to clipboard or download as `.flowcore.json` file

**Import:**
1. Click **"More" menu → "Import Workflow"**
2. Paste JSON or upload a `.flowcore.json` file
3. Click **"Import"** - workflow appears in your list

### View Execution History

1. Open a workflow
2. Click **"More" menu → "Execution History"**
3. See all past runs with:
   - Status (completed/failed/running)
   - Timing and duration
   - Results and errors
   - Full execution details

## Architecture

### File Structure

```
src/apps/flowcore/
├── AppFlowCore.tsx              # Main app component with scheduler init
├── flowcore.types.ts            # TypeScript interfaces
├── store-flowcore.ts            # Basic Zustand store with IndexedDB
├── store-flowcore-enhanced.ts   # Enhanced store with execution & scheduler
├── components/
│   ├── WorkflowList.tsx         # Left sidebar - workflow list
│   ├── WorkflowCanvas.tsx       # Center - React Flow canvas with execution highlighting
│   ├── NodePalette.tsx          # Bottom - available nodes
│   ├── PropertiesPanel.tsx      # Right - node configuration
│   ├── WorkflowToolbar.tsx      # Top - workflow controls with menus
│   ├── ExecutionViewer.tsx      # Real-time execution progress viewer
│   ├── ExecutionHistory.tsx     # Past execution logs viewer
│   ├── TemplateGallery.tsx      # Template browser with categories
│   └── ImportExportDialog.tsx   # Import/export JSON dialogs
├── runtime/
│   ├── executor.ts              # Workflow execution engine with retry logic
│   └── scheduler.ts             # Cron scheduler with presets
└── templates/
    └── templates.ts             # Pre-built workflow templates

pages/flowcore.tsx               # Next.js page route
app/api/flowcore/webhook/[workflowId]/route.ts   # Webhook API endpoint
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
- Schedule (cron with presets)
- Webhook (HTTP POST endpoint)

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

### Webhook API

FlowCore provides webhook endpoints to trigger workflows remotely:

**Endpoint:** `POST /api/flowcore/webhook/[workflowId]`

**Example:**
```bash
curl -X POST http://localhost:3000/api/flowcore/webhook/my-workflow-id \
  -H "Content-Type: application/json" \
  -d '{"data": "your input data"}'
```

**Optional Authentication:**
Set `FLOWCORE_WEBHOOK_SECRET` environment variable to require bearer token:
```bash
curl -X POST http://localhost:3000/api/flowcore/webhook/my-workflow-id \
  -H "Authorization: Bearer your-secret-here" \
  -H "Content-Type: application/json" \
  -d '{"data": "your input data"}'
```

**Response:**
```json
{
  "success": true,
  "workflowId": "my-workflow-id",
  "executionId": "exec-webhook-...",
  "message": "Workflow triggered successfully",
  "timestamp": "2025-01-19T..."
}
```

### Dependencies Added

- **reactflow@11.10.0**: Visual workflow editor library
- **node-cron@3.0.3**: Cron scheduling library
- **@types/node-cron@3.0.11**: TypeScript definitions for node-cron

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
