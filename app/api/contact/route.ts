import { type NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"
import crypto from "crypto";

function timingSafeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export async function POST(request: NextRequest) {
  console.log("📨 Contact form submission received")

  try {
    const data = await request.json()
    const { name, email, company, subject, message, inquiryType, website, formLoadTime, token } = data

    console.log("📋 Contact form data:", data)

    // Honeypot check - if "website" field is filled, it's a bot
    if (website) {
      console.log("🤖 Bot detected via honeypot field")
      // Return success to fool the bot, but don't actually process
      return NextResponse.json({
        success: true,
        message: "Contact form submitted successfully",
      })
    }

    // Timing check - if form submitted in less than 3 seconds, likely a bot
    if (formLoadTime) {
      const submissionTime = Date.now()
      const timeDiff = submissionTime - parseInt(formLoadTime)
      if (timeDiff < 3000) {
        console.log("🤖 Bot detected via timing check (too fast)")
        return NextResponse.json({
          success: true,
          message: "Contact form submitted successfully",
        })
      }
    }

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Basic spam content detection - catches random gibberish strings
    const spamPatterns = [
      /^[a-zA-Z]{6,10}$/, // Random letter strings like "bkbKkMjh"
      /^[A-Z][a-z]+[A-Z][a-z]+$/, // CamelCase gibberish like "TgHRpqFj"
      /^[a-zA-Z]{3,6}[A-Z][a-zA-Z]{2,5}$/, // Mixed case gibberish
    ]

    const isSpamSubject = spamPatterns.some((pattern) => pattern.test(subject.trim()))
    const isSpamMessage = spamPatterns.some((pattern) => pattern.test(message.trim()))
    const isSpamCompany = company && spamPatterns.some((pattern) => pattern.test(company.trim()))

    if (isSpamSubject || isSpamMessage || isSpamCompany) {
      console.log("🤖 Bot detected via spam pattern in content")
      return NextResponse.json({
        success: true,
        message: "Contact form submitted successfully",
      })
    }

// --- Spam scoring (add after required field validation) ---
let spamScore = 0;
const reasons: string[] = [];

const subj = subject.trim().toLowerCase();
const msg = message.trim().toLowerCase();
const comp = (company || "").trim().toLowerCase();
const mail = email.trim().toLowerCase();

// 1) super short subject
if (subj.length <= 2) {
  spamScore += 2;
  reasons.push("subject_too_short");
}

// 2) subject mostly symbols
const symbolRatio = (subject.match(/[^a-zA-Z0-9\s]/g)?.length || 0) / Math.max(subject.length, 1);
if (symbolRatio > 0.3) {
  spamScore += 3;
  reasons.push("subject_symbol_heavy");
}

// 3) spammy phrases (tune this list over time)
const spamPhrases = [
  "after-sales",
  "after sales",
  "quotation",
  "brochure",
  "best price",
  "dear",
  "kindly",
  "whatsapp",
  "telegram",
  "seo",
  "backlinks",
  "crypto",
  "hair loss",
  "advertisement",
  "i saw your advertisement",
  "waiting for your reply"
];

if (spamPhrases.some((p) => msg.includes(p) || subj.includes(p))) {
  spamScore += 4;
  reasons.push("spam_phrase_match");
}

// 4) message doesn’t mention anything relevant (light intent check)
const businessKeywords = [
  "llc", "s-corp", "scorp", "ein", "tax", "taxes", "bookkeeping",
  "compliance", "formation", "incorpor", "business", "startup", "startsmart", "nextax"
];
if (!businessKeywords.some((k) => msg.includes(k))) {
  spamScore += 2;
  reasons.push("no_business_keywords");
}

// 5) suspicious “big company” + free email combo (weak signal)
const bigBrands = ["dynamic yield", "stripe", "google", "microsoft", "amazon", "meta"];
const isFreeEmail = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"].some((d) =>
  mail.endsWith("@" + d)
);
if (bigBrands.some((b) => comp.includes(b)) && isFreeEmail) {
  spamScore += 1; // weak signal
  reasons.push("brand_company_free_email");
}

// 6) message too generic
if (msg.length < 25) {
  spamScore += 2;
  reasons.push("message_too_short");
}

// 7) optional: mismatch inquiry type vs content
if (inquiryType === "support" && !msg.includes("issue") && !msg.includes("problem") && !msg.includes("help")) {
  spamScore += 1;
  reasons.push("support_mismatch");
}

// Final decision
if (spamScore >= 6) {
  console.log("🤖 Spam detected via scoring:", { spamScore, reasons, email, subject });

  // return success so bot thinks it worked
  return NextResponse.json({
    success: true,
    message: "Contact form submitted successfully",
  });
}

    // Additional check: message too short (likely spam)
    if (message.trim().length < 10) {
      console.log("🤖 Bot detected via message too short")
      return NextResponse.json({
        success: true,
        message: "Contact form submitted successfully",
      })
    }

const secret = process.env.CONTACT_TOKEN_SECRET;
if (!secret || !token) {
  return NextResponse.json({ success: true, message: "ok" }); // pretend success
}

const [ts, sig] = token.split(".");
if (!ts || !sig) return NextResponse.json({ success: true, message: "ok" });

const expected = crypto.createHmac("sha256", secret).update(ts).digest("hex");
if (!timingSafeEqual(sig, expected)) {
  console.log("🤖 Invalid token signature");
  return NextResponse.json({ success: true, message: "ok" });
}

// freshness: 30 minutes
const age = Date.now() - Number(ts);
if (Number.isNaN(age) || age < 0 || age > 1000 * 60 * 30) {
  console.log("🤖 Token expired/invalid age");
  return NextResponse.json({ success: true, message: "ok" });
}


    // Send email notification
    const emailResult = await sendEmail({
      to: process.env.NOTIFICATION_EMAIL || "steven.morello@nextax.ai",
      subject: `Contact Form: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #64748b; }
            .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>New Contact Form Submission</h1>
          </div>
          <div class="content">
            <div class="field">
              <p class="label">Name:</p>
              <p>${name}</p>
            </div>
            <div class="field">
              <p class="label">Email:</p>
              <p>${email}</p>
            </div>
            <div class="field">
              <p class="label">Company:</p>
              <p>${company || "Not provided"}</p>
            </div>
            <div class="field">
              <p class="label">Inquiry Type:</p>
              <p>${inquiryType || "Not specified"}</p>
            </div>
            <div class="field">
              <p class="label">Subject:</p>
              <p>${subject}</p>
            </div>
            <div class="field">
              <p class="label">Message:</p>
              <p>${message}</p>
            </div>
          </div>
          <div class="footer">
            <p>This message was sent from the NexTax.AI contact form.</p>
          </div>
        </body>
        </html>
      `,
    })

    console.log("📧 Email result:", emailResult)

    if (!emailResult.success) {
      throw new Error(`Failed to send email: ${emailResult.error}`)
    }

    return NextResponse.json({
      success: true,
      message: "Contact form submitted successfully",
    })
  } catch (error: any) {
    console.error("❌ Contact form error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
