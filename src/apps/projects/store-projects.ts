import { create } from 'zustand';
import { persist } from 'zustand/middleware';


export interface Project {
  id: string;
  name: string;
  path: string; // Display path for UI
  addedAt: number;
  // FileSystemDirectoryHandle can't be serialized, so we store it separately
  // It will be requested again when needed via showDirectoryPicker with the same directory
}

export type ProjectMode = 'coding' | 'research' | 'chat';

interface ProjectsState {
  projects: Project[];
  activeProjectId: string | null;
  mode: ProjectMode;
  lastActiveProjectId: string | null; // Remember last project when switching modes

  // FileSystemDirectoryHandle storage (in-memory only, not persisted)
  projectHandles: Map<string, FileSystemDirectoryHandle>;
}

interface ProjectsActions {
  // Add a new project with its directory handle
  addProject: (handle: FileSystemDirectoryHandle) => Promise<void>;

  // Remove a project
  removeProject: (id: string) => void;

  // Set active project
  setActiveProject: (id: string | null) => void;

  // Get directory handle for a project
  getProjectHandle: (id: string) => FileSystemDirectoryHandle | null;

  // Store directory handle (called after user grants permission)
  setProjectHandle: (id: string, handle: FileSystemDirectoryHandle) => void;

  // Get active project info
  getActiveProject: () => (Project & { handle: FileSystemDirectoryHandle | null }) | null;

  // Mode management
  setMode: (mode: ProjectMode) => void;
  toggleMode: () => void;
  getMode: () => ProjectMode;
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
      projectHandles: new Map(),

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

        set((state) => ({
          projects: [...state.projects, newProject],
          projectHandles: new Map(state.projectHandles).set(id, handle),
          // Auto-set as active if first project
          activeProjectId: state.activeProjectId || id,
        }));
      },

      removeProject: (id: string) => {
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

      setActiveProject: (id: string | null) => {
        set({ activeProjectId: id });
      },

      getProjectHandle: (id: string) => {
        return get().projectHandles.get(id) || null;
      },

      setProjectHandle: (id: string, handle: FileSystemDirectoryHandle) => {
        set((state) => ({
          projectHandles: new Map(state.projectHandles).set(id, handle),
        }));
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

        if (mode === 'chat') {
          // Switching to chat mode: save current project and deactivate
          set({
            mode,
            lastActiveProjectId: state.activeProjectId,
            activeProjectId: null,
          });
        } else if (mode === 'coding' || mode === 'research') {
          // Switching to coding or research mode: restore last project if it exists
          // Both modes keep the project selected, just different intent
          const projectToRestore = state.lastActiveProjectId
            && state.projects.find(p => p.id === state.lastActiveProjectId)
            ? state.lastActiveProjectId
            : null;

          set({
            mode,
            activeProjectId: projectToRestore,
          });
        }
      },

      toggleMode: () => {
        const currentMode = get().mode;
        get().setMode(currentMode === 'chat' ? 'coding' : 'chat');
      },

      getMode: () => {
        return get().mode;
      },
    }),
    {
      name: 'app-projects',
      version: 1,
      // Only persist projects metadata, not the handles (they can't be serialized)
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        mode: state.mode,
        lastActiveProjectId: state.lastActiveProjectId,
      }),
    }
  )
);
