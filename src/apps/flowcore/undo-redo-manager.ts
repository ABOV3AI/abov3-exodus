/**
 * Undo/Redo Manager for FlowCore Canvas
 * Tracks canvas state changes and enables undo/redo operations
 */

import type { Node, Edge } from 'reactflow';

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  timestamp: Date;
  action: string;
}

export class UndoRedoManager {
  private history: CanvasState[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number = 50;
  private isUndoingOrRedoing: boolean = false;

  /**
   * Save current canvas state
   */
  saveState(nodes: Node[], edges: Edge[], action: string = 'Edit') {
    // Don't save while undoing/redoing
    if (this.isUndoingOrRedoing) return;

    // Create new state
    const newState: CanvasState = {
      nodes: JSON.parse(JSON.stringify(nodes)), // Deep clone
      edges: JSON.parse(JSON.stringify(edges)), // Deep clone
      timestamp: new Date(),
      action,
    };

    // Remove any states after current index (when user makes new change after undo)
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new state
    this.history.push(newState);

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  /**
   * Undo to previous state
   */
  undo(): CanvasState | null {
    if (!this.canUndo()) return null;

    this.isUndoingOrRedoing = true;
    this.currentIndex--;
    const state = this.history[this.currentIndex];
    this.isUndoingOrRedoing = false;

    return state;
  }

  /**
   * Redo to next state
   */
  redo(): CanvasState | null {
    if (!this.canRedo()) return null;

    this.isUndoingOrRedoing = true;
    this.currentIndex++;
    const state = this.history[this.currentIndex];
    this.isUndoingOrRedoing = false;

    return state;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get current state
   */
  getCurrentState(): CanvasState | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.history.length) {
      return null;
    }
    return this.history[this.currentIndex];
  }

  /**
   * Get history summary
   */
  getHistory(): Array<{ index: number; action: string; timestamp: Date; isCurrent: boolean }> {
    return this.history.map((state, index) => ({
      index,
      action: state.action,
      timestamp: state.timestamp,
      isCurrent: index === this.currentIndex,
    }));
  }

  /**
   * Jump to specific state in history
   */
  jumpToState(index: number): CanvasState | null {
    if (index < 0 || index >= this.history.length) return null;

    this.isUndoingOrRedoing = true;
    this.currentIndex = index;
    const state = this.history[index];
    this.isUndoingOrRedoing = false;

    return state;
  }

  /**
   * Clear all history
   */
  clear() {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Get history count
   */
  getHistoryCount(): number {
    return this.history.length;
  }

  /**
   * Get current index
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }
}
