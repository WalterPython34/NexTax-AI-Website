import { db } from "./db";
import { complianceTasks, businessCompliance } from "@shared/schema";
import { eq, and, lt, isNull, or } from "drizzle-orm";
import { sendReminderEmail } from "./email-service";

export class ComplianceScheduler {
  
  // Run this function daily via cron job or scheduled task
  async processRecurringTasks(): Promise<void> {
    console.log("🔄 Processing recurring compliance tasks...");
    
    try {
      await this.rolloverDueDates();
      await this.sendReminderEmails();
      console.log("✅ Compliance task processing completed");
    } catch (error) {
      console.error("❌ Error processing compliance tasks:", error);
      throw error;
    }
  }

  // Roll over due dates for recurring tasks
  private async rolloverDueDates(): Promise<void> {
    const today = new Date();
    
    // Find recurring tasks where due date has passed
    const overdueRecurringTasks = await db
      .select()
      .from(complianceTasks)
      .where(
        and(
          eq(complianceTasks.isRecurring, true),
          lt(complianceTasks.dueDate, today),
          or(
            eq(complianceTasks.status, "completed"),
            eq(complianceTasks.status, "overdue")
          )
        )
      );

    console.log(`📅 Found ${overdueRecurringTasks.length} recurring tasks to roll over`);

    for (const task of overdueRecurringTasks) {
      const newDueDate = this.calculateNextDueDate(task.dueDate!, task.recurringPattern!);
      
      if (newDueDate) {
        // Update the task with new due date and reset status
        await db
          .update(complianceTasks)
          .set({
            dueDate: newDueDate,
            nextDueDate: newDueDate,
            status: "pending",
            reminderSent: false,
            lastReminderSent: null,
            completedAt: null,
            updatedAt: new Date()
          })
          .where(eq(complianceTasks.id, task.id));

        console.log(`📆 Rolled over task "${task.taskName}" to ${newDueDate.toISOString().split('T')[0]}`);
      }
    }
  }

  // Calculate next due date based on recurring pattern
  private calculateNextDueDate(currentDueDate: Date, pattern: string): Date | null {
    const nextDate = new Date(currentDueDate);
    
    switch (pattern.toLowerCase()) {
      case 'annually':
      case 'annual':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'semi-annually':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      default:
        console.warn(`Unknown recurring pattern: ${pattern}`);
        return null;
    }
    
    return nextDate;
  }

  // Send reminder emails to Pro/Premium users
  private async sendReminderEmails(): Promise<void> {
    const today = new Date();
    
    // Get all business compliance profiles with email reminders enabled
    const complianceProfiles = await db
      .select()
      .from(businessCompliance)
      .where(eq(businessCompliance.emailRemindersEnabled, true));

    console.log(`📧 Checking reminder emails for ${complianceProfiles.length} compliance profiles`);

    for (const profile of complianceProfiles) {
      const reminderDate = new Date();
      reminderDate.setDate(today.getDate() + (profile.reminderDaysBefore || 30));

      // Find tasks due within reminder window that haven't had reminders sent
      const tasksNeedingReminders = await db
        .select()
        .from(complianceTasks)
        .where(
          and(
            eq(complianceTasks.userId, profile.userId),
            eq(complianceTasks.complianceId, profile.id),
            lt(complianceTasks.dueDate, reminderDate),
            eq(complianceTasks.reminderSent, false),
            or(
              eq(complianceTasks.status, "pending"),
              eq(complianceTasks.status, "in_progress")
            )
          )
        );

      if (tasksNeedingReminders.length > 0) {
        await this.sendBatchReminder(profile.userId, tasksNeedingReminders);
        
        // Mark reminders as sent
        for (const task of tasksNeedingReminders) {
          await db
            .update(complianceTasks)
            .set({
              reminderSent: true,
              lastReminderSent: today
            })
            .where(eq(complianceTasks.id, task.id));
        }
      }
    }
  }

  // Send batch reminder email for multiple tasks
  private async sendBatchReminder(userId: string, tasks: any[]): Promise<void> {
    try {
      // Get user details from your user storage
      const userEmail = await this.getUserEmail(userId);
      if (!userEmail) {
        console.warn(`No email found for user ${userId}`);
        return;
      }

      await sendReminderEmail(userEmail, tasks);
      console.log(`📨 Sent reminder email to ${userEmail} for ${tasks.length} tasks`);
    } catch (error) {
      console.error(`Failed to send reminder email for user ${userId}:`, error);
    }
  }

  // Helper to get user email from storage
  private async getUserEmail(userId: string): Promise<string | null> {
    const { storage } = await import('./storage');
    return await storage.getUserEmail(userId);
  }

  // Manually trigger rollover for testing
  async manualRollover(taskId: string): Promise<void> {
    const task = await db
      .select()
      .from(complianceTasks)
      .where(eq(complianceTasks.id, taskId))
      .limit(1);

    if (task.length === 0 || !task[0].isRecurring) {
      throw new Error("Task not found or not recurring");
    }

    const nextDueDate = this.calculateNextDueDate(task[0].dueDate!, task[0].recurringPattern!);
    
    if (nextDueDate) {
      await db
        .update(complianceTasks)
        .set({
          dueDate: nextDueDate,
          nextDueDate: nextDueDate,
          status: "pending",
          reminderSent: false,
          lastReminderSent: null,
          completedAt: null,
          updatedAt: new Date()
        })
        .where(eq(complianceTasks.id, taskId));
    }
  }
}

export const complianceScheduler = new ComplianceScheduler();