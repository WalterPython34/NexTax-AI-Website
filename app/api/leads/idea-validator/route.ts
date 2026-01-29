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
                  'First Name': submission.firstName,
                  'Email': submission.email,
                  'Source': submission.source || 'Idea Validator Popup',
                  'Status': 'New',
                  'Created': new Date(submission.timestamp).toISOString(),
                }
              }]
            }),
          }
        );

        if (!airtableResponse.ok) {
          const errorData = await airtableResponse.json();
          console.error('Airtable error:', errorData);
          // Don't fail the entire request, just log the error
        } else {
          const airtableData = await airtableResponse.json();
          console.log('✅ Lead saved to Airtable:', submission.email, airtableData.records[0].id);
        }
      } catch (airtableError) {
        console.error('❌ Airtable integration error:', airtableError);
        // Continue processing even if Airtable fails
      }
    } else {
      console.warn('⚠️ Airtable credentials missing - skipping Airtable save');
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
          const errorData = await hubspotResponse.json();
          console.error('❌ HubSpot error:', errorData);
        } else {
          const hubspotData = await hubspotResponse.json();
          console.log('✅ Lead added to HubSpot:', submission.email, hubspotData.id);
        }
      } catch (hubspotError) {
        console.error('❌ HubSpot integration error:', hubspotError);
      }
    }

    // =============================================
    // 3. SEND SLACK NOTIFICATION
    // =============================================
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        const slackResponse = await fetch(process.env.SLACK_WEBHOOK_URL, {
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
                  { type: 'mrkdwn', text: `*Time:*\n${new Date(submission.timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' })}` },
                ],
              },
            ],
          }),
        });
        
        if (slackResponse.ok) {
          console.log('✅ Slack notification sent');
        } else {
          console.error('❌ Slack notification failed:', await slackResponse.text());
        }
      } catch (slackError) {
        console.error('❌ Slack notification error:', slackError);
      }
    }

    // =============================================
    // 4. SEND WELCOME EMAIL (OPTIONAL)
    // =============================================
    // Using SendGrid or your email provider
    if (process.env.SENDGRID_API_KEY) {
      try {
        // Uncomment and configure when ready
        /*
        const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: submission.email, name: submission.firstName }],
              subject: 'Your Business Idea Validation Report',
            }],
            from: {
              email: 'hello@nextax.ai',
              name: 'NexTax.AI',
            },
            content: [{
              type: 'text/html',
              value: `
                <h1>Hi ${submission.firstName}!</h1>
                <p>Thanks for using our Idea Validator...</p>
              `,
            }],
          }),
        });
        
        if (emailResponse.ok) {
          console.log('✅ Welcome email sent');
        }
        */
      } catch (emailError) {
        console.error('❌ Email error:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Lead captured successfully',
      data: {
        email: submission.email,
        firstName: submission.firstName,
        timestamp: submission.timestamp,
      },
    });

  } catch (error) {
    console.error('❌ Idea validator API error:', error);
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
    timestamp: new Date().toISOString(),
  });
}
