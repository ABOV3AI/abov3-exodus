import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge, NodeChange, EdgeChange, Connection, applyNodeChanges as applyNodeChangesType, applyEdgeChanges as applyEdgeChangesType } from 'reactflow';
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';

import type { Workflow } from './flowcore.types';
import { createIDBPersistStorage } from '~/common/util/idbUtils';

// Generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export interface FlowCoreStore {
  // All workflows
  workflows: Workflow[];

  // Currently selected workflow
  currentWorkflowId: string | null;

  // Current canvas state (for active workflow)
  nodes: Node[];
  edges: Edge[];

  // Selected node for properties panel
  selectedNodeId: string | null;

  // Workflow management actions
  createWorkflow: (name: string) => string;
  deleteWorkflow: (id: string) => void;
  duplicateWorkflow: (id: string) => void;
  selectWorkflow: (id: string) => void;
  saveCurrentWorkflow: () => void;
  updateWorkflowName: (id: string, name: string) => void;

  // Canvas actions
  addNode: (node: Node) => void;
  updateNode: (id: string, data: Partial<Node>) => void;
  deleteNode: (id: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;

  // Edge actions
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Selection
  selectNode: (id: string | null) => void;

  // Execution
  runWorkflow: (id: string) => Promise<void>;
}

export const useFlowCoreStore = create<FlowCoreStore>()(
  persist(
    (set, get) => ({
      workflows: [],
      currentWorkflowId: null,
      nodes: [],
      edges: [],
      selectedNodeId: null,

      createWorkflow: (name: string) => {
        const id = generateId();
        const newWorkflow: Workflow = {
          id,
          name,
          description: '',
          tags: [],
          nodes: [],
          edges: [],
          trigger: { type: 'manual' },
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          executions: [],
        };

        set((state) => ({
          workflows: [...state.workflows, newWorkflow],
          currentWorkflowId: id,
          nodes: [],
          edges: [],
          selectedNodeId: null,
        }));

        return id;
      },

      deleteWorkflow: (id: string) => {
        set((state) => ({
          workflows: state.workflows.filter((w) => w.id !== id),
          currentWorkflowId: state.currentWorkflowId === id ? null : state.currentWorkflowId,
          nodes: state.currentWorkflowId === id ? [] : state.nodes,
          edges: state.currentWorkflowId === id ? [] : state.edges,
        }));
      },

      duplicateWorkflow: (id: string) => {
        const workflow = get().workflows.find((w) => w.id === id);
        if (!workflow) return;

        const newId = generateId();
        const duplicatedWorkflow: Workflow = {
          ...workflow,
          id: newId,
          name: `${workflow.name} (Copy)`,
          createdAt: new Date(),
          updatedAt: new Date(),
          executions: [],
        };

        set((state) => ({
          workflows: [...state.workflows, duplicatedWorkflow],
        }));
      },

      selectWorkflow: (id: string) => {
        const workflow = get().workflows.find((w) => w.id === id);
        if (workflow) {
          set({
            currentWorkflowId: id,
            nodes: workflow.nodes,
            edges: workflow.edges,
            selectedNodeId: null,
          });
        }
      },

      saveCurrentWorkflow: () => {
        const { currentWorkflowId, nodes, edges, workflows } = get();
        if (!currentWorkflowId) return;

        set({
          workflows: workflows.map((w) =>
            w.id === currentWorkflowId
              ? { ...w, nodes, edges, updatedAt: new Date() }
              : w
          ),
        });
      },

      updateWorkflowName: (id: string, name: string) => {
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === id ? { ...w, name, updatedAt: new Date() } : w
          ),
        }));
      },

      // Canvas node actions
      addNode: (node: Node) => {
        set((state) => ({
          nodes: [...state.nodes, node],
        }));
        get().saveCurrentWorkflow();
      },

      updateNode: (id: string, data: Partial<Node>) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, ...data } : node
          ),
        }));
        get().saveCurrentWorkflow();
      },

      deleteNode: (id: string) => {
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== id),
          edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        }));
        get().saveCurrentWorkflow();
      },

      onNodesChange: (changes: NodeChange[]) => {
        set((state) => ({
          nodes: applyNodeChanges(changes, state.nodes),
        }));
        get().saveCurrentWorkflow();
      },

      // Canvas edge actions
      onEdgesChange: (changes: EdgeChange[]) => {
        set((state) => ({
          edges: applyEdgeChanges(changes, state.edges),
        }));
        get().saveCurrentWorkflow();
      },

      onConnect: (connection: Connection) => {
        set((state) => ({
          edges: addEdge(connection, state.edges),
        }));
        get().saveCurrentWorkflow();
      },

      // Selection
      selectNode: (id: string | null) => {
        set({ selectedNodeId: id });
      },

      // Execution (placeholder)
      runWorkflow: async (id: string) => {
        console.log('Running workflow:', id);
        // TODO: Implement execution logic
      },
    }),
    {
      name: 'app-flowcore',
      storage: createIDBPersistStorage(),
      version: 1,
      partialize: (state) => ({
        workflows: state.workflows,
      }),
    }
  )
);
