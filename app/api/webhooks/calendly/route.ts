// app/api/webhooks/calendly/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Calendly webhook payload structure
    const event = payload.event;
    const invitee = payload.payload;

    if (event === 'invitee.created') {
      // Extract data
      const leadData = {
        'Name': invitee.name,
        'Email': invitee.email,
        'Event Type': invitee.event.name,
        'Scheduled Time': invitee.event.start_time,
        'Status': 'Scheduled',
        'Meeting Link': invitee.uri,
        'Phone': invitee.questions_and_answers?.find((q: any) => 
          q.question.toLowerCase().includes('phone')
        )?.answer || '',
        'Source': 'Calendly Webhook',
      };

      // Save to Airtable
      const airtableResponse = await fetch(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Calendly%20Leads`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            records: [{
              fields: leadData
            }]
          }),
        }
      );

      if (!airtableResponse.ok) {
        throw new Error('Failed to save to Airtable');
      }

      // Optional: Send yourself an email notification
      if (process.env.SENDGRID_API_KEY) {
        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: 'steven.morello@nextax.ai' }],
              subject: `🗓️ New Calendly Booking: ${invitee.name}`,
            }],
            from: { email: 'notifications@nextax.ai' },
            content: [{
              type: 'text/html',
              value: `
                <h2>New Meeting Scheduled</h2>
                <p><strong>Name:</strong> ${invitee.name}</p>
                <p><strong>Email:</strong> ${invitee.email}</p>
                <p><strong>Event:</strong> ${invitee.event.name}</p>
                <p><strong>Time:</strong> ${new Date(invitee.event.start_time).toLocaleString()}</p>
                <p><a href="${invitee.uri}">View in Calendly</a></p>
              `,
            }],
          }),
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, message: 'Event type not handled' });

  } catch (error) {
    console.error('Calendly webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
