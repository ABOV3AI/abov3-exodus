/**
 * Keyboard Shortcuts Hook for FlowCore
 * Provides common keyboard shortcuts for workflow editing
 */

import * as React from 'react';

export interface KeyboardShortcuts {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
  onRun?: () => void;
  onNewWorkflow?: () => void;
  onFind?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts, enabled: boolean = true) {
  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey, altKey } = event;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? metaKey : ctrlKey;

      // Ctrl/Cmd + S: Save
      if (modKey && key === 's' && shortcuts.onSave) {
        event.preventDefault();
        shortcuts.onSave();
        return;
      }

      // Ctrl/Cmd + Z: Undo
      if (modKey && !shiftKey && key === 'z' && shortcuts.onUndo) {
        event.preventDefault();
        shortcuts.onUndo();
        return;
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
      if (((modKey && shiftKey && key === 'z') || (modKey && key === 'y')) && shortcuts.onRedo) {
        event.preventDefault();
        shortcuts.onRedo();
        return;
      }

      // Delete or Backspace: Delete selected
      if ((key === 'Delete' || key === 'Backspace') && shortcuts.onDelete) {
        // Only if not typing in an input
        if (!isTypingInInput(event.target)) {
          event.preventDefault();
          shortcuts.onDelete();
          return;
        }
      }

      // Ctrl/Cmd + A: Select All
      if (modKey && key === 'a' && shortcuts.onSelectAll) {
        event.preventDefault();
        shortcuts.onSelectAll();
        return;
      }

      // Ctrl/Cmd + C: Copy
      if (modKey && key === 'c' && shortcuts.onCopy) {
        if (!isTypingInInput(event.target)) {
          event.preventDefault();
          shortcuts.onCopy();
          return;
        }
      }

      // Ctrl/Cmd + V: Paste
      if (modKey && key === 'v' && shortcuts.onPaste) {
        if (!isTypingInInput(event.target)) {
          event.preventDefault();
          shortcuts.onPaste();
          return;
        }
      }

      // Ctrl/Cmd + D: Duplicate
      if (modKey && key === 'd' && shortcuts.onDuplicate) {
        event.preventDefault();
        shortcuts.onDuplicate();
        return;
      }

      // Ctrl/Cmd + Enter: Run workflow
      if (modKey && key === 'Enter' && shortcuts.onRun) {
        event.preventDefault();
        shortcuts.onRun();
        return;
      }

      // Ctrl/Cmd + N: New workflow
      if (modKey && key === 'n' && shortcuts.onNewWorkflow) {
        event.preventDefault();
        shortcuts.onNewWorkflow();
        return;
      }

      // Ctrl/Cmd + F: Find
      if (modKey && key === 'f' && shortcuts.onFind) {
        event.preventDefault();
        shortcuts.onFind();
        return;
      }

      // Ctrl/Cmd + Plus: Zoom In
      if (modKey && (key === '=' || key === '+') && shortcuts.onZoomIn) {
        event.preventDefault();
        shortcuts.onZoomIn();
        return;
      }

      // Ctrl/Cmd + Minus: Zoom Out
      if (modKey && key === '-' && shortcuts.onZoomOut) {
        event.preventDefault();
        shortcuts.onZoomOut();
        return;
      }

      // Ctrl/Cmd + 0: Reset Zoom
      if (modKey && key === '0' && shortcuts.onZoomReset) {
        event.preventDefault();
        shortcuts.onZoomReset();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enabled]);
}

/**
 * Check if user is typing in an input field
 */
function isTypingInInput(target: EventTarget | null): boolean {
  if (!target) return false;
  const element = target as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    element.isContentEditable
  );
}

/**
 * Get keyboard shortcut display text
 */
export function getShortcutText(action: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const mod = isMac ? '⌘' : 'Ctrl';

  const shortcuts: Record<string, string> = {
    save: `${mod}+S`,
    undo: `${mod}+Z`,
    redo: isMac ? `${mod}+Shift+Z` : `${mod}+Y`,
    delete: 'Del',
    selectAll: `${mod}+A`,
    copy: `${mod}+C`,
    paste: `${mod}+V`,
    duplicate: `${mod}+D`,
    run: `${mod}+Enter`,
    newWorkflow: `${mod}+N`,
    find: `${mod}+F`,
    zoomIn: `${mod}++`,
    zoomOut: `${mod}+-`,
    zoomReset: `${mod}+0`,
  };

  return shortcuts[action] || '';
}
