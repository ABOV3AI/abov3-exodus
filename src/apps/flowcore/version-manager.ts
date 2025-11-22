/**
 * Workflow Version Manager
 * Handles workflow versioning, snapshots, and history
 */

import type { Workflow } from './flowcore.types';

export interface WorkflowVersion {
  versionId: string;
  workflowId: string;
  version: number;
  timestamp: Date;
  snapshot: Workflow;
  changeDescription?: string;
  author?: string;
}

export interface VersionDiff {
  nodesAdded: number;
  nodesRemoved: number;
  nodesModified: number;
  edgesAdded: number;
  edgesRemoved: number;
  configChanges: string[];
}

export class WorkflowVersionManager {
  private versions: Map<string, WorkflowVersion[]> = new Map();
  private maxVersionsPerWorkflow: number = 50;

  /**
   * Create a new version snapshot
   */
  createVersion(workflow: Workflow, changeDescription?: string): WorkflowVersion {
    const workflowId = workflow.id;
    const versions = this.versions.get(workflowId) || [];

    const newVersion: WorkflowVersion = {
      versionId: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      version: versions.length + 1,
      timestamp: new Date(),
      snapshot: JSON.parse(JSON.stringify(workflow)), // Deep clone
      changeDescription,
    };

    versions.push(newVersion);

    // Limit number of versions
    if (versions.length > this.maxVersionsPerWorkflow) {
      versions.shift(); // Remove oldest
    }

    this.versions.set(workflowId, versions);

    return newVersion;
  }

  /**
   * Get all versions for a workflow
   */
  getVersions(workflowId: string): WorkflowVersion[] {
    return this.versions.get(workflowId) || [];
  }

  /**
   * Get a specific version
   */
  getVersion(workflowId: string, versionNumber: number): WorkflowVersion | null {
    const versions = this.versions.get(workflowId) || [];
    return versions.find(v => v.version === versionNumber) || null;
  }

  /**
   * Get the latest version
   */
  getLatestVersion(workflowId: string): WorkflowVersion | null {
    const versions = this.versions.get(workflowId) || [];
    return versions[versions.length - 1] || null;
  }

  /**
   * Restore a workflow to a specific version
   */
  restoreVersion(workflowId: string, versionNumber: number): Workflow | null {
    const version = this.getVersion(workflowId, versionNumber);
    if (!version) return null;

    // Return a deep clone of the snapshot
    return JSON.parse(JSON.stringify(version.snapshot));
  }

  /**
   * Compare two versions and get diff
   */
  compareVersions(workflowId: string, version1: number, version2: number): VersionDiff | null {
    const v1 = this.getVersion(workflowId, version1);
    const v2 = this.getVersion(workflowId, version2);

    if (!v1 || !v2) return null;

    const w1 = v1.snapshot;
    const w2 = v2.snapshot;

    // Compare nodes
    const nodes1 = new Set(w1.nodes.map(n => n.id));
    const nodes2 = new Set(w2.nodes.map(n => n.id));

    const nodesAdded = w2.nodes.filter(n => !nodes1.has(n.id)).length;
    const nodesRemoved = w1.nodes.filter(n => !nodes2.has(n.id)).length;

    // Count modified nodes
    let nodesModified = 0;
    const configChanges: string[] = [];

    for (const node2 of w2.nodes) {
      const node1 = w1.nodes.find(n => n.id === node2.id);
      if (node1 && JSON.stringify(node1) !== JSON.stringify(node2)) {
        nodesModified++;
        configChanges.push(`Node "${node2.data?.label || node2.id}" modified`);
      }
    }

    // Compare edges
    const edges1 = new Set(w1.edges.map(e => `${e.source}-${e.target}`));
    const edges2 = new Set(w2.edges.map(e => `${e.source}-${e.target}`));

    const edgesAdded = w2.edges.filter(e => !edges1.has(`${e.source}-${e.target}`)).length;
    const edgesRemoved = w1.edges.filter(e => !edges2.has(`${e.source}-${e.target}`)).length;

    // Check for workflow config changes
    if (w1.name !== w2.name) {
      configChanges.push(`Name changed: "${w1.name}" → "${w2.name}"`);
    }
    if (w1.description !== w2.description) {
      configChanges.push('Description changed');
    }
    if (JSON.stringify(w1.trigger) !== JSON.stringify(w2.trigger)) {
      configChanges.push('Trigger configuration changed');
    }

    return {
      nodesAdded,
      nodesRemoved,
      nodesModified,
      edgesAdded,
      edgesRemoved,
      configChanges,
    };
  }

  /**
   * Delete all versions for a workflow
   */
  deleteVersions(workflowId: string) {
    this.versions.delete(workflowId);
  }

  /**
   * Get version count for a workflow
   */
  getVersionCount(workflowId: string): number {
    return (this.versions.get(workflowId) || []).length;
  }

  /**
   * Export version history to JSON
   */
  exportVersionHistory(workflowId: string): string {
    const versions = this.versions.get(workflowId) || [];
    return JSON.stringify(versions, null, 2);
  }

  /**
   * Import version history from JSON
   */
  importVersionHistory(json: string): boolean {
    try {
      const versions: WorkflowVersion[] = JSON.parse(json);
      if (!Array.isArray(versions) || versions.length === 0) return false;

      const workflowId = versions[0].workflowId;
      this.versions.set(workflowId, versions);
      return true;
    } catch (error) {
      console.error('Failed to import version history:', error);
      return false;
    }
  }

  /**
   * Clear all version history
   */
  clearAll() {
    this.versions.clear();
  }
}

// Singleton instance
export const versionManager = new WorkflowVersionManager();
