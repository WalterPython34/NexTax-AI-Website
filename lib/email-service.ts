import { MailService } from "@sendgrid/mail"

// Initialize SendGrid if API key is available
let mailService: MailService | null = null

if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService()
  mailService.setApiKey(process.env.SENDGRID_API_KEY)
} else {
  console.warn("SENDGRID_API_KEY not configured - email reminders will be logged only")
}

interface TaskReminder {
  id: string
  taskName: string
  description: string
  dueDate: Date
  category: string
  priority: string
}

export async function sendReminderEmail(userEmail: string, tasks: TaskReminder[]): Promise<boolean> {
  if (!mailService) {
    // Log reminder instead of sending email if SendGrid not configured
    console.log(`📧 EMAIL REMINDER LOG for ${userEmail}:`)
    console.log(`📅 ${tasks.length} compliance tasks due soon:`)
    tasks.forEach((task) => {
      const daysUntilDue = Math.ceil((task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      console.log(`   • ${task.taskName} (Due in ${daysUntilDue} days - ${task.dueDate.toDateString()})`)
    })
    return true
  }

  try {
    const subject = `🚨 StartSmart: ${tasks.length} Compliance ${tasks.length === 1 ? "Task" : "Tasks"} Due Soon`

    const taskList = tasks
      .map((task) => {
        const daysUntilDue = Math.ceil((task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        const urgencyColor = daysUntilDue <= 7 ? "#dc2626" : daysUntilDue <= 14 ? "#ea580c" : "#059669"

        return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
            <strong style="color: #1f2937;">${task.taskName}</strong>
            <br>
            <span style="color: #6b7280; font-size: 14px;">${task.description}</span>
          </td>
          <td style="padding: 12px; text-align: center; border-right: 1px solid #e5e7eb;">
            <span style="background-color: ${urgencyColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
              ${task.priority.toUpperCase()}
            </span>
          </td>
          <td style="padding: 12px; text-align: center; color: ${urgencyColor}; font-weight: bold;">
            ${daysUntilDue > 0 ? `${daysUntilDue} days` : "OVERDUE"}
          </td>
          <td style="padding: 12px; text-align: center; color: #4b5563;">
            ${task.dueDate.toLocaleDateString()}
          </td>
        </tr>
      `
      })
      .join("")

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>StartSmart Compliance Reminder</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #10b981; margin: 0; font-size: 28px;">StartSmart</h1>
        <p style="color: #6b7280; margin: 5px 0 0 0;">by NexTax.AI</p>
      </div>

      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h2 style="color: #92400e; margin: 0 0 8px 0; font-size: 18px;">⚠️ Compliance Reminder</h2>
        <p style="color: #92400e; margin: 0;">You have ${tasks.length} compliance ${tasks.length === 1 ? "task" : "tasks"} due soon. Stay on top of your business requirements!</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 12px; text-align: left; color: #374151; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Task</th>
            <th style="padding: 12px; text-align: center; color: #374151; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Priority</th>
            <th style="padding: 12px; text-align: center; color: #374151; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Time Left</th>
            <th style="padding: 12px; text-align: center; color: #374151; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Due Date</th>
          </tr>
        </thead>
        <tbody>
          ${taskList}
        </tbody>
      </table>

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="https://startsmart.nextax.ai" 
           style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          View Full Compliance Center
        </a>
      </div>

      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h3 style="color: #374151; margin: 0 0 8px 0; font-size: 16px;">💡 Pro Tip</h3>
        <p style="color: #6b7280; margin: 0; font-size: 14px;">
          Set up automatic document generation in your StartSmart Document Center to streamline these compliance tasks!
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

      <div style="text-align: center; color: #6b7280; font-size: 12px;">
        <p style="margin: 0 0 8px 0;">This is an automated reminder from StartSmart by NexTax.AI</p>
        <p style="margin: 0 0 8px 0;">
          <a href="https://startsmart.nextax.ai/settings" style="color: #10b981; text-decoration: none;">Manage email preferences</a> | 
          <a href="https://www.nextax.ai/contact" style="color: #10b981; text-decoration: none;">Contact support</a>
        </p>
        <p style="margin: 0;">© 2025 NexTax.AI. All rights reserved.</p>
      </div>

    </body>
    </html>
    `

    const textContent = `
StartSmart Compliance Reminder

You have ${tasks.length} compliance ${tasks.length === 1 ? "task" : "tasks"} due soon:

${tasks
  .map((task) => {
    const daysUntilDue = Math.ceil((task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return `• ${task.taskName} - Due in ${daysUntilDue > 0 ? `${daysUntilDue} days` : "OVERDUE"} (${task.dueDate.toDateString()})`
  })
  .join("\n")}

View your full compliance center: https://startsmart.nextax.ai

This is an automated reminder from StartSmart by NexTax.AI
Manage preferences: https://startsmart.nextax.ai/settings
    `

    await mailService.send({
      to: userEmail,
      from: {
        email: "noreply@nextax.ai",
        name: "StartSmart by NexTax.AI",
      },
      subject,
      text: textContent,
      html: htmlContent,
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
      },
    })

    return true
  } catch (error) {
    console.error("SendGrid email error:", error)
    return false
  }
}

// Test function to send a sample reminder
export async function sendTestReminder(userEmail: string): Promise<boolean> {
  const sampleTasks = [
    {
      id: "test-1",
      taskName: "Federal Estimated Tax Payment - Q1",
      description: "Submit quarterly estimated tax payment",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      category: "tax",
      priority: "high",
    },
    {
      id: "test-2",
      taskName: "State Annual Report Filing",
      description: "File annual report with state of formation",
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
      category: "legal",
      priority: "medium",
    },
  ]

  return await sendReminderEmail(userEmail, sampleTasks)
}
