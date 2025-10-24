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
  lastCodingProjectId: string | null; // Remember project for coding mode
  lastResearchProjectId: string | null; // Remember project for research mode

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
      lastCodingProjectId: null,
      lastResearchProjectId: null,
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

        // Save current project to the current mode's memory before switching
        const updates: Partial<ProjectsState> = { mode };

        if (state.mode === 'coding') {
          updates.lastCodingProjectId = state.activeProjectId;
        } else if (state.mode === 'research') {
          updates.lastResearchProjectId = state.activeProjectId;
        }

        if (mode === 'chat') {
          // Switching to chat mode: deactivate project
          updates.activeProjectId = null;
        } else if (mode === 'coding') {
          // Switching to coding mode: restore last coding project
          const projectToRestore = state.lastCodingProjectId
            && state.projects.find(p => p.id === state.lastCodingProjectId)
            ? state.lastCodingProjectId
            : null;
          updates.activeProjectId = projectToRestore;
        } else if (mode === 'research') {
          // Switching to research mode: restore last research project
          const projectToRestore = state.lastResearchProjectId
            && state.projects.find(p => p.id === state.lastResearchProjectId)
            ? state.lastResearchProjectId
            : null;
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
