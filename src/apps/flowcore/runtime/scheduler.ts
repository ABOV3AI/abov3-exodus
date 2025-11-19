import cron from 'node-cron';
import type { Workflow } from '../flowcore.types';

interface ScheduledWorkflow {
  workflowId: string;
  cronExpression: string;
  task: cron.ScheduledTask;
}

export class WorkflowScheduler {
  private scheduledWorkflows: Map<string, ScheduledWorkflow> = new Map();
  private onWorkflowTrigger?: (workflowId: string) => Promise<void>;

  constructor(onWorkflowTrigger?: (workflowId: string) => Promise<void>) {
    this.onWorkflowTrigger = onWorkflowTrigger;
  }

  /**
   * Schedule a workflow to run on a cron schedule
   */
  scheduleWorkflow(workflow: Workflow): boolean {
    if (workflow.trigger.type !== 'schedule' || !workflow.trigger.schedule) {
      return false;
    }

    const cronExpression = workflow.trigger.schedule;

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      console.error(`Invalid cron expression: ${cronExpression}`);
      return false;
    }

    // Remove existing schedule if any
    this.unscheduleWorkflow(workflow.id);

    try {
      // Create new cron task
      const task = cron.schedule(cronExpression, async () => {
        console.log(`Cron trigger: Executing workflow ${workflow.id} (${workflow.name})`);
        if (this.onWorkflowTrigger) {
          await this.onWorkflowTrigger(workflow.id);
        }
      }, {
        scheduled: true,
      });

      this.scheduledWorkflows.set(workflow.id, {
        workflowId: workflow.id,
        cronExpression,
        task,
      });

      console.log(`Scheduled workflow ${workflow.id} with cron: ${cronExpression}`);
      return true;

    } catch (error) {
      console.error(`Failed to schedule workflow ${workflow.id}:`, error);
      return false;
    }
  }

  /**
   * Unschedule a workflow
   */
  unscheduleWorkflow(workflowId: string): boolean {
    const scheduled = this.scheduledWorkflows.get(workflowId);
    if (scheduled) {
      scheduled.task.stop();
      this.scheduledWorkflows.delete(workflowId);
      console.log(`Unscheduled workflow ${workflowId}`);
      return true;
    }
    return false;
  }

  /**
   * Get all scheduled workflows
   */
  getScheduledWorkflows(): ScheduledWorkflow[] {
    return Array.from(this.scheduledWorkflows.values());
  }

  /**
   * Check if a workflow is scheduled
   */
  isScheduled(workflowId: string): boolean {
    return this.scheduledWorkflows.has(workflowId);
  }

  /**
   * Update all workflows (re-schedule based on isActive flag)
   */
  updateSchedules(workflows: Workflow[]): void {
    // Unschedule all inactive workflows
    workflows.forEach(workflow => {
      if (!workflow.isActive && this.isScheduled(workflow.id)) {
        this.unscheduleWorkflow(workflow.id);
      }
    });

    // Schedule all active workflows with schedule triggers
    workflows.forEach(workflow => {
      if (workflow.isActive && workflow.trigger.type === 'schedule') {
        this.scheduleWorkflow(workflow);
      }
    });
  }

  /**
   * Cleanup - stop all scheduled tasks
   */
  destroy(): void {
    this.scheduledWorkflows.forEach((scheduled) => {
      scheduled.task.stop();
    });
    this.scheduledWorkflows.clear();
    console.log('Workflow scheduler destroyed');
  }
}

// Helper: Common cron patterns
export const CRON_PRESETS = {
  'Every minute': '* * * * *',
  'Every 5 minutes': '*/5 * * * *',
  'Every 15 minutes': '*/15 * * * *',
  'Every 30 minutes': '*/30 * * * *',
  'Every hour': '0 * * * *',
  'Every day at midnight': '0 0 * * *',
  'Every day at 9am': '0 9 * * *',
  'Every Monday at 9am': '0 9 * * 1',
  'Every weekday at 9am': '0 9 * * 1-5',
  'Every Sunday at midnight': '0 0 * * 0',
};

// Helper: Parse cron expression to human-readable text
export function cronToHuman(cronExpression: string): string {
  const preset = Object.entries(CRON_PRESETS).find(([_, expr]) => expr === cronExpression);
  if (preset) {
    return preset[0];
  }

  // Basic parsing
  const parts = cronExpression.split(' ');
  if (parts.length !== 5) return cronExpression;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  let text = '';

  // Frequency
  if (minute === '*') text = 'Every minute';
  else if (minute.startsWith('*/')) text = `Every ${minute.slice(2)} minutes`;
  else if (hour === '*') text = `Every hour at minute ${minute}`;
  else text = `At ${hour}:${minute.padStart(2, '0')}`;

  // Day specification
  if (dayOfWeek !== '*') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (dayOfWeek.includes('-')) {
      const [start, end] = dayOfWeek.split('-').map(Number);
      text += ` on ${days[start]}-${days[end]}`;
    } else {
      text += ` on ${days[Number(dayOfWeek)]}`;
    }
  } else if (dayOfMonth !== '*') {
    text += ` on day ${dayOfMonth} of the month`;
  }

  return text;
}
