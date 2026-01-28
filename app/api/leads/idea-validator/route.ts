// app/api/leads/idea-validator/route.ts
// API Route for Idea Validator Lead Capture

import { NextResponse } from 'next/server';

interface IdeaValidatorSubmission {
  firstName: string;
  email: string;
  source: string;
  timestamp: string;
}

export async function POST(request: Request) {
  try {
    const submission: IdeaValidatorSubmission = await request.json();

    // Validate required fields
    if (!submission.email || !submission.firstName) {
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

    // =============================================
    // 1. SAVE TO AIRTABLE
    // =============================================
    if (process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID) {
      try {
        // Using table ID - update this to your Idea Validator leads table ID
        // Or create a new table called "Idea Validator Leads"
        const airtableResponse = await fetch(
          `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Idea%20Validator%20Leads`,
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
                  'First Name': submission.firstName,
                  'Source': submission.source || 'Idea Validator Popup',
                  'Status': 'New',
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
    // 2. SEND TO HUBSPOT
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
                firstname: submission.firstName,
                lead_source: 'Idea Validator',
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
    // 3. SEND SLACK NOTIFICATION
    // =============================================
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `💡 New Idea Validator Lead!`,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: '💡 New Idea Validator Lead!',
                  emoji: true,
                },
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Name:*\n${submission.firstName}` },
                  { type: 'mrkdwn', text: `*Email:*\n${submission.email}` },
                  { type: 'mrkdwn', text: `*Source:*\n${submission.source}` },
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
    // 4. SEND WELCOME EMAIL (OPTIONAL)
    // =============================================
    // You can add a SendGrid email here if you want to send a follow-up
    // to people who use the Idea Validator

    return NextResponse.json({
      success: true,
      message: 'Lead captured successfully',
      data: {
        email: submission.email,
        firstName: submission.firstName,
      },
    });

  } catch (error) {
    console.error('Idea validator API error:', error);
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
    endpoint: 'Idea Validator Lead Capture',
    version: '1.0.0',
  });
}
