import { storage } from "./storage";

export interface LeadData {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  createdAt: Date;
  source: string; // 'replit-auth', 'manual', etc.
}

export class LeadTrackingService {
  
  // Send email notification for new user registration
  async sendNewUserNotification(leadData: LeadData): Promise<void> {
    try {
      // Email notification via webhook or email service
      await this.sendEmailNotification(leadData);
      
      // Add to Google Sheets
      await this.addToGoogleSheets(leadData);
      
      console.log(`✅ Lead tracking completed for user: ${leadData.email}`);
    } catch (error) {
      console.error('❌ Lead tracking failed:', error);
      // Don't throw - we don't want user registration to fail if lead tracking fails
    }
  }

  private async sendEmailNotification(leadData: LeadData): Promise<void> {
    const webhookUrl = process.env.LEAD_NOTIFICATION_WEBHOOK;
    const emailRecipient = process.env.LEAD_NOTIFICATION_EMAIL || 'nextax.ai@gmail.com';
    
    const emailContent = {
      to: emailRecipient,
      subject: '🚀 New StartSmart User Registration',
      html: `
        <h2>New User Registration</h2>
        <p><strong>Email:</strong> ${leadData.email}</p>
        <p><strong>Name:</strong> ${leadData.firstName || ''} ${leadData.lastName || ''}</p>
        <p><strong>User ID:</strong> ${leadData.userId}</p>
        <p><strong>Registration Date:</strong> ${leadData.createdAt.toLocaleString()}</p>
        <p><strong>Source:</strong> ${leadData.source}</p>
        ${leadData.profileImageUrl ? `<p><strong>Profile Image:</strong> <img src="${leadData.profileImageUrl}" width="50" height="50" style="border-radius: 50%;"></p>` : ''}
        <p><em>This lead has been automatically added to your Google Sheets tracking.</em></p>
      `,
      text: `
        New StartSmart User Registration
        
        Email: ${leadData.email}
        Name: ${leadData.firstName || ''} ${leadData.lastName || ''}
        User ID: ${leadData.userId}
        Registration Date: ${leadData.createdAt.toLocaleString()}
        Source: ${leadData.source}
      `
    };

    // Option 1: Use webhook for email service (Zapier, Make.com, etc.)
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailContent)
      });
    }

    // Option 2: Use SendGrid if API key is available
    if (process.env.SENDGRID_API_KEY) {
      await this.sendViaSendGrid(emailContent);
    }
  }

  private async sendViaSendGrid(emailContent: any): Promise<void> {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: emailContent.to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@startsmart.nextax.ai',
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    };

    await sgMail.send(msg);
  }

  private async addToGoogleSheets(leadData: LeadData): Promise<void> {
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK;
    
    if (!webhookUrl) {
      console.log('No Google Sheets webhook configured, skipping...');
      return;
    }

    const sheetData = {
      timestamp: leadData.createdAt.toISOString(),
      email: leadData.email,
      firstName: leadData.firstName || '',
      lastName: leadData.lastName || '',
      userId: leadData.userId,
      source: leadData.source,
      profileImage: leadData.profileImageUrl || '',
      fullName: `${leadData.firstName || ''} ${leadData.lastName || ''}`.trim()
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sheetData)
    });
  }

  // Manual lead addition endpoint
  async addManualLead(email: string, firstName?: string, lastName?: string): Promise<void> {
    const leadData: LeadData = {
      userId: `manual-${Date.now()}`,
      email,
      firstName,
      lastName,
      createdAt: new Date(),
      source: 'manual-entry'
    };

    await this.sendNewUserNotification(leadData);
  }
}

export const leadTracking = new LeadTrackingService();