import { create } from 'zustand';
import { persist } from 'zustand/middleware';


export interface Project {
  id: string;
  name: string;
  path: string; // Display path for UI (folder name from browser)
  fullPath?: string; // Full absolute path for MCP tools (user-configured)
  addedAt: number;
  // FileSystemDirectoryHandle can't be serialized, so we store it separately
  // It will be requested again when needed via showDirectoryPicker with the same directory
}

// IndexedDB for persistent FileSystem handles
const DB_NAME = 'agi-project-handles';
const DB_VERSION = 1;
const STORE_NAME = 'handles';

async function openHandlesDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function saveHandleToIDB(id: string, handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openHandlesDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(handle, id);
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  } catch (error) {
    console.error('Failed to save handle to IndexedDB:', error);
  }
}

async function loadHandleFromIDB(id: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandlesDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    db.close();

    // Verify we still have permission
    if (handle) {
      const permission = await handle.queryPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        return handle;
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to load handle from IndexedDB:', error);
    return null;
  }
}

async function removeHandleFromIDB(id: string): Promise<void> {
  try {
    const db = await openHandlesDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  } catch (error) {
    console.error('Failed to remove handle from IndexedDB:', error);
  }
}

export type ProjectMode = 'coding' | 'research' | 'chat';

interface ProjectsState {
  projects: Project[];
  activeProjectId: string | null;
  mode: ProjectMode;
  lastActiveProjectId: string | null; // Remember last project when switching modes
  lastCodingProjectId: string | null; // Remember project for coding mode
  lastResearchProjectId: string | null; // Remember project for research mode

  // FileSystemDirectoryHandle storage (in-memory only, not persisted)
  projectHandles: Map<string, FileSystemDirectoryHandle>;

  // Counter to signal file tree should refresh (incremented when AI tools modify files)
  fileTreeRefreshCounter: number;
}

interface ProjectsActions {
  // Add a new project with its directory handle
  addProject: (handle: FileSystemDirectoryHandle) => Promise<void>;

  // Remove a project
  removeProject: (id: string) => void;

  // Update a project's properties (e.g., fullPath)
  updateProject: (id: string, updates: Partial<Pick<Project, 'name' | 'fullPath'>>) => void;

  // Set active project
  setActiveProject: (id: string | null) => void;

  // Get directory handle for a project
  getProjectHandle: (id: string) => FileSystemDirectoryHandle | null;

  // Store directory handle (called after user grants permission)
  setProjectHandle: (id: string, handle: FileSystemDirectoryHandle) => void;

  // Load persisted handles from IndexedDB
  loadPersistedHandles: () => Promise<void>;

  // Get active project info
  getActiveProject: () => (Project & { handle: FileSystemDirectoryHandle | null }) | null;

  // Mode management
  setMode: (mode: ProjectMode) => void;
  toggleMode: () => void;
  getMode: () => ProjectMode;

  // File tree refresh (called when AI tools modify files)
  triggerFileTreeRefresh: () => void;
}

type ProjectsStore = ProjectsState & ProjectsActions;


/**
 * Projects Store
 * Manages local project directories for file operations
 * Uses browser File System Access API
 */
export const useProjectsStore = create<ProjectsStore>()(
  persist(
    (set, get) => ({
      // State
      projects: [],
      activeProjectId: null,
      mode: 'chat' as ProjectMode,
      lastActiveProjectId: null,
      lastCodingProjectId: null,
      lastResearchProjectId: null,
      projectHandles: new Map(),
      fileTreeRefreshCounter: 0,

      // Actions
      addProject: async (handle: FileSystemDirectoryHandle) => {
        const id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const name = handle.name;

        // Try to get the file path (may not be available in all browsers)
        let path = handle.name;
        try {
          // @ts-ignore - getPath is not in all TypeScript definitions yet
          if (typeof handle.getPath === 'function') {
            // @ts-ignore
            const pathParts = await handle.getPath();
            path = pathParts.join('/');
          }
        } catch {
          // Fallback to just the name
          path = handle.name;
        }

        const newProject: Project = {
          id,
          name,
          path,
          addedAt: Date.now(),
        };

        // Save handle to IndexedDB for persistence
        await saveHandleToIDB(id, handle);

        set((state) => ({
          projects: [...state.projects, newProject],
          projectHandles: new Map(state.projectHandles).set(id, handle),
          // Auto-set as active if first project
          activeProjectId: state.activeProjectId || id,
        }));
      },

      removeProject: (id: string) => {
        // Remove handle from IndexedDB
        removeHandleFromIDB(id);

        set((state) => {
          const newHandles = new Map(state.projectHandles);
          newHandles.delete(id);

          return {
            projects: state.projects.filter((p) => p.id !== id),
            projectHandles: newHandles,
            activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
          };
        });
      },

      updateProject: (id: string, updates: Partial<Pick<Project, 'name' | 'fullPath'>>) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      setActiveProject: (id: string | null) => {
        const state = get();
        const updates: Partial<ProjectsState> = { activeProjectId: id };

        // Also save to mode-specific memory
        if (state.mode === 'coding') {
          updates.lastCodingProjectId = id;
        } else if (state.mode === 'research') {
          updates.lastResearchProjectId = id;
        }

        // Save to general lastActiveProjectId for backward compatibility
        updates.lastActiveProjectId = id;

        set(updates);
      },

      getProjectHandle: (id: string) => {
        return get().projectHandles.get(id) || null;
      },

      setProjectHandle: (id: string, handle: FileSystemDirectoryHandle) => {
        // Save handle to IndexedDB when user grants permission
        saveHandleToIDB(id, handle);

        set((state) => ({
          projectHandles: new Map(state.projectHandles).set(id, handle),
        }));
      },

      // Load all handles from IndexedDB on app startup
      loadPersistedHandles: async () => {
        const state = get();
        const newHandles = new Map(state.projectHandles);

        for (const project of state.projects) {
          if (!newHandles.has(project.id)) {
            const handle = await loadHandleFromIDB(project.id);
            if (handle) {
              newHandles.set(project.id, handle);
            }
          }
        }

        set({ projectHandles: newHandles });
      },

      getActiveProject: () => {
        const state = get();
        if (!state.activeProjectId) return null;

        const project = state.projects.find((p) => p.id === state.activeProjectId);
        if (!project) return null;

        const handle = state.projectHandles.get(project.id) || null;

        return {
          ...project,
          handle,
        };
      },

      setMode: (mode: ProjectMode) => {
        const state = get();

        // Save current project to the current mode's memory before switching
        const updates: Partial<ProjectsState> = { mode };

        // Save current project to coding memory (coding and research share the same project)
        if (state.mode === 'coding' || state.mode === 'research') {
          updates.lastCodingProjectId = state.activeProjectId;
        }

        if (mode === 'chat') {
          // Switching to chat mode: deactivate project (no tools in chat mode)
          updates.activeProjectId = null;
        } else if (mode === 'coding' || mode === 'research') {
          // Coding and Research modes share the same project folder
          // Research mode = read-only access, Coding mode = full access
          const projectToRestore = state.lastCodingProjectId
            && state.projects.find(p => p.id === state.lastCodingProjectId)
            ? state.lastCodingProjectId
            : (state.activeProjectId || null);  // Keep current if available
          updates.activeProjectId = projectToRestore;
        }

        set(updates);
      },

      toggleMode: () => {
        const currentMode = get().mode;
        get().setMode(currentMode === 'chat' ? 'coding' : 'chat');
      },

      getMode: () => {
        return get().mode;
      },

      triggerFileTreeRefresh: () => {
        set((state) => ({
          fileTreeRefreshCounter: state.fileTreeRefreshCounter + 1,
        }));
      },
    }),
    {
      name: 'app-projects',
      version: 2, // Incremented version for new fields
      // Only persist projects metadata, not the handles (they can't be serialized)
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        mode: state.mode,
        lastActiveProjectId: state.lastActiveProjectId,
        lastCodingProjectId: state.lastCodingProjectId,
        lastResearchProjectId: state.lastResearchProjectId,
      }),
    }
  )
);
