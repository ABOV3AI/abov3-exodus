import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge, NodeChange, EdgeChange, Connection } from 'reactflow';
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';

import type { Workflow, ExecutionContext, TriggerConfig } from './flowcore.types';
import { createIDBPersistStorage } from '~/common/util/idbUtils';
import { WorkflowExecutor } from './runtime/executor';
import { WorkflowScheduler } from './runtime/scheduler';

// Generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export interface FlowCoreStoreEnhanced {
  // All workflows
  workflows: Workflow[];

  // Currently selected workflow
  currentWorkflowId: string | null;

  // Current canvas state (for active workflow)
  nodes: Node[];
  edges: Edge[];

  // Selected node for properties panel
  selectedNodeId: string | null;

  // Execution state
  executionContext: ExecutionContext | null;
  isExecuting: boolean;

  // Scheduler instance (not persisted)
  _scheduler: WorkflowScheduler | null;

  // Workflow management actions
  createWorkflow: (name: string) => string;
  deleteWorkflow: (id: string) => void;
  duplicateWorkflow: (id: string) => void;
  selectWorkflow: (id: string) => void;
  saveCurrentWorkflow: () => void;
  updateWorkflowName: (id: string, name: string) => void;
  updateWorkflowTrigger: (id: string, trigger: TriggerConfig) => void;
  toggleWorkflowActive: (id: string) => void;
  importWorkflow: (workflowJson: string) => boolean;
  exportWorkflow: (id: string) => string | null;

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
  stopExecution: () => void;

  // Scheduler
  initializeScheduler: () => void;
  updateSchedules: () => void;
}

export const useFlowCoreStoreEnhanced = create<FlowCoreStoreEnhanced>()(
  persist(
    (set, get) => ({
      workflows: [],
      currentWorkflowId: null,
      nodes: [],
      edges: [],
      selectedNodeId: null,
      executionContext: null,
      isExecuting: false,
      _scheduler: null,

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
        // Unschedule if scheduled
        const scheduler = get()._scheduler;
        if (scheduler) {
          scheduler.unscheduleWorkflow(id);
        }

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
          isActive: false, // Copies are inactive by default
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

      updateWorkflowTrigger: (id: string, trigger: TriggerConfig) => {
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === id ? { ...w, trigger, updatedAt: new Date() } : w
          ),
        }));

        // Update schedules
        get().updateSchedules();
      },

      toggleWorkflowActive: (id: string) => {
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === id ? { ...w, isActive: !w.isActive, updatedAt: new Date() } : w
          ),
        }));

        // Update schedules
        get().updateSchedules();
      },

      importWorkflow: (workflowJson: string) => {
        try {
          const imported = JSON.parse(workflowJson);
          const newId = generateId();

          const newWorkflow: Workflow = {
            ...imported,
            id: newId,
            isActive: false, // Imported workflows are inactive by default
            createdAt: new Date(),
            updatedAt: new Date(),
            executions: [],
          };

          set((state) => ({
            workflows: [...state.workflows, newWorkflow],
          }));

          return true;
        } catch (error) {
          console.error('Failed to import workflow:', error);
          return false;
        }
      },

      exportWorkflow: (id: string) => {
        const workflow = get().workflows.find((w) => w.id === id);
        if (!workflow) return null;

        // Create export object without executions
        const exportData = {
          ...workflow,
          executions: [],
        };

        return JSON.stringify(exportData, null, 2);
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

      // Execution
      runWorkflow: async (id: string) => {
        const workflow = get().workflows.find((w) => w.id === id);
        if (!workflow) {
          console.error(`Workflow ${id} not found`);
          return;
        }

        set({ isExecuting: true, executionContext: null });

        try {
          const executor = new WorkflowExecutor((context) => {
            set({ executionContext: context });
          });

          const execution = await executor.executeWorkflow(
            workflow.id,
            workflow.nodes,
            workflow.edges
          );

          // Add execution to workflow history
          set((state) => ({
            workflows: state.workflows.map((w) =>
              w.id === id
                ? {
                    ...w,
                    executions: [execution, ...w.executions].slice(0, 50), // Keep last 50
                    lastRun: execution.endTime,
                  }
                : w
            ),
            isExecuting: false,
          }));

          console.log('Workflow execution completed:', execution);

        } catch (error: any) {
          console.error('Workflow execution failed:', error);
          set({ isExecuting: false });
        }
      },

      stopExecution: () => {
        set({ isExecuting: false, executionContext: null });
      },

      // Scheduler
      initializeScheduler: () => {
        if (get()._scheduler) return;

        const scheduler = new WorkflowScheduler(async (workflowId) => {
          await get().runWorkflow(workflowId);
        });

        set({ _scheduler: scheduler });

        // Schedule all active workflows
        get().updateSchedules();
      },

      updateSchedules: () => {
        const scheduler = get()._scheduler;
        if (!scheduler) return;

        const workflows = get().workflows;
        scheduler.updateSchedules(workflows);
      },
    }),
    {
      name: 'app-flowcore-enhanced',
      storage: createIDBPersistStorage(),
      version: 1,
      partialize: (state) => ({
        workflows: state.workflows,
      }),
    }
  )
);
