// app/api/leads/tax-calculator/route.ts
// Next.js 13+ App Router API Route for Tax Calculator Lead Capture

import { NextResponse } from 'next/server';

// Types
interface TaxCalculatorSubmission {
  email: string;
  revenue: '<20k' | '20k-60k' | '60k-150k' | '150k+';
  structure: 'sole-prop' | 'llc' | 'unknown';
  platform: 'shopify' | 'tiktok' | 'etsy' | 'whatnot' | 'other';
  estimatedSavings: {
    min: number;
    max: number;
  };
  calculatedData: {
    currentSETax: number;
    projectedSETax: number;
    profitEstimate: number;
    reasonableSalary: number;
  };
  source: string;
  timestamp: string;
}

interface EmailTemplateData {
  firstName: string;
  savingsMin: string;
  savingsMax: string;
  savingsAmount: string;
  platform: string;
  structure: string;
  calendarLink: string;
  startSmartLink: string;
}

// Platform display names
const PLATFORM_NAMES: Record<string, string> = {
  shopify: 'Shopify',
  tiktok: 'TikTok Shop',
  etsy: 'Etsy',
  whatnot: 'WhatNot',
  other: 'your platform',
};

// Structure display names
const STRUCTURE_NAMES: Record<string, string> = {
  'sole-prop': 'Sole Proprietor',
  llc: 'Single-Member LLC',
  unknown: 'unregistered seller',
};

// Extract first name from email (fallback to "there")
function extractFirstName(email: string): string {
  const localPart = email.split('@')[0];
  const nameMatch = localPart.match(/^([a-zA-Z]+)/);
  if (nameMatch && nameMatch[1].length > 2) {
    return nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase();
  }
  return 'there';
}

// Generate email template data
function generateEmailData(submission: TaxCalculatorSubmission): EmailTemplateData {
  return {
    firstName: extractFirstName(submission.email),
    savingsMin: submission.estimatedSavings.min.toLocaleString(),
    savingsMax: submission.estimatedSavings.max.toLocaleString(),
    savingsAmount: `${submission.estimatedSavings.min.toLocaleString()} – ${submission.estimatedSavings.max.toLocaleString()}`,
    platform: PLATFORM_NAMES[submission.platform] || 'your platform',
    structure: STRUCTURE_NAMES[submission.structure] || 'your current structure',
    calendarLink: process.env.CALENDLY_LINK || 'https://calendly.com/steven-morello-nextax',
    startSmartLink: process.env.STARTSMART_LINK || 'https://nextax.ai/startsmart',
  };
}

export async function POST(request: Request) {
  try {
    const submission: TaxCalculatorSubmission = await request.json();

    // Validate required fields
    if (!submission.email || !submission.revenue || !submission.platform) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(submission.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Generate email template data
    const emailData = generateEmailData(submission);

    // =============================================
    // 1. SAVE TO AIRTABLE
    // =============================================
    if (process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID) {
      try {
        const airtableResponse = await fetch(
          `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Tax%20Calculator%20Leads`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              records: [{
                fields: {
                  'Email': submission.email,
                  'First Name': emailData.firstName,
                  'Revenue Tier': submission.revenue,
                  'Structure': STRUCTURE_NAMES[submission.structure] || submission.structure,
                  'Platform': PLATFORM_NAMES[submission.platform] || submission.platform,
                  'Savings Min': submission.estimatedSavings.min,
                  'Savings Max': submission.estimatedSavings.max,
                  'Current SE Tax': submission.calculatedData.currentSETax,
                  'Projected SE Tax': submission.calculatedData.projectedSETax,
                  'Profit Estimate': submission.calculatedData.profitEstimate,
                  'Reasonable Salary': submission.calculatedData.reasonableSalary,
                  'Status': 'New',
                  'Source': submission.source || 'Tax Calculator',
                  'Created': new Date(submission.timestamp).toISOString(),
                }
              }]
            }),
          }
        );

        if (!airtableResponse.ok) {
          const errorText = await airtableResponse.text();
          console.error('Airtable error:', errorText);
        } else {
          console.log('Lead saved to Airtable:', submission.email);
        }
      } catch (airtableError) {
        console.error('Airtable integration error:', airtableError);
      }
    }

    // =============================================
    // 2. SEND EMAIL VIA SENDGRID
    // =============================================
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_TEMPLATE_ID) {
      try {
        const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: submission.email }],
              dynamic_template_data: {
                first_name: emailData.firstName,
                savings_min: emailData.savingsMin,
                savings_max: emailData.savingsMax,
                savings_amount: emailData.savingsAmount,
                platform: emailData.platform,
                structure: emailData.structure,
                calendar_link: emailData.calendarLink,
                startsmart_link: emailData.startSmartLink,
                current_se_tax: submission.calculatedData.currentSETax.toLocaleString(),
                projected_se_tax: submission.calculatedData.projectedSETax.toLocaleString(),
              },
            }],
            from: {
              email: process.env.SENDGRID_FROM_EMAIL || 'steve@nextax.ai',
              name: 'Steve Morello | NexTax.AI',
            },
            subject: `${emailData.platform} Seller Alert: $${emailData.savingsAmount} in Tax Savings Found`,
            template_id: process.env.SENDGRID_TEMPLATE_ID,
          }),
        });

        if (!sgResponse.ok) {
          const errorText = await sgResponse.text();
          console.error('SendGrid error:', errorText);
        } else {
          console.log('Email sent successfully to:', submission.email);
        }
      } catch (emailError) {
        console.error('SendGrid error:', emailError);
      }
    }

    // =============================================
    // 3. ADD TO HUBSPOT CRM
    // =============================================
    if (process.env.HUBSPOT_API_KEY) {
      try {
        const hubspotResponse = await fetch(
          'https://api.hubapi.com/crm/v3/objects/contacts',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
            },
            body: JSON.stringify({
              properties: {
                email: submission.email,
                firstname: emailData.firstName,
                tax_calculator_revenue: submission.revenue,
                tax_calculator_structure: submission.structure,
                tax_calculator_platform: submission.platform,
                estimated_tax_savings_min: submission.estimatedSavings.min,
                estimated_tax_savings_max: submission.estimatedSavings.max,
                lead_source: 'Tax Savings Calculator',
                lifecyclestage: 'lead',
              },
            }),
          }
        );

        if (!hubspotResponse.ok) {
          const errorText = await hubspotResponse.text();
          console.error('HubSpot error:', errorText);
        } else {
          console.log('Lead added to HubSpot:', submission.email);
        }
      } catch (hubspotError) {
        console.error('HubSpot integration error:', hubspotError);
      }
    }

    // =============================================
    // 4. SEND SLACK NOTIFICATION
    // =============================================
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🎯 New Tax Calculator Lead!`,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: '🎯 New Tax Calculator Lead!',
                  emoji: true,
                },
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Email:*\n${submission.email}` },
                  { type: 'mrkdwn', text: `*Platform:*\n${emailData.platform}` },
                  { type: 'mrkdwn', text: `*Revenue:*\n${submission.revenue}` },
                  { type: 'mrkdwn', text: `*Structure:*\n${emailData.structure}` },
                  { type: 'mrkdwn', text: `*Est. Savings:*\n$${emailData.savingsAmount}` },
                ],
              },
            ],
          }),
        });
        console.log('Slack notification sent');
      } catch (slackError) {
        console.error('Slack notification error:', slackError);
      }
    }

    // =============================================
    // SUCCESS RESPONSE
    // =============================================
    return NextResponse.json({
      success: true,
      message: 'Lead captured successfully',
      data: {
        email: submission.email,
        estimatedSavings: submission.estimatedSavings,
      },
    });

  } catch (error) {
    console.error('Tax calculator API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing/health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Tax Calculator Lead Capture',
    version: '1.0.0',
    integrations: {
      airtable: !!process.env.AIRTABLE_API_KEY,
      sendgrid: !!process.env.SENDGRID_API_KEY,
      hubspot: !!process.env.HUBSPOT_API_KEY,
      slack: !!process.env.SLACK_WEBHOOK_URL,
    },
  });
}

