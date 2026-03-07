/**
 * ProfilesManager - Singleton registry for managing profile handlers
 * Similar to conversation handlers management but for autonomous agent profiles
 */

import type { NepheshProfile } from '../nephesh.types';
import { ProfileHandler } from './ProfileHandler';

class ProfilesManager {
  private static instance: ProfilesManager;
  private handlers: Map<string, ProfileHandler> = new Map();

  private constructor() {}

  static getInstance(): ProfilesManager {
    if (!ProfilesManager.instance) {
      ProfilesManager.instance = new ProfilesManager();
    }
    return ProfilesManager.instance;
  }

  /**
   * Get or create handler for a profile
   */
  getHandler(profile: NepheshProfile): ProfileHandler {
    const existing = this.handlers.get(profile.id);
    if (existing) {
      // Update profile data in case it changed
      existing.updateProfile(profile);
      return existing;
    }

    const handler = new ProfileHandler(profile);
    this.handlers.set(profile.id, handler);
    return handler;
  }

  /**
   * Get handler by profile ID (if exists)
   */
  getHandlerById(profileId: string): ProfileHandler | null {
    return this.handlers.get(profileId) || null;
  }

  /**
   * Remove handler (e.g., when profile deleted)
   */
  removeHandler(profileId: string): void {
    const handler = this.handlers.get(profileId);
    if (handler && handler.isExecuting()) {
      handler.cancelExecution();
    }
    this.handlers.delete(profileId);
  }

  /**
   * Cancel all running executions
   */
  cancelAllExecutions(): void {
    for (const handler of this.handlers.values()) {
      if (handler.isExecuting()) {
        handler.cancelExecution();
      }
    }
  }

  /**
   * Get count of active handlers
   */
  getActiveCount(): number {
    let count = 0;
    for (const handler of this.handlers.values()) {
      if (handler.isExecuting()) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get all handler IDs
   */
  getAllHandlerIds(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Clear all handlers (for cleanup)
   */
  clear(): void {
    this.cancelAllExecutions();
    this.handlers.clear();
  }
}

// Export singleton instance
export const profilesManager = ProfilesManager.getInstance();
