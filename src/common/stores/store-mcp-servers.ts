/**
 * MCP Servers Store
 * Manages MCP server configurations and runtime state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { MCPServerConfig } from '~/modules/mcp/mcp.types';
import { getMCPRuntime } from '~/modules/mcp/mcp.runtime';


interface MCPServersState {
  servers: MCPServerConfig[];
  initialized: boolean;
}

interface MCPServersActions {
  addServer: (config: Omit<MCPServerConfig, 'id' | 'addedAt'>) => Promise<void>;
  removeServer: (id: string) => Promise<void>;
  updateServer: (id: string, updates: Partial<MCPServerConfig>) => void;
  toggleServer: (id: string) => Promise<void>;
  getServer: (id: string) => MCPServerConfig | null;
  initializeRuntime: () => Promise<void>;
}

type MCPServersStore = MCPServersState & MCPServersActions;


export const useMCPServersStore = create<MCPServersStore>()(
  persist(
    (set, get) => ({
      // State
      servers: [],
      initialized: false,

      // Actions
      addServer: async (config) => {
        const id = `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newServer: MCPServerConfig = {
          ...config,
          id,
          addedAt: Date.now(),
        };

        // Add to store first
        set((state) => ({
          servers: [...state.servers, newServer],
        }));

        // Register with runtime if enabled
        if (newServer.enabled) {
          try {
            const runtime = getMCPRuntime();
            await runtime.registerServer(newServer);
          } catch (error) {
            console.error(`Failed to register MCP server ${newServer.name}:`, error);
            // Keep in store but mark as disabled
            set((state) => ({
              servers: state.servers.map(s =>
                s.id === id ? { ...s, enabled: false } : s
              ),
            }));
            throw error;
          }
        }
      },

      removeServer: async (id) => {
        const server = get().servers.find(s => s.id === id);
        if (!server) return;

        // Unregister from runtime
        if (server.enabled) {
          try {
            const runtime = getMCPRuntime();
            await runtime.unregisterServer(server.name);
          } catch (error) {
            console.error(`Failed to unregister MCP server ${server.name}:`, error);
          }
        }

        // Remove from store
        set((state) => ({
          servers: state.servers.filter(s => s.id !== id),
        }));
      },

      updateServer: (id, updates) => {
        set((state) => ({
          servers: state.servers.map(s =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      toggleServer: async (id) => {
        const server = get().servers.find(s => s.id === id);
        if (!server) return;

        const newEnabled = !server.enabled;
        const runtime = getMCPRuntime();

        try {
          if (newEnabled) {
            // Enable: register with runtime
            await runtime.registerServer(server);
          } else {
            // Disable: unregister from runtime
            await runtime.unregisterServer(server.name);
          }

          // Update store
          set((state) => ({
            servers: state.servers.map(s =>
              s.id === id ? { ...s, enabled: newEnabled } : s
            ),
          }));
        } catch (error) {
          console.error(`Failed to toggle MCP server ${server.name}:`, error);
          throw error;
        }
      },

      getServer: (id) => {
        return get().servers.find(s => s.id === id) || null;
      },

      initializeRuntime: async () => {
        if (get().initialized) return;

        const runtime = getMCPRuntime();
        const servers = get().servers.filter(s => s.enabled);

        // Register all enabled servers
        for (const server of servers) {
          try {
            await runtime.registerServer(server);
          } catch (error) {
            console.error(`Failed to initialize MCP server ${server.name}:`, error);
            // Disable server in store
            set((state) => ({
              servers: state.servers.map(s =>
                s.id === server.id ? { ...s, enabled: false } : s
              ),
            }));
          }
        }

        set({ initialized: true });
      },
    }),
    {
      name: 'app-mcp-servers',
      version: 1,
      partialize: (state) => ({
        servers: state.servers,
      }),
    }
  )
);
