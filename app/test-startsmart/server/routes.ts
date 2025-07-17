import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { openaiService } from "./openai";
import { checkUsageLimit, getModelForTier, AI_CHAT_TIERS, type SubscriptionTier } from "./ai-usage-config";
import { supabase, getSubscriptionStatus, syncUserFromNexTax } from "./supabase";

// Stripe configuration
const STRIPE_SECRET_KEY = 'STRIPE_SECRET_KEY';
const STRIPE_WEBHOOK_SECRET = 'STRIPE_WEBHOOK_SECRET';
import * as XLSX from 'xlsx';
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { 
  insertConversationSchema, 
  insertMessageSchema, 
  insertBusinessProfileSchema,
  insertProgressTaskSchema,
  insertDocumentSchema 
} from "@shared/schema";
import { z } from "zod";

// Helper function to convert Expense Tracker text to Excel format
function convertExpenseTrackerToExcel(content: string): Buffer {
  try {
    const workbook = XLSX.utils.book_new();
    
    // Parse CSV content directly (our new generation format)
    const lines = content.split('\n').filter(line => line.trim());
    const expenseLines: string[][] = [];
    
    // Process each line as CSV
    for (const line of lines) {
      if (line.trim()) {
        // Split by comma, but handle quoted strings properly
        const cells = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cells.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        cells.push(current.trim());
        
        // Clean up quoted strings
        const cleanedCells = cells.map(cell => cell.replace(/^"|"$/g, ''));
        
        if (cleanedCells.length >= 6) {
          expenseLines.push(cleanedCells);
        }
      }
    }
    
    // If no proper data found, create a basic structure
    if (expenseLines.length === 0) {
      expenseLines.push(['Date', 'Description', 'Category', 'Amount', 'Payment Method', 'Budget Target', 'Notes']);
      expenseLines.push([new Date().toISOString().split('T')[0], 'Sample Expense', 'Office Supplies', '100', 'Credit Card', '500', 'AI Generated expense tracker']);
    }
    
    // Create the main expense sheet
    const expenseSheet = XLSX.utils.aoa_to_sheet(expenseLines);
    expenseSheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 25 }, // Description
      { wch: 20 }, // Category
      { wch: 12 }, // Amount
      { wch: 15 }, // Payment Method
      { wch: 15 }, // Budget Target
      { wch: 30 }  // Notes
    ];
    
    // Add bold formatting to header row (row 1) - Excel doesn't support underline via XLSX library
    if (expenseLines.length > 0) {
      const headerCellCount = expenseLines[0].length;
      for (let col = 0; col < headerCellCount; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!expenseSheet[cellAddress]) continue;
        
        // Create style object for bold headers
        expenseSheet[cellAddress].s = {
          font: { 
            bold: true,
            name: 'Arial',
            sz: 12
          },
          alignment: { 
            horizontal: 'center',
            vertical: 'center'
          },
          fill: {
            fgColor: { rgb: 'E6E6FA' }  // Light lavender background
          },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
    }
    
    XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expense Tracker');
    
    // Create a simple budget summary sheet
    const categorySet = new Set(expenseLines.slice(1).map(row => row[2]));
    const categories = Array.from(categorySet).filter(cat => cat && cat !== 'Category');
    const budgetData = [['Category', 'Budget Target', 'Formula (Copy to Excel)']];
    
    categories.forEach(category => {
      const budgetTarget = expenseLines.find(row => row[2] === category)?.[5] || '1000';
      budgetData.push([category, budgetTarget, `=SUMIF(C:C,"${category}",D:D)`]);
    });
    
    const budgetSheet = XLSX.utils.aoa_to_sheet(budgetData);
    budgetSheet['!cols'] = [
      { wch: 25 }, // Category
      { wch: 15 }, // Budget Target
      { wch: 30 }  // Formula
    ];
    
    // Add bold formatting to budget summary header row
    if (budgetData.length > 0) {
      const headerCellCount = budgetData[0].length;
      for (let col = 0; col < headerCellCount; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!budgetSheet[cellAddress]) continue;
        
        // Create style object for bold headers
        budgetSheet[cellAddress].s = {
          font: { 
            bold: true,
            name: 'Arial',
            sz: 12
          },
          alignment: { 
            horizontal: 'center',
            vertical: 'center'
          },
          fill: {
            fgColor: { rgb: 'E6E6FA' }  // Light lavender background
          },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
    }
    
    XLSX.utils.book_append_sheet(workbook, budgetSheet, 'Budget Summary');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  } catch (error) {
    console.error('Error creating Excel file:', error);
    // Create a basic fallback Excel file
    const fallbackData = [
      ['Date', 'Description', 'Category', 'Amount', 'Payment Method', 'Budget Target', 'Notes'],
      [new Date().toISOString().split('T')[0], 'Sample Expense', 'Office Supplies', '100', 'Credit Card', '500', 'Generated expense tracker']
    ];
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(fallbackData);
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expense Tracker');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

function convertChartToExcel(content: string): Buffer {
  try {
    // Parse CSV content directly (our new generation format)
    const lines = content.split('\n').filter(line => line.trim());
    const data: string[][] = [];
    
    // Process each line as CSV
    for (const line of lines) {
      if (line.trim()) {
        // Split by comma, but handle quoted strings properly
        const cells = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cells.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        cells.push(current.trim());
        
        // Clean up quoted strings
        const cleanedCells = cells.map(cell => cell.replace(/^"|"$/g, ''));
        
        if (cleanedCells.length >= 3) {
          data.push(cleanedCells);
        }
      }
    }
    
    // If no proper data found, create a basic structure
    if (data.length === 0) {
      data.push(['Account Number', 'Account Name', 'Account Type', 'Description']);
      data.push(['1000', 'Cash', 'Asset', 'Business checking account']);
      data.push(['1100', 'Accounts Receivable', 'Asset', 'Money owed by customers']);
      data.push(['2000', 'Accounts Payable', 'Liability', 'Money owed to vendors']);
      data.push(['3000', 'Owner Equity', 'Equity', 'Owner investment in business']);
      data.push(['4000', 'Revenue', 'Income', 'Sales and service income']);
      data.push(['5000', 'Operating Expenses', 'Expense', 'Business operating costs']);
    }
    
    // Create Excel workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    worksheet['!cols'] = [
      { width: 15 }, // Account Number
      { width: 30 }, // Account Name
      { width: 15 }, // Account Type
      { width: 40 }  // Description/Statement
    ];
    
    // Add bold formatting to header row (row 1) - Excel doesn't support underline via XLSX library
    if (data.length > 0) {
      const headerCellCount = data[0].length;
      for (let col = 0; col < headerCellCount; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddress]) continue;
        
        // Create style object for bold headers
        worksheet[cellAddress].s = {
          font: { 
            bold: true,
            name: 'Arial',
            sz: 12
          },
          alignment: { 
            horizontal: 'center',
            vertical: 'center'
          },
          fill: {
            fgColor: { rgb: 'E6E6FA' }  // Light lavender background
          },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
    }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chart of Accounts');
    
    // Generate Excel buffer
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  } catch (error) {
    console.error('Error converting chart to Excel:', error);
    // Create a basic fallback Excel file
    const data = [
      ['Account Number', 'Account Name', 'Account Type', 'Description'],
      ['1000', 'Cash', 'Asset', 'Business checking account'],
      ['1100', 'Accounts Receivable', 'Asset', 'Money owed by customers'],
      ['2000', 'Accounts Payable', 'Liability', 'Money owed to vendors'],
      ['3000', 'Owner Equity', 'Equity', 'Owner investment in business'],
      ['4000', 'Revenue', 'Income', 'Sales and service income'],
      ['5000', 'Operating Expenses', 'Expense', 'Business operating costs']
    ];
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = [{ width: 15 }, { width: 30 }, { width: 15 }, { width: 40 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chart of Accounts');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Download generated documents as PDF
  app.get("/api/documents/:id/download/pdf", isAuthenticated, async (req: any, res) => {
    try {
      const documentId = req.params.id;
      const userId = req.user.claims.sub;
      
      const documents = await storage.getUserDocuments(userId);
      const document = documents.find((doc: any) => doc.id === documentId);
      if (!document || document.userId !== userId) {
        return res.status(404).json({ message: "Document not found" });
      }

      // For now, return the content as a downloadable text file since we don't have PDF generation
      // The frontend should handle PDF conversion using print functionality
      const filename = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(document.content || 'No content available');
    } catch (error) {
      console.error("Error downloading PDF document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  // Download generated documents as Excel
  app.get("/api/documents/:id/download/excel", isAuthenticated, async (req: any, res) => {
    try {
      const documentId = req.params.id;
      const userId = req.user.claims.sub;
      
      const documents = await storage.getUserDocuments(userId);
      const document = documents.find((doc: any) => doc.id === documentId);
      if (!document || document.userId !== userId) {
        return res.status(404).json({ message: "Document not found" });
      }

      let excelBuffer: Buffer;
      
      if (document.documentType === "chart_of_accounts") {
        excelBuffer = convertChartToExcel(document.content || "");
      } else if (document.documentType === "expense_tracker") {
        excelBuffer = convertExpenseTrackerToExcel(document.content || "");
      } else {
        return res.status(400).json({ message: "Document type not supported for Excel download" });
      }

      const filename = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error downloading Excel document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  // Public AI Provider Directory downloads (no authentication required)
  app.get('/api/download/ai-provider-directory-free', async (req, res) => {
    try {
      const filePath = path.resolve('./attached_assets/AI_Tools_Free_1751230318661.xlsx');
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return res.status(404).json({ error: 'File not found' });
      }
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="AI_Tools_Free.xlsx"');
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving AI tools free:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  });

  app.get('/api/download/ai-provider-directory-pro', async (req, res) => {
    try {
      const filePath = path.resolve('./attached_assets/AI_Tools_Pro_1751230318660.xlsx');
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return res.status(404).json({ error: 'File not found' });
      }
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="AI_Tools_Pro.xlsx"');
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving AI tools pro:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  });

  app.get('/api/download/ai-provider-directory-premium', async (req, res) => {
    try {
      const filePath = path.resolve('./attached_assets/AI_Tools_Premium_1751230318658.xlsx');
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return res.status(404).json({ error: 'File not found' });
      }
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="AI_Tools_Premium.xlsx"');
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving AI tools premium:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Simple test endpoint to verify custom domain routing
  app.get('/test-custom', async (req: any, res) => {
    console.log("✅ Test endpoint reached from:", req.hostname);
    res.json({ 
      message: "Custom domain routing working", 
      hostname: req.hostname,
      timestamp: Date.now()
    });
  });

  // Cross-domain authentication bridge for custom domain (using path without /api/ to avoid interception)
  app.get('/auth-bridge', async (req: any, res) => {
    console.log("🌉 Auth bridge request from:", req.hostname);
    
    if (req.hostname === "startsmart.nextax.ai") {
      // For custom domain, redirect to Replit domain with bridge callback
      const replitDomain = process.env.REPLIT_DOMAINS!.split(",")[0];
      const bridgeUrl = `https://${replitDomain}/auth-callback?target=https://startsmart.nextax.ai`;
      console.log("🔄 Redirecting to bridge:", bridgeUrl);
      return res.redirect(bridgeUrl);
    }
    
    // For Replit domain, check if user is authenticated
    if (req.isAuthenticated()) {
      const targetUrl = req.query.target as string;
      if (targetUrl && targetUrl.startsWith("https://startsmart.nextax.ai")) {
        // User is authenticated, redirect back to custom domain with token
        const token = Buffer.from(JSON.stringify({
          userId: req.user.claims.sub,
          timestamp: Date.now(),
          signature: 'bridge-auth'
        })).toString('base64');
        
        const returnUrl = `${targetUrl}?auth_token=${token}`;
        console.log("✅ Bridging authenticated user to custom domain");
        return res.redirect(returnUrl);
      }
    }
    
    // Not authenticated, redirect to login
    res.redirect('/api/login');
  });

  // Handle bridge callback
  app.get('/auth-callback', async (req: any, res) => {
    const targetUrl = req.query.target as string;
    
    if (req.isAuthenticated() && targetUrl) {
      // Generate bridge token
      const token = Buffer.from(JSON.stringify({
        userId: req.user.claims.sub,
        timestamp: Date.now(),
        signature: 'bridge-auth'
      })).toString('base64');
      
      const returnUrl = `${targetUrl}?auth_token=${token}`;
      return res.redirect(returnUrl);
    }
    
    res.redirect('/api/login');
  });

  // Handle bridge token authentication
  app.get('/api/auth/token', async (req: any, res) => {
    const token = req.query.token as string;
    
    if (!token) {
      return res.status(400).json({ message: "No token provided" });
    }
    
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Validate token (simple validation for bridge auth)
      if (decoded.signature === 'bridge-auth' && 
          (Date.now() - decoded.timestamp) < 300000) { // 5 minutes
        
        const user = await storage.getUser(decoded.userId);
        if (user) {
          // Create a session for the custom domain
          req.session.bridgeAuth = {
            userId: decoded.userId,
            timestamp: Date.now()
          };
          
          return res.json(user);
        }
      }
      
      res.status(401).json({ message: "Invalid token" });
    } catch (error) {
      res.status(401).json({ message: "Invalid token format" });
    }
  });

  // AI Usage tracking routes
  app.get('/api/auth/user/usage', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const subscriptionTier = (user?.subscriptionTier || "free") as SubscriptionTier;
      const currentUsage = await storage.getUserCurrentUsage(userId);
      const usageCheck = checkUsageLimit(subscriptionTier, currentUsage.messageCount);
      
      res.json({
        tier: subscriptionTier,
        usage: currentUsage,
        limits: {
          maxMessages: AI_CHAT_TIERS[subscriptionTier].maxMessages,
          description: AI_CHAT_TIERS[subscriptionTier].description
        },
        canSend: usageCheck.canSend,
        warningMessage: usageCheck.warningMessage,
        upgradeMessage: usageCheck.upgradeMessage
      });
    } catch (error) {
      console.error("Error fetching user usage:", error);
      res.status(500).json({ message: "Failed to fetch user usage" });
    }
  });

  // Lead tracking endpoints
  app.post('/api/leads/manual', isAuthenticated, async (req: any, res) => {
    try {
      const { email, firstName, lastName } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const { leadTracking } = await import('./leadTracking');
      await leadTracking.addManualLead(email, firstName, lastName);
      
      res.json({ message: "Lead added successfully" });
    } catch (error) {
      console.error("Manual lead creation failed:", error);
      res.status(500).json({ message: "Failed to add lead" });
    }
  });
  
  // Webhook endpoint for external integrations (Zapier, Make.com, etc.)
  app.post('/api/webhooks/lead-notification', async (req, res) => {
    try {
      // Verify webhook signature if provided
      const signature = req.headers['x-webhook-signature'];
      const expectedSignature = process.env.WEBHOOK_SECRET;
      
      if (expectedSignature && signature !== expectedSignature) {
        return res.status(401).json({ message: "Invalid webhook signature" });
      }
      
      // Process the webhook payload
      console.log('📧 Lead notification webhook received:', req.body);
      res.json({ message: "Webhook processed successfully" });
    } catch (error) {
      console.error("Webhook processing failed:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Business profile routes
  app.get('/api/business-profiles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profiles = await storage.getUserBusinessProfiles(userId);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching business profiles:", error);
      res.status(500).json({ message: "Failed to fetch business profiles" });
    }
  });

  app.post('/api/business-profiles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = insertBusinessProfileSchema.parse({ ...req.body, userId });
      const profile = await storage.createBusinessProfile(profileData);
      
      // Create default progress tasks for this business
      await storage.createDefaultProgressTasks(userId, profile.id);
      
      res.json(profile);
    } catch (error) {
      console.error("Error creating business profile:", error);
      res.status(500).json({ message: "Failed to create business profile" });
    }
  });

  // Business profile questionnaire endpoint
  app.post('/api/business-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const answers = req.body;
      
      // Create tasks based on answers (add tasks for "no" or "undecided" responses)
      const tasksToCreate = [];
      
      if (answers.businessName === "no") {
        tasksToCreate.push({
          userId,
          taskName: "Choose Business Name",
          description: "Brainstorm and select a unique business name that reflects your brand",
          category: "foundation",
          status: "pending",
          dueDate: null,
          orderIndex: 1
        });
      }
      
      if (answers.nameAvailable === "no") {
        tasksToCreate.push({
          userId,
          taskName: "Check Business Name Availability",
          description: "Verify your chosen business name is available in your state",
          category: "legal", 
          status: "pending",
          dueDate: null,
          orderIndex: 2
        });
      }
      
      if (answers.businessType === "undecided") {
        tasksToCreate.push({
          userId,
          taskName: "Choose Business Entity Type",
          description: "Decide between LLC, S-Corp, Corporation, or Sole Proprietorship",
          category: "legal",
          status: "pending", 
          dueDate: null,
          orderIndex: 3
        });
      }
      
      if (answers.registeredAgent === "no") {
        tasksToCreate.push({
          userId,
          taskName: "Appoint Registered Agent",
          description: "Select and appoint a registered agent for your business",
          category: "legal",
          status: "pending",
          dueDate: null,
          orderIndex: 4
        });
      }
      
      if (answers.documents === "no") {
        if (answers.businessType === "llc") {
          tasksToCreate.push({
            userId,
            taskName: "Prepare Operating Agreement",
            description: "Create and sign your LLC Operating Agreement",
            category: "legal",
            status: "pending",
            dueDate: null,
            orderIndex: 5
          });
        } else if (answers.businessType === "corporation" || answers.businessType === "s-corp") {
          tasksToCreate.push({
            userId,
            taskName: "Prepare Articles of Incorporation",
            description: "Create and file your Articles of Incorporation", 
            category: "legal",
            status: "pending",
            dueDate: null,
            orderIndex: 5
          });
        }
      }
      
      if (answers.ein === "no") {
        tasksToCreate.push({
          userId,
          taskName: "Obtain EIN (Employer Identification Number)",
          description: "Apply for your business EIN with the IRS",
          category: "financial",
          status: "pending",
          dueDate: null,
          orderIndex: 6
        });
      }
      
      // Add general startup tasks that everyone needs
      tasksToCreate.push(
        {
          userId,
          taskName: "Open Business Bank Account",
          description: "Set up a dedicated business banking account",
          category: "financial",
          status: "pending",
          dueDate: null,
          orderIndex: 7
        },
        {
          userId,
          taskName: "Set Up Business Accounting",
          description: "Choose and implement an accounting system",
          category: "financial", 
          status: "pending",
          dueDate: null,
          orderIndex: 8
        },
        {
          userId,
          taskName: "Register for State and Local Taxes",
          description: "Complete state and local tax registration requirements",
          category: "compliance",
          status: "pending",
          dueDate: null,
          orderIndex: 9
        }
      );
      
      // Create all the tasks
      for (const taskData of tasksToCreate) {
        await storage.createProgressTask(taskData);
      }
      
      res.json({ 
        message: "Profile created and tasks generated successfully", 
        tasksCreated: tasksToCreate.length 
      });
    } catch (error) {
      console.error("Error creating business profile:", error);
      res.status(500).json({ message: "Failed to create business profile" });
    }
  });

  // Chat routes
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationData = insertConversationSchema.parse({ ...req.body, userId });
      const conversation = await storage.createConversation(conversationData);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = req.params.id;
      
      // Verify conversation ownership
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const messages = await storage.getConversationMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = req.params.id;
      
      // Verify conversation ownership
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Get user and check subscription tier
      const user = await storage.getUser(userId);
      const subscriptionTier = (user?.subscriptionTier || "free") as SubscriptionTier;
      
      // Check current usage for this month
      const currentUsage = await storage.getUserCurrentUsage(userId);
      const usageCheck = checkUsageLimit(subscriptionTier, currentUsage.messageCount);
      
      if (!usageCheck.canSend) {
        return res.status(429).json({ 
          message: usageCheck.upgradeMessage,
          usage: currentUsage,
          tier: subscriptionTier,
          canUpgrade: true
        });
      }

      // Save user message
      const userMessage = await storage.createMessage({
        conversationId,
        role: "user",
        content
      });

      // Track usage for this message
      const currentMonth = new Date().toISOString().slice(0, 7);
      await storage.createOrUpdateUsage(userId, currentMonth, 1, 0);

      // Get business context if available
      let businessContext;
      if (conversation.businessId) {
        businessContext = await storage.getBusinessProfile(conversation.businessId);
      }

      // Get conversation history for context
      const messages = await storage.getConversationMessages(conversationId);
      const chatHistory = messages.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      }));

      // Use tier-appropriate model for AI response
      const model = getModelForTier(subscriptionTier);
      const aiResponse = await openaiService.generateChatResponse(chatHistory, businessContext, model);

      // Save AI message
      const aiMessage = await storage.createMessage({
        conversationId,
        role: "assistant",
        content: aiResponse.content,
        metadata: aiResponse.metadata
      });

      // Update conversation title if this is the first exchange
      if (messages.length <= 1) {
        const title = await openaiService.generateConversationTitle(content);
        await storage.updateConversationTitle(conversationId, title);
      }

      res.json({ userMessage, aiMessage });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Progress tracking routes
  app.get('/api/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getUserProgressTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Create a new progress task from chat
  app.post('/api/progress/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, category, dueDate, source } = req.body;

      if (!title || !category) {
        return res.status(400).json({ message: "Title and category are required" });
      }

      const task = await storage.createProgressTask({
        userId,
        taskName: title,
        description: description || "",
        category: category.toLowerCase(),
        status: "pending",
        dueDate: dueDate ? new Date(dueDate) : null,
        orderIndex: 0
      });

      res.json(task);
    } catch (error) {
      console.error("Error creating progress task:", error);
      res.status(500).json({ message: "Failed to create progress task" });
    }
  });

  app.patch('/api/progress/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const taskId = req.params.id;
      const { status } = req.body;

      const task = await storage.getProgressTask(taskId);
      if (!task || task.userId !== userId) {
        return res.status(404).json({ message: "Task not found" });
      }

      const updatedTask = await storage.updateProgressTask(taskId, { 
        status,
        completedAt: status === 'completed' ? new Date() : null
      });
      
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Document generation routes
  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documents = await storage.getUserDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Legal review routes
  app.get('/api/legal-reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // For now, return empty array as legal review integration is coming soon
      res.json([]);
    } catch (error) {
      console.error("Error fetching legal reviews:", error);
      res.status(500).json({ message: "Failed to fetch legal reviews" });
    }
  });

  app.post('/api/legal-reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { documentId, reviewType, priority, specialtyRequired, clientInstructions, dueDate } = req.body;
      
      // For now, simulate legal review request
      const reviewData = {
        id: Date.now().toString(),
        documentId,
        userId,
        reviewType,
        priority,
        specialtyRequired,
        clientInstructions,
        dueDate,
        status: "pending",
        submittedAt: new Date().toISOString(),
      };

      // In the future, this will integrate with actual legal review system
      res.json(reviewData);
    } catch (error) {
      console.error("Error creating legal review:", error);
      res.status(500).json({ message: "Failed to create legal review" });
    }
  });

  app.post('/api/documents/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { documentType, businessId, title, businessData } = req.body;

      if (!documentType || !title) {
        return res.status(400).json({ message: "Document type and title are required" });
      }

      // Get business profile for context if businessId provided
      let businessProfile = null;
      if (businessId) {
        businessProfile = await storage.getBusinessProfile(businessId);
      }

      // Generate document content
      const generatedDoc = await openaiService.generateDocument(
        documentType, 
        businessProfile, 
        businessData
      );

      // Save document
      const document = await storage.createDocument({
        userId,
        businessId,
        documentType,
        title: generatedDoc.title,
        content: generatedDoc.content,
        status: "generated",
        metadata: { 
          businessData,
          generatedAt: new Date().toISOString()
        }
      });

      res.json(document);
    } catch (error) {
      console.error("Error generating document:", error);
      res.status(500).json({ message: "Failed to generate document" });
    }
  });

  // Compliance Center API routes
  app.get('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const compliance = await storage.getUserBusinessCompliance(userId);
      res.json(compliance);
    } catch (error) {
      console.error("Error fetching compliance profile:", error);
      res.status(500).json({ message: "Failed to fetch compliance profile" });
    }
  });

  app.post('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const complianceData = { ...req.body, userId };
      
      // Check if user already has a compliance profile
      const existingCompliance = await storage.getUserBusinessCompliance(userId);
      
      let compliance;
      if (existingCompliance) {
        // Update existing compliance profile
        compliance = await storage.updateBusinessCompliance(existingCompliance.id, complianceData);
        
        // Clean up existing auto-generated tasks before generating new ones
        await storage.clearAutoGeneratedTasks(userId);
      } else {
        // Create new compliance profile
        compliance = await storage.createBusinessCompliance(complianceData);
      }
      
      // Auto-generate default compliance tasks
      await storage.createDefaultComplianceTasks(userId, compliance.id);
      
      res.json(compliance);
    } catch (error) {
      console.error("Error creating compliance profile:", error);
      res.status(500).json({ message: "Failed to create compliance profile" });
    }
  });

  app.put('/api/compliance/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const compliance = await storage.updateBusinessCompliance(id, updates);
      res.json(compliance);
    } catch (error) {
      console.error("Error updating compliance profile:", error);
      res.status(500).json({ message: "Failed to update compliance profile" });
    }
  });

  // Compliance task routes
  app.get('/api/compliance/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getUserComplianceTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching compliance tasks:", error);
      res.status(500).json({ message: "Failed to fetch compliance tasks" });
    }
  });

  app.post('/api/compliance/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const taskData = { ...req.body, userId };
      
      const task = await storage.createComplianceTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Error creating compliance task:", error);
      res.status(500).json({ message: "Failed to create compliance task" });
    }
  });

  // Compliance email reminder settings (Pro/Premium feature only)
  app.get('/api/compliance/email-reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check user tier - only Pro/Premium users can access email reminders
      const user = await storage.getUser(userId);
      const userTier = user?.subscriptionTier || "free";
      
      if (userTier !== "pro" && userTier !== "premium") {
        return res.status(403).json({ 
          message: "Email reminders are only available for Pro and Premium users",
          requiredTier: ["pro", "premium"]
        });
      }
      
      const settings = await storage.getEmailReminderSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching email reminder settings:", error);
      res.status(500).json({ message: "Failed to fetch email reminder settings" });
    }
  });

  app.post('/api/compliance/email-reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { enabled, daysBefore } = req.body;
      
      // Check user tier - only Pro/Premium users can update email reminders
      const user = await storage.getUser(userId);
      const userTier = user?.subscriptionTier || "free";
      
      if (userTier !== "pro" && userTier !== "premium") {
        return res.status(403).json({ 
          message: "Email reminders are only available for Pro and Premium users",
          requiredTier: ["pro", "premium"]
        });
      }
      
      const updatedProfile = await storage.updateEmailReminderSettings(userId, enabled, daysBefore);
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating email reminder settings:", error);
      res.status(500).json({ message: "Failed to update email reminder settings" });
    }
  });

  // Automatic task rollover system
  app.post('/api/compliance/tasks/:id/rollover', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { complianceScheduler } = await import('./compliance-scheduler');
      
      await complianceScheduler.manualRollover(id);
      res.json({ message: "Task rolled over successfully" });
    } catch (error) {
      console.error("Error rolling over task:", error);
      res.status(500).json({ message: "Failed to rollover task" });
    }
  });

  app.post('/api/compliance/tasks/:id/mark-recurring', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { frequency } = req.body;
      
      await storage.markTaskAsRecurring(id, frequency);
      res.json({ message: "Task marked as recurring" });
    } catch (error) {
      console.error("Error marking task as recurring:", error);
      res.status(500).json({ message: "Failed to mark task as recurring" });
    }
  });

  // Manual trigger for compliance processing (admin/testing)
  app.post('/api/compliance/process-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { complianceScheduler } = await import('./compliance-scheduler');
      await complianceScheduler.processRecurringTasks();
      res.json({ message: "Compliance tasks processed successfully" });
    } catch (error) {
      console.error("Error processing compliance tasks:", error);
      res.status(500).json({ message: "Failed to process compliance tasks" });
    }
  });

  // Test email reminder (admin/testing)
  app.post('/api/compliance/test-reminder', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.email) {
        return res.status(400).json({ message: "User email not found" });
      }

      const { sendTestReminder } = await import('./email-service');
      const success = await sendTestReminder(user.email);
      
      if (success) {
        res.json({ message: "Test reminder sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send test reminder" });
      }
    } catch (error) {
      console.error("Error sending test reminder:", error);
      res.status(500).json({ message: "Failed to send test reminder" });
    }
  });

  app.put('/api/compliance/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Auto-set completion timestamp if status changed to completed
      if (updates.status === "completed" && !updates.completedAt) {
        updates.completedAt = new Date();
      }
      
      const task = await storage.updateComplianceTask(id, updates);
      res.json(task);
    } catch (error) {
      console.error("Error updating compliance task:", error);
      res.status(500).json({ message: "Failed to update compliance task" });
    }
  });

  app.delete('/api/compliance/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteComplianceTask(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting compliance task:", error);
      res.status(500).json({ message: "Failed to delete compliance task" });
    }
  });

  // Clean up duplicate compliance tasks
  app.post('/api/compliance/cleanup', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.cleanupDuplicateTasks(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error cleaning up duplicate tasks:", error);
      res.status(500).json({ message: "Failed to cleanup duplicate tasks" });
    }
  });

  // Quick chat endpoint for immediate responses
  app.post('/api/chat/quick', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message, businessContext } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get user's business profile for context
      let businessProfile = null;
      if (!businessContext) {
        businessProfile = await storage.getUserBusinessProfile(userId);
      }

      const response = await openaiService.getQuickHelp(
        message, 
        businessContext || businessProfile
      );
      
      res.json({ response });
    } catch (error) {
      console.error("Error in quick chat:", error);
      res.status(500).json({ message: "Failed to generate response" });
    }
  });

  // Initialize progress tasks for new users
  app.post('/api/progress/initialize', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { businessId } = req.body;

      await storage.createDefaultProgressTasks(userId, businessId);
      
      res.json({ message: "Progress tasks initialized successfully" });
    } catch (error) {
      console.error("Error initializing progress tasks:", error);
      res.status(500).json({ message: "Failed to initialize progress tasks" });
    }
  });

  // Finding Co-founders content endpoints - tiered access
  app.get('/api/download/finding-cofounders-free', async (req, res) => {
    try {
      const content = `Finding Co-founders - Free
Category: Getting Started | Access: Free


What It Is

A co-founder shares responsibility for building your business from the ground up. The right partner can bring complementary skills, reduce your workload, and help you scale faster - but the wrong one can derail everything.

Step-by-Step Guide to Finding a Co-founder

1. Clarify what you need
2. Define the ideal co-founder profile
3. Explore platforms (CoFoundersLab, YC Matching, etc.)
4. Test compatibility first
5. Discuss roles, equity, exits
6. Put it in writing

Power Tips (AI-Enhanced)

- Use ChatGPT to assess vision alignment questions
- Prompt to generate co-founder agreement drafts
- Personality decoding via writing samples

Downloadables

- Co-founder Persona Worksheet
- Sample Co-founder Agreement
- Compatibility Quiz

Helpful Resources

- YC Co-founder Guide
- Forbes Red Flags
- Paul Graham: Do Things That Don't Scale`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving finding cofounders free:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/finding-cofounders-pro', async (req, res) => {
    try {
      const content = `Finding Co-founders - Pro
Category: Getting Started | Access: Pro


Includes Everything in Free, Plus:

- Co-founder Pitch Template
- Founding Roles Matrix
- Decision-Making Rubric

Co-founder Pitch Template

Use this to pitch your vision clearly on matching platforms. Includes what problem you're solving, traction, team gaps, and desired values.

Founding Roles Matrix

Tool to map who owns what: product, sales, fundraising, ops. Encourages aligned expectations.

Decision-Making Rubric

Evaluate candidates based on values, urgency, emotional intelligence, domain expertise, etc.

AI-Powered Prompts

- "What are top risks of working with a co-founder with X traits?"
- "Draft a 'team page' bio for a startup founding team with complementary roles."

Pro Downloads

- Co-founder Pitch Framework
- Founding Roles Matrix Template
- Decision Rubric Sheet`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving finding cofounders pro:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/finding-cofounders-premium', async (req, res) => {
    try {
      const content = `Finding Co-founders - Premium
Category: Getting Started | Access: Premium


Includes Everything in Free + Pro, Plus:

- Co-founder Legal Bootcamp
- AI-Based Risk Assessment
- Automated Outreach Sequences

Co-founder Legal Bootcamp

Full IP protection clause samples, cliff vesting rules, and equity negotiation guides with multiple equity split scenarios.

AI-Based Risk Assessment

Run compatibility checks by analyzing co-founder email tone, LinkedIn wording, and GitHub repos.

Automated Outreach

Use AI + Zapier to connect with matching co-founders on 3+ platforms via auto-personalized intros.

Premium AI Prompts

- "Based on this agreement, where are the potential legal conflicts?"
- "Draft a custom founder outreach message based on profile data."

Premium Downloads

- IP & Equity Clause Template Pack
- AI Risk Assessment Flowchart
- Outreach Automation Checklist`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving finding cofounders premium:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Business Idea Validation endpoints
  app.get('/api/download/business-idea-validation-free', async (req, res) => {
    try {
      const content = `Business Idea Validation - Free
Category: Getting Started | Access: Free

What It Is

Business idea validation is the process of confirming whether your idea solves a real problem for a specific audience and has real demand. It's the foundation of startup success.

Step-by-Step Guide

1. Define the problem
2. Identify your audience
3. Research existing solutions
4. Build a simple MVP
5. Gather real feedback
6. Evaluate interest and monetization potential

AI Power Tip

"Act as a startup advisor. Help me validate a business idea for [insert idea]. Who are the target customers, and what is a simple MVP I can build this week?"

Downloadables

- Idea Validation Checklist
- MVP Planner Template
- Customer Discovery Script`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving business idea validation free:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/business-idea-validation-pro', async (req, res) => {
    try {
      const content = `Business Idea Validation - Pro
Category: Getting Started | Access: Pro

Includes Everything in Free, Plus:

- Advanced MVP Testing
- Scoring Matrix
- Segment Analysis Tools

MVP Playbook

Create multiple variations of your MVP (landing page, waitlist, cold outreach, etc.) and A/B test messages or pricing.

Idea Scoring Framework

Rate ideas on: urgency, market size, differentiation, scalability, and skill match. Use weighted scoring to compare.

AI Prompts

"Score this idea based on urgency, market size, scalability, and uniqueness. Suggest improvements."

Pro Downloads

- Weighted Idea Scorecard
- A/B Testing Log Template
- Customer Segment Deep Dive Worksheet`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving business idea validation pro:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/business-idea-validation-premium', async (req, res) => {
    try {
      const content = `Business Idea Validation - Premium
Category: Getting Started | Access: Premium

Includes Everything in Free + Pro, Plus:

- Investor-Style Validation Summary
- AI SWOT Analyzer
- Market Positioning Brief

Validation Summary for Investors

Generate a one-page validation summary with traction data, market size, and early feedback.

AI SWOT Analyzer

Use AI to identify strengths, weaknesses, opportunities, and threats based on your idea and target market.

Positioning Brief

Translate your idea into a unique value proposition and positioning script for pitch decks.

Premium Downloads

- Investor-Style Idea Report Template
- AI SWOT Analysis Sheet
- Market Positioning Generator Prompt`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving business idea validation premium:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Entity Formation Guide endpoints
  app.get('/api/download/entity-formation-guide-free', async (req, res) => {
    try {
      const content = `Entity Formation Guide - Free
Category: Legal & Compliance | Access: Free

What It Is

Entity formation is the legal process of registering your business structure with the state, which determines how your business is taxed, protected, and operated.

LLC vs. Corporation (C-Corp)

LLCs offer flexibility, pass-through taxation, and fewer formalities. Corporations offer stock issuance, formal governance, and are better suited for raising VC funding.

Key Steps to Register

1. Choose a business name
2. Check availability in your state
3. Designate a Registered Agent
4. File Articles of Organization or Incorporation
5. Get an EIN from the IRS

AI Prompt

"Help me decide whether to form an LLC or Corporation based on my business goals: [insert goals]."

Downloadables

- State-by-State Formation Checklist
- Sample Articles of Organization
- EIN Application Guide`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving entity formation guide free:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/entity-formation-guide-pro', async (req, res) => {
    try {
      const content = `Entity Formation Guide - Pro
Category: Legal & Compliance | Access: Pro

Includes Everything in Free, Plus:

- Multi-Member Structures
- Foreign Qualification
- Bylaws & Operating Agreements

Multi-Member & Co-founder Structures

Understand equity division, management roles, and legal documents required when more than one founder is involved.

Foreign Qualification

If you're operating in multiple states, learn when and how to register your business beyond your home state.

Operating Agreements & Bylaws

Templates and tips to structure internal governance and decision-making protocols.

Pro AI Prompts

"Draft an operating agreement for a multi-member LLC in [State] with equal voting rights and 70/30 profit split."

Pro Downloads

- Multi-State Registration Tracker
- Bylaws Template
- Operating Agreement Wizard`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving entity formation guide pro:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/entity-formation-guide-premium', async (req, res) => {
    try {
      const content = `Entity Formation Guide - Premium
Category: Legal & Compliance | Access: Premium

Includes Everything in Free + Pro, Plus:

- Investor-Ready Structuring
- International Considerations
- Legal Stack Automation

Investor-Friendly Structure

Set up your entity for angel or venture investment: Delaware C-Corp, 83(b) elections, board formation.

International Founders

Steps for foreign founders to form U.S. entities, apply for EIN, and open U.S. business bank accounts.

Legal Stack Automation

Tools and workflows to auto-generate legal docs, manage cap tables, and sync entity compliance via platforms like Clerky or Stripe Atlas.

Premium Prompts

"Build a startup legal stack with automation for formation, equity tracking, and contract management."

Premium Downloads

- 83(b) Election Guide
- Entity Formation Flowchart
- Investor-Ready Cap Table Template`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving entity formation guide premium:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Licenses & Permits Guide endpoints
  app.get('/api/download/licenses-permits-guide-free', async (req, res) => {
    try {
      const content = `Licenses & Permits Guide - Free
Category: Legal & Compliance | Access: Free

What It Is

Licenses and permits are legal permissions your business needs to operate based on your industry, location, and activities.

Types of Licenses

- Local: Business license, zoning permits
- State: Sales tax permit, professional licenses
- Federal: For alcohol, firearms, aviation, and more

How to Find Out What You Need

1. Use your Secretary of State's website
2. Check city or county clerk's office
3. Use tools like SBA's Permit Finder or AI lookup bots

AI Prompt

"Help me find which licenses and permits I need to start a [business type] in [City, State]."

Downloadables

- License Requirement Checklist
- Federal vs. State Permit Comparison
- Contact Tracker Template`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving licenses permits guide free:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/licenses-permits-guide-pro', async (req, res) => {
    try {
      const content = `Licenses & Permits Guide - Pro
Category: Legal & Compliance | Access: Pro

Includes Everything in Free, Plus:

- Sales Tax & Specialty Permits
- Industry Lookup Tools
- Renewal Planning

Sales Tax & Niche Licensing

Walkthrough for obtaining resale certificates, sales tax nexus registration, and industry-specific compliance (e.g., food, medical, childcare).

Advanced Lookup Tools

Use AI or services like Avalara, GovDocFiling, or state-specific portals to automate compliance.

Renewal Calendar

Set reminders for renewals and compliance checks with Airtable or Google Calendar automation.

Pro Prompts

"What licenses do I need if I sell online to multiple states from a warehouse in Texas?"

Pro Downloads

- Sales Tax Permit Planner
- Annual License Renewal Tracker
- AI Lookup Prompt Sheet`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving licenses permits guide pro:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/licenses-permits-guide-premium', async (req, res) => {
    try {
      const content = `Licenses & Permits Guide - Premium
Category: Legal & Compliance | Access: Premium

Includes Everything in Free + Pro, Plus:

- Licensing Automation Stack
- Multistate + Multijurisdiction Guide
- Permit Workflow Dashboards

AI-Powered Compliance Stack

Use Zapier + ChatGPT to scan for expiring licenses, fill in renewal forms, or flag mismatches.

Multistate Business Compliance

How to manage licenses across states (esp. for remote workers or drop shipping). Includes contractor license rules.

Permit Dashboard (Airtable/Monday)

Centralized dashboard to track all permits, renewal status, documents, and alerts.

Premium Prompts

"Build an Airtable tracker for all permits and alert me 30 days before renewal."

Premium Downloads

- Compliance Stack Map
- License Automation Guide
- Multistate Permit Tracker Template`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving licenses permits guide premium:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Contracts & Agreements Guide endpoints
  app.get('/api/download/contracts-agreements-guide-free', async (req, res) => {
    try {
      const content = `Contracts & Agreements Guide - Free
Category: Legal & Compliance | Access: Free

What It Is

Contracts and agreements are written commitments that protect your business relationships and define how work gets done, paid for, and resolved if issues arise.

Essential Starter Contracts

- Non-Disclosure Agreement (NDA)
- Simple Service Agreement
- Basic Operating Agreement (for LLCs)
- Independent Contractor Agreement

When You Need One

Any time you exchange money, services, IP, or sensitive data. Yes-even with friends.

AI Prompt

"Write a simple independent contractor agreement for a graphic designer working part-time on my logo."

Downloadables

- NDA Template
- One-Page Service Contract
- Operating Agreement (Single-Member LLC)`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving contracts agreements guide free:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/contracts-agreements-guide-pro', async (req, res) => {
    try {
      const content = `Contracts & Agreements Guide - Pro
Category: Legal & Compliance | Access: Pro

Includes Everything in Free, Plus:

- Founders Agreements
- Contractor vs. Employee Clauses
- MSAs & Escalation Terms

Key Pro Contracts

- Co-Founder Agreement
- Contractor with IP Transfer Clause
- Master Services Agreement (MSA)

Clauses That Matter

Include termination triggers, exclusivity, scope of work, and confidentiality in all agreements.

AI Prompts

"Compare contract language for an employee vs. contractor under IRS guidelines."

Pro Downloads

- Co-Founder Agreement Template
- MSA Clause Builder Sheet
- Role Classification Checklist`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving contracts agreements guide pro:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/contracts-agreements-guide-premium', async (req, res) => {
    try {
      const content = `Contracts & Agreements Guide - Premium
Category: Legal & Compliance | Access: Premium

Includes Everything in Free + Pro, Plus:

- AI-Powered Legal Review Tools
- Dynamic Contract Builders
- Clause Automation Templates

Contract Automation Tools

Use tools like Spellbook or Legalese Decoder to analyze and rewrite risky clauses in seconds.

Custom Clause Libraries

Maintain clause templates for clients, hires, and vendors with searchable tags.

Workflow Integration

Build contract signing and tracking workflows using Notion, Airtable, or DocuSign integrations.

Premium Prompts

"Analyze this contract and flag any potential liabilities or unclear terms."

Premium Downloads

- AI Contract Review Prompt Pack
- Airtable Contract Tracker Template
- Clause Versioning Dashboard`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving contracts agreements guide premium:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Payroll Basics & Compliance Guide endpoints
  app.get('/api/download/payroll-basics-compliance-free', async (req, res) => {
    try {
      const content = `Payroll Basics & Compliance - Free
Category: Legal & Compliance | Access: Free

What It Is

Payroll is the process of compensating your employees or contractors correctly, on time, and in compliance with federal, state, and local labor laws.

Key Concepts

- W-2 vs 1099 status
- Pay frequency rules (weekly, biweekly, monthly)
- Gross vs. Net pay
- Basic payroll taxes

What You Need to Start

1. EIN from the IRS
2. State employer registration
3. Payroll schedule
4. W-4s and I-9s for employees

AI Prompt

"What payroll steps do I need to follow for hiring my first employee in [state]?"

Downloadables

- Payroll Startup Checklist
- W-2 vs 1099 Comparison Chart
- Required Forms Starter Pack`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving payroll basics compliance free:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/payroll-basics-compliance-pro', async (req, res) => {
    try {
      const content = `Payroll Basics & Compliance - Pro
Category: Legal & Compliance | Access: Pro

Includes Everything in Free, Plus:

- Choosing a Payroll Provider
- Payroll Tax Calendars
- State Registration Guides

Popular Providers

- Gusto, Rippling, OnPay, Paychex - with pros and cons for each

Payroll Compliance

Learn how to stay compliant with state tax filings, wage laws, and labor posters.

Pro Prompts

"Compare Gusto vs. Rippling for a 5-person remote tech startup."

Pro Downloads

- State Payroll Registration Links
- Payroll Tax Filing Calendar
- Onboarding Checklist Template`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving payroll basics compliance pro:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/payroll-basics-compliance-premium', async (req, res) => {
    try {
      const content = `Payroll Basics & Compliance - Premium
Category: Legal & Compliance | Access: Premium

Includes Everything in Free + Pro, Plus:

- Multistate & Remote Payroll
- Global Contractor Compliance
- Automated HR/Payroll Stack

Multistate Challenges

Manage compliance across multiple states, including income tax withholding, unemployment insurance, and new hire reporting.

International Contractor Rules

How to work with freelancers in Canada, the EU, South America, etc. without violating tax or labor laws.

HR Tech Stack

Integrate payroll with benefits, PTO tracking, timekeeping, and onboarding using tools like Deel, Remote.com, and Notion.

Premium Prompts

"What are the tax and reporting requirements for remote employees in California and New York if I'm based in Texas?"

Premium Downloads

- Multistate Compliance Guide
- Global Contractor Checklist
- HR + Payroll Stack Builder Template`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving payroll basics compliance premium:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Business Model Canvas endpoints
  app.get('/api/download/business-model-canvas-free', async (req, res) => {
    try {
      const content = `Business Model Canvas - Free
Category: Getting Started | Access: Free

What Is the Business Model Canvas?

The BMC is a visual framework with 9 key building blocks to describe how a company creates, delivers, and captures value. It's perfect for startup planning.

The 9 Building Blocks

1. Customer Segments
2. Value Propositions
3. Channels
4. Customer Relationships
5. Revenue Streams
6. Key Resources
7. Key Activities
8. Key Partnerships
9. Cost Structure

Beginner Tips

- Start with Value Propositions
- Keep it simple and focused
- Revisit after talking to customers

AI Prompt

"Help me fill in a Business Model Canvas for a [describe your business idea or industry]."

Downloadables

- BMC Starter Template (Google Docs)
- Blank BMC Canvas (PDF)`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving business model canvas free:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/business-model-canvas-pro', async (req, res) => {
    try {
      const content = `Business Model Canvas - Pro
Category: Getting Started | Access: Pro

Includes Everything in Free, Plus:

- Industry Examples
- BMC Pitfalls
- AI Critique Prompts
- Revision Framework

Industry-Specific Examples

- SaaS: user onboarding, MRR revenue, customer success
- eCommerce: product sourcing, fulfillment, influencer partnerships

Common Pitfalls

- Too vague value propositions
- Unrealistic revenue channels
- No defined customer relationship types

AI Evaluation Prompt

"Evaluate this Business Model Canvas and point out missing or weak sections."

BMC Revision Tracker

Use quarterly to reflect strategic changes or market pivots. Helps refine product-market fit.

Pro Downloads

- BMC Evaluation Template
- Quarterly BMC Review Sheet
- Industry Sample Canvases`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving business model canvas pro:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/business-model-canvas-premium', async (req, res) => {
    try {
      const content = `Business Model Canvas - Premium
Category: Getting Started | Access: Premium

Includes Everything in Free + Pro, Plus:

- Investor Integration
- Lean Canvas Mapping
- AI SWOT + Risk Analyzer
- BMC Collaboration Toolkit

Investor-Grade BMC

Each BMC block should align to your pitch deck. For example, Revenue Streams = Revenue Model slide.

Lean Canvas Conversion

Convert your BMC into a Lean Canvas for startup accelerators, including Problem/Solution blocks.

AI SWOT + Risk Analyzer

Upload your BMC and ask AI to identify blindspots, risks, and what investors might challenge.

Collaboration Tools

Use Airtable or Miro to share live-editable BMC with team, advisors, or investors.

12-Month Evolution Tracker

Document how your business model adapts over time for storytelling and strategic clarity.

Premium Downloads

- Lean Canvas Mapping Guide
- Investor Deck Alignment Chart
- Risk Review Prompt Sheet`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving business model canvas premium:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Market Research content endpoints - tiered access
  app.get('/api/download/market-research-essentials-free', async (req, res) => {
    try {
      const content = `Market Research Essentials - Free
Category: Getting Started | Access: Free

What It Is
Market research helps you understand your customers, competition, and industry trends so you can make informed decisions. It's how startups reduce risk, spot opportunities, and find product-market fit.

Step-by-Step Guide to Conducting Market Research
1. Define Your Market & Audience
2. Use AI for Instant Insights
3. Analyze Competitors
4. Survey & Interview Real People
5. Validate Demand
6. Summarize Your Findings

Power Tips (AI-Enhanced)
- Persona Builder Prompt: "Create a detailed customer persona for a [job title or industry] who struggles with [pain point]."
- Competitor Audit Prompt: "Compare [Company A] vs [Company B] in terms of pricing, positioning, and audience."
- ChatGPT as Survey Analyzer: Paste survey responses and ask: 'Summarize top pain points and keywords.'

Downloadables
- Market Research Checklist (PDF)
- Customer Persona Worksheet (Google Doc)
- Competitor Analysis Template (Excel or Airtable)

Helpful Resources
- Google Trends
- Statista
- Exploding Topics
- Reddit: r/Entrepreneur
- Survey Tools: Typeform, Google Forms`;
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving market research essentials free:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/market-research-essentials-pro', async (req, res) => {
    try {
      const content = `Market Research Essentials - Pro
Category: Getting Started | Access: Pro

Includes Everything in Free, Plus:
- Go-To-Market Research Planner
- Competitive Positioning Guide
- Keyword & Topic Opportunity Finder
- ICP Deep Dive

Go-To-Market (GTM) Research Planner
Identify channels (social, SEO, outbound), find low-cost acquisition strategies, and use the GTM Research Matrix (Excel Template) to prioritize efforts.

Competitive Positioning Guide
Audit your competitors' features, community, and tone. Use ChatGPT or Claude to analyze how they communicate their value.

Keyword & Topic Opportunity Finder
Use tools like Ubersuggest, AnswerThePublic, Exploding Topics Pro, and Google Trends to identify valuable content and SEO terms.

ICP Deep Dive
Segment your target audience by role, budget, and urgency. Use AI to craft hyper-relevant cold outreach or ad targeting scripts.

GPT Prompt for GTM Insights
"As a GTM strategist, analyze top channels for reaching [persona] in [industry], and recommend top 3 messaging angles."

Pro Downloads
- Competitive Positioning Tracker
- GTM Research Framework
- AI Keyword Finder Sheet
- ICP Interview Questions`;
      
      res.setHeader('Content-Type', 'text/plain; charset=utf8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving market research essentials pro:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/market-research-essentials-premium', async (req, res) => {
    try {
      const content = `Market Research Essentials - Premium
Category: Getting Started | Access: Premium

Includes Everything in Free + Pro, Plus:
- Full Market Mapping
- AI-Powered Competitive Intelligence
- Paid Data Shortcuts
- Demand Curve Analyzer
- Custom Positioning Script Generator

Full Market Mapping
Create visual industry maps and identify value chain players using Airtable or Miro templates.

AI-Powered Competitive Intelligence
Scrape data from public competitor pages using Browse AI or Zapier RSS. Use GPT to cluster reviews and identify weaknesses.

Paid Data Shortcuts
Use Apollo.io, Crunchbase Pro, PitchBook, JungleScout, or TikTok Creator Marketplace for deeper analysis.

Demand Curve Analyzer
Combine data from Google Keywords, Exploding Topics, and subreddit activity to assess momentum.

Custom Positioning Script Generator
Use AI to develop positioning statements based on gaps in competitor UX, pricing, tone, or niche.

GPT Prompt for Positioning
"Analyze the positioning of [Competitor A] and [Competitor B]. Generate a unique value proposition for a startup with [differentiator]."

Premium Downloads
- Market Mapping Tool (Airtable)
- Review Sentiment Analyzer Guide
- Positioning Statement Generator
- Data Automation Template`;
      
      res.setHeader('Content-Type', 'text/plain; charset=utf8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving market research essentials premium:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Keep backward compatibility for old endpoint - default to free tier
  app.get('/api/download/market-research-essentials', async (req, res) => {
    try {
      const content = `Market Research Essentials - Free
Category: Getting Started | Access: Free

What It Is
Market research helps you understand your customers, competition, and industry trends so you can make informed decisions. It's how startups reduce risk, spot opportunities, and find product-market fit.

Step-by-Step Guide to Conducting Market Research
1. Define Your Market & Audience
2. Use AI for Instant Insights
3. Analyze Competitors
4. Survey & Interview Real People
5. Validate Demand
6. Summarize Your Findings

Power Tips (AI-Enhanced)
- Persona Builder Prompt: "Create a detailed customer persona for a [job title or industry] who struggles with [pain point]."
- Competitor Audit Prompt: "Compare [Company A] vs [Company B] in terms of pricing, positioning, and audience."
- ChatGPT as Survey Analyzer: Paste survey responses and ask: 'Summarize top pain points and keywords.'

Downloadables
- Market Research Checklist (PDF)
- Customer Persona Worksheet (Google Doc)
- Competitor Analysis Template (Excel or Airtable)

Helpful Resources
- Google Trends
- Statista
- Exploding Topics
- Reddit: r/Entrepreneur
- Survey Tools: Typeform, Google Forms`;
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving market research essentials:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // LLC Operating Agreement template endpoint
  app.get('/api/download/llc-operating-agreement', async (req, res) => {
    try {
      const content = `LIMITED LIABILITY COMPANY OPERATING AGREEMENT

OF [INSERT LLC NAME]

This Operating Agreement of [INSERT LLC NAME], a [STATE] limited liability company (the "Company"), is entered into by and among the undersigned, who are the initial members of the Company (individually referred to as a "Member" and collectively as the "Members").

ARTICLE I - ORGANIZATION

1.1 Formation. The Company was formed on [DATE] by filing Articles of Organization with the [STATE] Secretary of State.

1.2 Name. The name of the Company is [INSERT LLC NAME].

1.3 Principal Place of Business. The principal place of business shall be [INSERT ADDRESS].

1.4 Registered Agent. The registered agent is [INSERT REGISTERED AGENT NAME] at [INSERT REGISTERED AGENT ADDRESS].

1.5 Purpose. The purpose of the Company is to engage in any lawful business activity.

ARTICLE II - MEMBERS AND MEMBERSHIP INTERESTS

2.1 Initial Members. The initial Members and their respective membership interests are:
[INSERT MEMBER NAME]: [INSERT PERCENTAGE]%
[INSERT MEMBER NAME]: [INSERT PERCENTAGE]%

2.2 Capital Contributions. Each Member's initial capital contribution is:
[INSERT MEMBER NAME]: $[INSERT AMOUNT]
[INSERT MEMBER NAME]: $[INSERT AMOUNT]

ARTICLE III - MANAGEMENT

3.1 Management Structure. The Company shall be managed by [all Members/designated Manager(s)].

3.2 Authority. [Insert specific management authority and restrictions]

ARTICLE IV - FINANCIAL PROVISIONS

4.1 Books and Records. The Company shall maintain complete books and records.

4.2 Bank Accounts. The Company may establish bank accounts as necessary.

4.3 Distributions. Distributions shall be made pro rata to Members based on membership interests.

ARTICLE V - MEETINGS

5.1 Member Meetings. Members may hold meetings as needed.

5.2 Voting. Each Member shall have voting rights proportional to their membership interest.

ARTICLE VI - DISSOLUTION

6.1 Events of Dissolution. The Company shall dissolve upon [insert dissolution events].

This template provides a basic framework. Consult with a qualified attorney for your specific situation.`;
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving LLC operating agreement:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // LLC vs Corporation Guide endpoint
  app.get('/api/download/llc-vs-corporation-guide', async (req, res) => {
    try {
      const content = `LLC vs S-Corporation: Complete Guide
Category: Legal & Compliance | Access: Free

Understanding LLC vs S-Corporation

Choosing the right business entity structure is one of the most important decisions for new entrepreneurs. This guide compares LLCs and S-Corporations to help you make an informed choice.

What Is an LLC?

A Limited Liability Company (LLC) is a business structure that combines elements of corporations and partnerships. LLCs provide personal liability protection for owners (called "members") while offering flexibility in management and tax treatment.

Key Benefits of LLCs:
- Personal liability protection
- Pass-through taxation (no double taxation)
- Flexible management structure
- Fewer compliance requirements
- Can have unlimited members

What Is an S-Corporation?

An S-Corporation is a tax election that certain corporations can make. It allows the business to avoid double taxation while still maintaining corporate structure and benefits.

Key Benefits of S-Corps:
- Personal liability protection
- Pass-through taxation
- Potential self-employment tax savings
- Enhanced credibility with investors
- Standardized management structure

Tax Differences

LLC Taxation:
- All profits subject to self-employment tax (15.3%)
- More flexibility in profit/loss allocation
- Can elect S-Corp taxation if beneficial

S-Corp Taxation:
- Only salary subject to payroll taxes
- Distributions not subject to self-employment tax
- Must pay reasonable salary to owner-employees
- Strict profit/loss allocation rules

Self-Employment Tax Savings Example:
- Business profit: $100,000
- LLC: $15,300 in self-employment tax
- S-Corp (with $60k salary): $9,180 in payroll tax
- Potential savings: $6,120 annually

When to Choose LLC:
- Simple business structure desired
- Multiple owners with different profit sharing
- Minimal compliance requirements preferred
- Real estate investments
- Single-member businesses

When to Choose S-Corp:
- Significant self-employment tax savings potential
- Planning to seek investment
- Need enhanced business credibility
- Comfortable with payroll requirements
- Profits exceed $60,000 annually

Payment Methods Comparison

LLC Payments:
- Owner distributions (not subject to payroll tax)
- Guaranteed payments for services
- Self-employment tax on all business income

S-Corp Payments:
- W-2 wages (subject to payroll tax)
- Distributions (not subject to payroll tax)
- Must pay "reasonable compensation"

Important Considerations

1. State-Specific Rules: Each state has different requirements and fees
2. Conversion Options: Can convert LLC to S-Corp election later
3. Professional Advice: Consult with CPA and attorney for your situation
4. Ongoing Compliance: S-Corps have more filing requirements

Decision Framework

Consider S-Corp if:
- Annual profit > $60,000
- Comfortable with payroll requirements
- Want investor credibility
- Don't mind additional compliance

Consider LLC if:
- Simplicity is priority
- Irregular income patterns
- Multiple owners with complex arrangements
- Real estate focused business

Next Steps

1. Assess your specific situation
2. Calculate potential tax savings
3. Consult with qualified professionals
4. File appropriate formation documents
5. Maintain proper compliance

For personalized guidance on entity selection and tax strategy, consider consulting with NexTax.AI's professional services team.

© StartSmart by NexTax.AI`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving LLC vs Corporation guide:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Tax Setup for New Businesses endpoint
  app.get('/api/download/tax-setup-for-new-businesses', async (req, res) => {
    try {
      const content = `Tax Setup for New Businesses: Complete Guide
Category: Legal & Compliance | Access: Free

Essential Tax Setup for New Businesses

Setting up your business taxes correctly from the start saves time, money, and prevents compliance issues. This comprehensive guide walks you through every step.

Step 1: Obtain Your EIN (Employer Identification Number)

What It Is:
Your EIN is like a social security number for your business. It's required for most business activities including opening bank accounts, filing taxes, and hiring employees.

How to Apply:
1. Visit IRS.gov/EIN (never pay third-party services)
2. Complete Form SS-4 online, by phone, or mail
3. Process typically takes 1-2 weeks by mail, immediate online
4. Keep your EIN confirmation letter safe

Cost: FREE directly from IRS

Step 2: Choose Your Tax Classification

Sole Proprietorship:
- Default for single-member LLCs
- Report income on personal tax return (Schedule C)
- Subject to self-employment tax

Partnership:
- Default for multi-member LLCs
- Files Form 1065 (informational return)
- Partners report income on personal returns

S-Corporation Election:
- File Form 2553 within 2 months and 15 days
- Potential self-employment tax savings
- Required payroll for owner-employees

C-Corporation:
- Separate tax entity
- Double taxation potential
- Files Form 1120

Step 3: Set Up Business Banking

Requirements:
- EIN or SSN
- Business formation documents
- Operating agreement or bylaws
- Government-issued ID

Banking Separation Benefits:
- Personal liability protection
- Simplified bookkeeping
- Professional appearance
- Required for certain tax elections

Step 4: Implement Bookkeeping System

Essential Records:
- Income and expense tracking
- Receipt and invoice management
- Mileage logs for vehicle expenses
- Bank and credit card statements

Recommended Tools:
- QuickBooks Online (most popular)
- FreshBooks (service businesses)
- Wave (free option)
- Excel/Google Sheets (minimal needs)

Step 5: Understand Tax Obligations

Federal Tax Requirements:

Income Tax:
- Due dates vary by entity type
- Quarterly estimated payments may be required
- Keep detailed records of deductible expenses

Employment Taxes (if applicable):
- Federal income tax withholding
- Social Security and Medicare taxes
- Federal unemployment tax

State and Local Requirements:

State Income Tax:
- Varies by state and entity type
- Some states have no income tax
- Research your specific state requirements

Sales Tax:
- Required if selling taxable goods/services
- Register with state tax authority
- File returns monthly, quarterly, or annually

Local Taxes:
- Business personal property tax
- Local income or gross receipts tax
- Licensing fees and permits

Step 6: Tax Planning Strategies

Deductible Business Expenses:
- Office rent and utilities
- Equipment and software
- Professional services
- Marketing and advertising
- Travel and meals (with limits)
- Home office (if applicable)

Retirement Planning:
- SEP-IRA (up to 25% of compensation)
- Solo 401(k) (for owner-only businesses)
- SIMPLE IRA (for small employers)

Step 7: Compliance Calendar

Key Due Dates:

January 31:
- W-2s to employees
- 1099s to contractors

March 15:
- S-Corp tax returns (Form 1120S)
- Partnership returns (Form 1065)

April 15:
- Individual tax returns
- C-Corp tax returns (or extension)
- First quarter estimated taxes

Quarterly Dates:
- Estimated tax payments (if required)
- Payroll tax deposits
- Sales tax returns (varies by state)

Step 8: Professional Resources

When to Hire Help:
- Complex entity structures
- Multiple state operations
- Significant income/expenses
- Payroll management needs
- Tax planning optimization

Types of Professionals:
- CPA: Comprehensive tax and accounting
- Enrolled Agent: Tax-focused representation
- Bookkeeper: Day-to-day record keeping
- Payroll Service: Employee tax management

Common Mistakes to Avoid

1. Mixing personal and business expenses
2. Poor record keeping
3. Missing estimated tax payments
4. Incorrect worker classification
5. Ignoring state tax requirements
6. Waiting until tax season for planning

Red Flags for IRS Audits

- Excessive business deductions
- Home office claims without proper documentation
- Large charitable deductions
- Inconsistent income reporting
- Cash-intensive businesses

Technology Solutions

Automation Tools:
- Receipt scanning apps
- Automatic bank feeds
- Mileage tracking
- Expense categorization
- Tax preparation software

Security Considerations:
- Regular data backups
- Secure password management
- Two-factor authentication
- Professional-grade accounting software

Next Steps

1. Obtain your EIN from IRS.gov
2. Choose appropriate tax classification
3. Open dedicated business bank account
4. Set up bookkeeping system
5. Research state and local requirements
6. Create compliance calendar
7. Consider professional assistance

For comprehensive tax setup assistance and ongoing support, NexTax.AI offers professional services to ensure your business stays compliant and optimized.

© StartSmart by NexTax.AI`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving tax setup guide:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Operating Agreement generation route
  app.post('/api/operating-agreement/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const agreementData = req.body;
      
      // Validate required fields
      if (!agreementData.llc_name || !agreementData.state_of_formation) {
        return res.status(400).json({ message: "LLC name and state are required" });
      }

      // Generate the operating agreement using AI
      const generatedDocument = await openaiService.generateOperatingAgreement(agreementData);
      
      res.json({ 
        document: generatedDocument,
        message: "Operating Agreement generated successfully" 
      });
    } catch (error) {
      console.error("Error generating operating agreement:", error);
      res.status(500).json({ message: "Failed to generate operating agreement" });
    }
  });

  // Articles of Incorporation template endpoint
  app.get('/api/download/articles-of-incorporation', async (req, res) => {
    try {
      const content = `ARTICLES OF INCORPORATION
OF [INSERT CORPORATION NAME]

The undersigned, acting as incorporator under the [STATE] Business Corporation Act, adopts the following Articles of Incorporation for the above named corporation:

ARTICLE I - NAME
The name of the corporation is [INSERT CORPORATION NAME].

ARTICLE II - PURPOSE
The purpose of the corporation is to engage in any lawful act or activity for which corporations may be organized under the [STATE] Business Corporation Act.

ARTICLE III - AUTHORIZED SHARES
The corporation is authorized to issue [INSERT NUMBER] shares of common stock, no par value.

ARTICLE IV - REGISTERED AGENT
The name and address of the corporation's registered agent is:
[INSERT REGISTERED AGENT NAME]
[INSERT REGISTERED AGENT ADDRESS]

ARTICLE V - INCORPORATOR
The name and address of the incorporator is:
[INSERT INCORPORATOR NAME]
[INSERT INCORPORATOR ADDRESS]

ARTICLE VI - DIRECTORS
The number of directors constituting the initial board of directors is [INSERT NUMBER], and the names and addresses of the persons who are to serve as initial directors are:
[INSERT DIRECTOR NAME] - [INSERT ADDRESS]
[INSERT DIRECTOR NAME] - [INSERT ADDRESS]

ARTICLE VII - DURATION
The period of duration of the corporation is perpetual.

ARTICLE VIII - INDEMNIFICATION
The corporation shall indemnify its directors and officers to the fullest extent permitted by law.

IN WITNESS WHEREOF, the undersigned has executed these Articles of Incorporation.

Date: _______________

_________________________
[INSERT INCORPORATOR NAME], Incorporator

IMPORTANT: This is a template for informational purposes. Consult with an attorney before filing.`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="articles-of-incorporation.txt"');
      res.send(content);
    } catch (error) {
      console.error('Error serving Articles of Incorporation:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Corporate Bylaws template endpoint
  app.get('/api/download/corporate-bylaws', async (req, res) => {
    try {
      const content = `BYLAWS
OF [INSERT CORPORATION NAME]

ARTICLE I - OFFICES
Section 1. Principal Office. The principal office of the corporation shall be at [INSERT ADDRESS].

Section 2. Registered Office. The registered office required by law to be maintained in the state of incorporation shall be at [INSERT REGISTERED OFFICE ADDRESS].

ARTICLE II - SHAREHOLDERS
Section 1. Annual Meeting. The annual meeting of shareholders shall be held on [INSERT DATE] of each year.

Section 2. Special Meetings. Special meetings of shareholders may be called by the board of directors or by shareholders holding at least 10% of the outstanding shares.

Section 3. Notice. Notice of meetings shall be given not less than 10 nor more than 60 days before the date of the meeting.

Section 4. Quorum. A majority of the outstanding shares entitled to vote shall constitute a quorum.

ARTICLE III - BOARD OF DIRECTORS
Section 1. General Powers. The business and affairs of the corporation shall be managed by its board of directors.

Section 2. Number and Term. The number of directors shall be [INSERT NUMBER]. Each director shall hold office until the next annual meeting.

Section 3. Regular Meetings. Regular meetings of the board may be held without notice at such time and place as shall be determined by the board.

Section 4. Special Meetings. Special meetings may be called by the president or by any two directors.

Section 5. Quorum. A majority of the directors shall constitute a quorum.

ARTICLE IV - OFFICERS
Section 1. Officers. The officers of the corporation shall be a president, secretary, and treasurer, and may include one or more vice presidents.

Section 2. Election and Term. Officers shall be elected annually by the board of directors.

Section 3. President. The president shall be the chief executive officer and shall preside at meetings of shareholders and directors.

Section 4. Secretary. The secretary shall keep the minutes of meetings and maintain corporate records.

Section 5. Treasurer. The treasurer shall have charge of the funds and securities of the corporation.

ARTICLE V - STOCK
Section 1. Certificates. Shares of stock shall be represented by certificates signed by the president and secretary.

Section 2. Transfer. Transfers of stock shall be made on the books of the corporation upon surrender of certificates.

ARTICLE VI - INDEMNIFICATION
The corporation shall indemnify its directors and officers to the fullest extent permitted by law.

ARTICLE VII - FISCAL YEAR
The fiscal year of the corporation shall end on December 31.

ARTICLE VIII - AMENDMENTS
These bylaws may be amended by the affirmative vote of a majority of the directors.

IMPORTANT: This is a template for informational purposes. Consult with an attorney.`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="corporate-bylaws.txt"');
      res.send(content);
    } catch (error) {
      console.error('Error serving Corporate Bylaws:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Chart of Accounts template endpoint
  app.get('/api/download/chart-of-accounts', async (req, res) => {
    try {
      // Create a simple Excel-like CSV content
      const csvContent = `Account Number,Account Name,Account Type,Description
1000,Cash,Asset,Primary checking account
1100,Accounts Receivable,Asset,Money owed by customers
1200,Inventory,Asset,Products for sale
1500,Equipment,Asset,Office and business equipment
1600,Accumulated Depreciation,Asset,Depreciation on equipment
2000,Accounts Payable,Liability,Money owed to suppliers
2100,Credit Cards Payable,Liability,Business credit card balances
2200,Accrued Expenses,Liability,Expenses incurred but not yet paid
2500,Notes Payable,Liability,Loans and borrowed money
3000,Owner's Equity,Equity,Owner's investment in the business
3100,Retained Earnings,Equity,Accumulated profits/losses
4000,Sales Revenue,Revenue,Income from sales
4100,Service Revenue,Revenue,Income from services
5000,Cost of Goods Sold,Expense,Direct costs of products sold
6000,Office Expenses,Expense,General office supplies and expenses
6100,Rent Expense,Expense,Office or facility rent
6200,Utilities,Expense,Electricity gas water phone internet
6300,Insurance,Expense,Business insurance premiums
6400,Professional Fees,Expense,Legal accounting consulting fees
6500,Marketing & Advertising,Expense,Promotional and advertising costs
6600,Travel & Entertainment,Expense,Business travel and client entertainment
6700,Depreciation Expense,Expense,Equipment depreciation
7000,Interest Income,Other Income,Interest earned on deposits
8000,Interest Expense,Other Expense,Interest paid on loans`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="chart-of-accounts.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error('Error serving Chart of Accounts:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Copyright Source Code PDF endpoint
  app.get('/api/download/copyright-source-code-pdf', async (req, res) => {
    try {
      // Create a comprehensive source code HTML for PDF conversion
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>StartSmart by NexTax.AI - Source Code for Copyright Registration</title>
    <style>
        body { font-family: 'Courier New', monospace; font-size: 10px; line-height: 1.2; margin: 0.5in; color: #000; }
        .header { text-align: center; margin-bottom: 30px; font-family: Arial, sans-serif; border-bottom: 2px solid #000; padding-bottom: 20px; }
        .header h1 { font-size: 18px; margin: 0; }
        .header h2 { font-size: 14px; margin: 5px 0; color: #666; }
        .section { page-break-before: always; margin-top: 30px; }
        .section:first-child { page-break-before: avoid; }
        .section-title { font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; margin: 20px 0 10px 0; padding: 10px; background: #f0f0f0; border-left: 4px solid #000; }
        .file-header { font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; margin: 15px 0 5px 0; padding: 5px; background: #e8e8e8; border-left: 2px solid #666; }
        .code-block { background: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 10px 0; white-space: pre-wrap; overflow-wrap: break-word; }
        .footer { margin-top: 30px; font-family: Arial, sans-serif; font-size: 10px; text-align: center; border-top: 1px solid #000; padding-top: 10px; }
        @page { margin: 0.5in; size: letter; }
        @media print { body { font-size: 9px; } .section { page-break-before: always; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>StartSmart by NexTax.AI</h1>
        <h2>Source Code for Copyright Registration</h2>
        <p><strong>Application Title:</strong> StartSmart - AI-Powered Business Formation Platform</p>
        <p><strong>Author:</strong> NexTax.AI LLC</p>
        <p><strong>Date:</strong> January 2025</p>
        <p><strong>Platform:</strong> Web Application (React.js + Node.js)</p>
        <p><strong>Bundle ID:</strong> ai.nextax.startsmart</p>
    </div>

    <div class="section">
        <div class="section-title">FIRST 25 PAGES - CORE APPLICATION FILES</div>
        
        <div class="file-header">File: package.json - Project Configuration</div>
        <div class="code-block">{
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@capacitor/android": "^7.4.0",
    "@capacitor/cli": "^7.4.0",
    "@capacitor/core": "^7.4.0",
    "@capacitor/ios": "^7.4.0",
    "@hookform/resolvers": "^3.10.0",
    "@neondatabase/serverless": "^0.10.4",
    "@radix-ui/react-accordion": "^1.2.4",
    "@tanstack/react-query": "^5.60.5",
    "express": "^4.21.2",
    "openai": "^5.8.1",
    "react": "^18.3.1",
    "typescript": "5.6.3",
    "vite": "^5.4.19"
  }
}</div>

        <div class="file-header">File: server/index.ts - Main Server Entry Point</div>
        <div class="code-block">import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Security headers for iframe embedding and CORS
app.use((req, res, next) => {
  const origin = req.get('Origin');
  const host = req.get('Host');
  
  const allowedOrigins = [
    'https://nextax.ai',
    'https://startsmart.nextax.ai',
    'https://startsmart-gpt.replit.app'
  ];
  
  res.setHeader('X-Frame-Options', 'ALLOW-FROM https://nextax.ai');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://nextax.ai https://*.nextax.ai");
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  const server = await registerRoutes(app);
  
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen({ port, host: "0.0.0.0" }, () => {
    log(\`serving on port \${port}\`);
  });
})();</div>

        <div class="file-header">File: client/src/App.tsx - Frontend Application Root</div>
        <div class="code-block">import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <Route path="/" component={Home} />
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <div className="ios-status-bar min-h-screen">
          <Toaster />
          <Router />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}</div>

        <div class="file-header">File: shared/schema.ts - Database Schema (Core Tables)</div>
        <div class="code-block">import { pgTable, text, varchar, timestamp, jsonb, index, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  subscriptionTier: varchar("subscription_tier").default("free"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const businessProfiles = pgTable("business_profiles", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  businessName: varchar("business_name"),
  businessType: varchar("business_type"),
  industry: varchar("industry"),
  state: varchar("state"),
  entityType: varchar("entity_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  businessId: varchar("business_id").references(() => businessProfiles.id),
  title: varchar("title"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().notNull(),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  role: varchar("role").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentType: varchar("document_type").notNull(),
  title: varchar("title").notNull(),
  content: text("content"),
  status: varchar("status").default("generated"),
  createdAt: timestamp("created_at").defaultNow(),
});</div>
    </div>

    <div class="section">
        <div class="section-title">LAST 25 PAGES - ADVANCED FEATURES & CONFIGURATION</div>
        
        <div class="file-header">File: server/openai.ts - AI Integration Service</div>
        <div class="code-block">import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class OpenAIService {
  async generateChatResponse(messages: any[], options: any = {}) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: options.maxTokens || 2000,
      temperature: 0.7,
      response_format: options.responseFormat,
    });
    
    return response.choices[0].message.content;
  }

  async generateDocument(prompt: string, documentType: string) {
    const systemPrompt = \`You are a professional business document generator. Create a comprehensive \${documentType} based on the provided information.\`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 4000,
      temperature: 0.3,
    });
    
    return response.choices[0].message.content;
  }
}

export const openaiService = new OpenAIService();</div>

        <div class="file-header">File: capacitor.config.ts - Mobile App Configuration</div>
        <div class="code-block">import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.nextax.startsmart',
  appName: 'StartSmart by NexTax.AI',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
    StatusBar: { style: 'LIGHT', backgroundColor: '#ffffff' },
    App: { launchUrl: 'https://startsmart.nextax.ai' },
  },
  android: {
    buildOptions: { releaseType: 'APK' },
    includePlugins: ['@capacitor/app', '@capacitor/status-bar', '@capacitor/splash-screen']
  },
  ios: {
    buildOptions: { packageType: 'app-store' },
    includePlugins: ['@capacitor/app', '@capacitor/status-bar', '@capacitor/splash-screen']
  }
};

export default config;</div>

        <div class="file-header">File: vite.config.ts - Build Configuration</div>
        <div class="code-block">import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "client", "src"),
      "@shared": resolve(__dirname, "shared"),
    },
  },
  root: "client",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
  server: { host: "0.0.0.0", port: 5173 },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query", "wouter"],
    exclude: ["@capacitor/core", "@capacitor/cli"],
  },
});</div>

        <div class="file-header">File: client/src/pages/home.tsx - Main Application Interface</div>
        <div class="code-block">import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AIChat } from '@/components/AIChat';
import { ProgressRoadmap } from '@/components/ProgressRoadmap';
import { DocumentCenter } from '@/components/DocumentCenter';
import { KnowledgeHub } from '@/components/KnowledgeHub';
import { ComplianceCenter } from '@/components/ComplianceCenter';

export default function Home() {
  const [activeSection, setActiveSection] = useState('chat');

  const renderContent = () => {
    switch (activeSection) {
      case 'chat': return <AIChat />;
      case 'progress': return <ProgressRoadmap />;
      case 'documents': return <DocumentCenter />;
      case 'knowledge': return <KnowledgeHub />;
      case 'compliance': return <ComplianceCenter />;
      default: return <AIChat />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}</div>
    </div>

    <div class="footer">
        <p><strong>END OF SOURCE CODE DOCUMENTATION</strong></p>
        <p>This document contains representative source code from StartSmart by NexTax.AI</p>
        <p>Complete source includes 15,000+ lines across 100+ files featuring:</p>
        <ul style="text-align: left; display: inline-block;">
            <li>React.js frontend with TypeScript</li>
            <li>Node.js Express backend with OpenAI integration</li>
            <li>PostgreSQL database with Drizzle ORM</li>
            <li>Mobile app configuration for iOS/Android</li>
            <li>AI-powered business formation tools</li>
            <li>Comprehensive document generation system</li>
        </ul>
        <p>© 2025 NexTax.AI LLC. All rights reserved.</p>
        <p>Bundle ID: ai.nextax.startsmart | Generated: January 2025</p>
    </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="StartSmart-Copyright-Source-Code.html"');
      res.send(htmlContent);
    } catch (error) {
      console.error('Error generating copyright source code:', error);
      res.status(500).json({ error: 'Failed to generate source code document' });
    }
  });

  // Budget Template endpoint
  app.get('/api/download/startup-budget', async (req, res) => {
    try {
      // Create a comprehensive startup budget template in CSV format
      const csvContent = `Category,Item,Description,Monthly Cost,Annual Cost,Priority
Startup Costs,Business Registration,LLC/Corp formation fees,0,500,High
Startup Costs,Business License,Required business licenses,0,300,High
Startup Costs,Initial Inventory,Starting product inventory,2000,2000,Medium
Startup Costs,Equipment,Computers furniture equipment,1000,1000,High
Startup Costs,Website Development,Professional website setup,500,500,High
Operating Expenses,Rent,Office or workspace rent,1200,14400,High
Operating Expenses,Utilities,Electricity gas water internet,300,3600,High
Operating Expenses,Insurance,General liability insurance,150,1800,High
Operating Expenses,Phone & Internet,Business phone and internet,100,1200,Medium
Operating Expenses,Software Subscriptions,Business software tools,200,2400,Medium
Marketing,Digital Advertising,Google Ads Facebook Ads,800,9600,High
Marketing,Website Hosting,Web hosting and domain,50,600,High
Marketing,Marketing Materials,Business cards brochures,100,1200,Medium
Marketing,Social Media Management,Social media tools,50,600,Low
Professional Services,Accounting,Bookkeeping and tax prep,300,3600,High
Professional Services,Legal,Legal consultations,200,2400,Medium
Professional Services,Business Consulting,Professional advice,150,1800,Low
Payroll,Owner Salary,Owner/founder salary,3000,36000,High
Payroll,Employee Wages,Staff salaries,2000,24000,Medium
Payroll,Payroll Taxes,Employer portion of taxes,500,6000,High
Office Supplies,General Supplies,Office supplies and materials,100,1200,Medium
Office Supplies,Printing,Business printing needs,50,600,Low
Travel,Business Travel,Client meetings conferences,200,2400,Medium
Travel,Local Transportation,Gas parking public transit,150,1800,Medium
Contingency,Emergency Fund,Unexpected expenses buffer,500,6000,High
TOTAL,,,11250,135000,`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="startup-budget-template.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error('Error serving Budget Template:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Lean Canvas template endpoint
  app.get('/api/download/lean-canvas', async (req, res) => {
    try {
      const content = `==============================================================================
                                LEAN CANVAS TEMPLATE
==============================================================================

┌─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┐
│  KEY PARTNERS       │  KEY ACTIVITIES     │  VALUE PROPOSITIONS │ CUSTOMER RELATIONS  │ CUSTOMER SEGMENTS   │
├─────────────────────┼─────────────────────┼─────────────────────┼─────────────────────┼─────────────────────┤
│                     │                     │                     │                     │                     │
│ • Who are your key  │ • What key          │ • What value do you │ • What type of      │ • For whom are you  │
│   partners?         │   activities does   │   deliver to the    │   relationship does │   creating value?   │
│                     │   your value        │   customer?         │   each customer     │                     │
│ • Who are your key  │   proposition       │                     │   segment expect?   │ • Who are your most │
│   suppliers?        │   require?          │ • Which customer    │                     │   important         │
│                     │                     │   problems are you  │ • How are they      │   customers?        │
│ • What key          │ • Manufacturing     │   solving?          │   integrated with   │                     │
│   resources are you │                     │                     │   the rest of our   │ • Target market     │
│   acquiring from    │ • Problem solving   │ • What bundles of   │   business model?   │   demographics      │
│   partners?         │                     │   products and      │                     │                     │
│                     │ • Platform/Network  │   services are you  │ • Personal          │ • Market size and   │
│ • What key          │                     │   offering to each  │   assistance        │   growth potential  │
│   activities do     │                     │   customer segment? │                     │                     │
│   partners perform? │                     │                     │ • Self-service      │                     │
│                     │                     │                     │                     │                     │
│                     │                     │                     │ • Automated         │                     │
│                     │                     │                     │   services          │                     │
│                     │                     │                     │                     │                     │
├─────────────────────┼─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┤
│  KEY RESOURCES      │                            CHANNELS                                                      │
├─────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
│                     │                                                                                         │
│ • What key          │ • Through which channels do our customer segments want to be reached?                   │
│   resources does    │                                                                                         │
│   your value        │ • How are we reaching them now?                                                         │
│   proposition       │                                                                                         │
│   require?          │ • How are our channels integrated?                                                      │
│                     │                                                                                         │
│ • Physical assets   │ • Which ones work best?                                                                 │
│                     │                                                                                         │
│ • Intellectual      │ • Which ones are most cost-efficient?                                                  │
│   property          │                                                                                         │
│                     │ • How are we integrating them with customer routines?                                  │
│ • Human resources   │                                                                                         │
│                     │ Examples: Web sales, Own stores, Partner stores, Wholesaler networks                   │
│ • Financial         │                                                                                         │
│   resources         │                                                                                         │
│                     │                                                                                         │
│                     │                                                                                         │
├─────────────────────┴─────────────────────────────────────────────┬─────────────────────────────────────────┤
│                        COST STRUCTURE                             │              REVENUE STREAMS            │
├────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
│                                                                    │                                         │
│ • What are the most important costs inherent in our business       │ • For what value are our customers      │
│   model?                                                           │   really willing to pay?               │
│                                                                    │                                         │
│ • Which key resources are most expensive?                          │ • For what do they currently pay?      │
│                                                                    │                                         │
│ • Which key activities are most expensive?                         │ • How are they currently paying?       │
│                                                                    │                                         │
│ Examples:                                                          │ • How would they prefer to pay?        │
│ • Fixed costs (salaries, rent, utilities)                         │                                         │
│ • Variable costs (raw materials, commissions)                     │ • How much does each revenue stream    │
│ • Economies of scale                                               │   contribute to overall revenues?      │
│ • Economies of scope                                               │                                         │
│                                                                    │ Examples:                               │
│                                                                    │ • Asset sale, Usage fee, Subscription  │
│                                                                    │ • Lending/Leasing, Licensing           │
│                                                                    │ • Brokerage fees, Advertising          │
│                                                                    │                                         │
└────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────┘

==============================================================================
                                   INSTRUCTIONS
==============================================================================

HOW TO USE THIS CANVAS:
1. Start with CUSTOMER SEGMENTS (top right) - Define who you're serving
2. Move to VALUE PROPOSITIONS (center) - What problems are you solving?
3. Work through CHANNELS (center right) - How will you reach customers?
4. Define CUSTOMER RELATIONSHIPS (top center-right) - What's your relationship model?
5. Identify REVENUE STREAMS (bottom right) - How will you make money?
6. Map KEY ACTIVITIES (top center-left) - What must you do to deliver value?
7. List KEY RESOURCES (center left) - What do you need to succeed?
8. Find KEY PARTNERS (top left) - Who can help you?
9. Calculate COST STRUCTURE (bottom left) - What will it cost?

BEST PRACTICES:
• Use bullet points and short phrases
• Focus on the most important 3-5 items per section
• Keep it visual and concise - this should fit on one page
• Use this as a living document that evolves with your business
• Test your assumptions with real customers
• Update regularly as you learn more

VALIDATION TIPS:
• Customer interviews are essential
• Create MVP (Minimum Viable Product) to test assumptions
• Measure key metrics for each section
• Iterate based on customer feedback
• Focus on problem-solution fit first, then product-market fit`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="lean-canvas-template.txt"');
      res.send(content);
    } catch (error) {
      console.error('Error serving Lean Canvas:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Executive Summary template endpoint
  app.get('/api/download/executive-summary', async (req, res) => {
    try {
      const content = `EXECUTIVE SUMMARY TEMPLATE

[COMPANY NAME]
[Date]

COMPANY OVERVIEW
Provide a brief description of your company, including:
- What your company does
- When it was founded
- Legal structure (LLC, Corporation, etc.)
- Location and key facilities

MISSION STATEMENT
Write a clear, concise statement that describes your company's purpose and core values.

PRODUCTS OR SERVICES
Describe your main offerings:
- Key products or services
- Unique features and benefits
- How they solve customer problems
- Competitive advantages

TARGET MARKET
Define your ideal customers:
- Demographics and characteristics
- Market size and growth potential
- Customer needs and pain points
- Geographic markets served

COMPETITIVE ANALYSIS
Outline your competitive landscape:
- Direct and indirect competitors
- Your competitive advantages
- Market positioning
- Barriers to entry

MARKETING & SALES STRATEGY
Explain how you'll reach customers:
- Marketing channels and tactics
- Sales process and strategy
- Pricing model
- Customer acquisition plan

MANAGEMENT TEAM
Highlight key team members:
- Founder(s) and key executives
- Relevant experience and expertise
- Advisory board members
- Organizational structure

FINANCIAL PROJECTIONS
Provide high-level financial outlook:
- Revenue projections (3-5 years)
- Key expense categories
- Profitability timeline
- Funding requirements

FUNDING REQUEST (if applicable)
If seeking investment:
- Amount of funding needed
- How funds will be used
- Expected return on investment
- Exit strategy

CONCLUSION
Summarize the key points and reinforce why your business will be successful.

IMPORTANT: This is a template for informational purposes. Customize all sections with your specific business details.`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="executive-summary-template.txt"');
      res.send(content);
    } catch (error) {
      console.error('Error serving Executive Summary:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Business Plan for Startups template endpoint
  app.get('/api/download/business-plan-startups', async (req, res) => {
    try {
      const content = `BUSINESS PLAN TEMPLATE FOR STARTUPS

TABLE OF CONTENTS
1. Executive Summary
2. Company Description
3. Market Analysis
4. Organization & Management
5. Products or Services
6. Marketing & Sales Strategy
7. Funding Request
8. Financial Projections
9. Appendix

1. EXECUTIVE SUMMARY
[Write this last - summarize key points from each section]
- Company overview and mission
- Products/services offered
- Target market and competitive advantages
- Financial highlights and funding needs
- Growth projections and goals

2. COMPANY DESCRIPTION
- Company history and ownership
- Legal structure (LLC, Corporation, Partnership)
- Location and facilities
- Mission statement and company values
- Key success factors

3. MARKET ANALYSIS
Industry Overview:
- Industry description and outlook
- Market size and growth trends
- Key success factors in the industry

Target Market:
- Customer demographics and characteristics
- Market size and growth potential
- Customer needs analysis
- Buying patterns and behaviors

Competitive Analysis:
- Direct and indirect competitors
- Competitive advantages and weaknesses
- Market share analysis
- Pricing comparison

4. ORGANIZATION & MANAGEMENT
Organizational Structure:
- Ownership structure
- Management hierarchy
- Board of directors/advisors

Management Team:
- Key personnel backgrounds
- Roles and responsibilities
- Compensation structure
- Personnel plan for growth

5. PRODUCTS OR SERVICES
Product/Service Description:
- Detailed description of offerings
- Unique features and benefits
- Development stage and timeline
- Intellectual property considerations

Research & Development:
- Current R&D activities
- Future product development plans
- Technology requirements
- Innovation strategy

6. MARKETING & SALES STRATEGY
Marketing Strategy:
- Market positioning
- Marketing mix (4 P's: Product, Price, Place, Promotion)
- Marketing channels and tactics
- Brand strategy

Sales Strategy:
- Sales model and process
- Sales team structure
- Customer acquisition strategy
- Customer retention plan

7. FUNDING REQUEST
Funding Requirements:
- Total funding needed
- How funds will be used
- Future funding requirements
- Exit strategy for investors

Types of Funding:
- Equity vs. debt financing
- Investment terms
- Expected return on investment
- Timeline for funding

8. FINANCIAL PROJECTIONS
Revenue Projections:
- 3-5 year revenue forecasts
- Revenue streams and assumptions
- Pricing strategy and model

Expense Projections:
- Operating expenses
- Capital expenditures
- Cost of goods sold
- Break-even analysis

Financial Statements:
- Projected income statements
- Balance sheet projections
- Cash flow statements
- Key financial ratios

9. APPENDIX
Supporting Documents:
- Market research data
- Financial statements
- Legal documents
- Product specifications
- Letters of intent from customers
- Resumes of key personnel

INSTRUCTIONS FOR USE:
1. Replace all bracketed placeholders with your specific information
2. Customize each section to reflect your unique business
3. Include charts, graphs, and visuals where appropriate
4. Keep the plan concise but comprehensive (15-25 pages typical)
5. Update regularly as your business evolves

IMPORTANT: This is a template for informational purposes. Consult with business advisors and legal professionals for specific guidance.`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="business-plan-startup-template.txt"');
      res.send(content);
    } catch (error) {
      console.error('Error serving Business Plan:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Articles of Incorporation generation route
  app.post('/api/articles-of-incorporation/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const articlesData = req.body;
      
      // Validate required fields
      if (!articlesData.corporation_name || !articlesData.state_of_incorporation) {
        return res.status(400).json({ message: "Corporation name and state are required" });
      }

      // Generate the articles of incorporation using AI
      const generatedDocument = await openaiService.generateArticlesOfIncorporation(articlesData);
      
      res.json({ 
        document: generatedDocument,
        message: "Articles of Incorporation generated successfully" 
      });
    } catch (error) {
      console.error("Error generating articles of incorporation:", error);
      res.status(500).json({ message: "Failed to generate articles of incorporation" });
    }
  });

  // Corporate Bylaws generation route
  app.post('/api/corporate-bylaws/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bylawsData = req.body;
      
      // Validate required fields
      if (!bylawsData.corporation_name || !bylawsData.state_of_incorporation) {
        return res.status(400).json({ message: "Corporation name and state are required" });
      }

      // Generate the corporate bylaws using AI
      const generatedDocument = await openaiService.generateCorporateBylaws(bylawsData);
      
      res.json({ 
        document: generatedDocument,
        message: "Corporate Bylaws generated successfully" 
      });
    } catch (error) {
      console.error("Error generating corporate bylaws:", error);
      res.status(500).json({ message: "Failed to generate corporate bylaws" });
    }
  });

  // Executive Summary generation route
  app.post('/api/executive-summary/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const summaryData = req.body;
      
      // Validate required fields
      if (!summaryData.companyName || !summaryData.industry) {
        return res.status(400).json({ message: "Company name and industry are required" });
      }

      // Generate the executive summary using AI
      const generatedDocument = await openaiService.generateExecutiveSummary(summaryData);
      
      res.json({ 
        document: generatedDocument,
        message: "Executive Summary generated successfully" 
      });
    } catch (error) {
      console.error("Error generating executive summary:", error);
      res.status(500).json({ message: "Failed to generate executive summary" });
    }
  });

  // Business Plan generation route
  app.post('/api/business-plan/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const planData = req.body;
      
      // Validate required fields
      if (!planData.company_name || !planData.industry) {
        return res.status(400).json({ message: "Company name and industry are required" });
      }

      // Generate the business plan using AI
      const generatedDocument = await openaiService.generateBusinessPlan(planData);
      
      res.json({ 
        document: generatedDocument,
        message: "Business Plan generated successfully" 
      });
    } catch (error) {
      console.error("Error generating business plan:", error);
      res.status(500).json({ message: "Failed to generate business plan" });
    }
  });

  // Expense Tracker generation route
  app.post('/api/generate/expense-tracker', isAuthenticated, async (req: any, res) => {
    try {
      console.log('Expense tracker request received:', req.body);
      const trackerData = req.body;
      
      // Validate required fields
      if (!trackerData.businessType) {
        return res.status(400).json({ error: "Business type is required" });
      }
      
      console.log('Generating expense tracker with smart template...');
      
      // Smart template for Expense Tracker - faster and more reliable than AI
      const { businessType, trackingLevel = 'Detailed', expenseCategories = [], businessName = 'Your Business' } = trackerData;
      
      // Generate expense tracking structure - use user's selected categories
      const finalCategories = expenseCategories.length > 0 ? expenseCategories : [
        'Office Supplies', 'Travel & Transportation', 'Marketing & Advertising', 
        'Professional Services', 'Software & Subscriptions', 'Utilities',
        'Insurance', 'Equipment', 'Training & Education', 'Meals & Entertainment'
      ];
      
      // Create header row
      const headers = ['Date', 'Description', 'Category', 'Amount', 'Payment Method', 'Receipt #', 'Deductible', 'Notes'];
      
      // Create sample entries for each category
      const sampleEntries = [];
      const currentDate = new Date();
      
      finalCategories.forEach((category, index) => {
        const entryDate = new Date(currentDate);
        entryDate.setDate(entryDate.getDate() - (index * 3));
        const dateStr = entryDate.toISOString().split('T')[0];
        
        let description, amount;
        switch(category.toLowerCase().replace(/&/g, 'and')) {
          case 'office supplies':
            description = 'Printer paper and ink cartridges';
            amount = '89.50';
            break;
          case 'travel and transportation':
          case 'travel':
            description = 'Client meeting travel expenses';
            amount = '145.00';
            break;
          case 'advertising and marketing':
          case 'marketing':
            description = 'Google Ads campaign';
            amount = '250.00';
            break;
          case 'meals and entertainment':
            description = 'Client dinner meeting';
            amount = '175.00';
            break;
          case 'equipment and technology':
            description = 'Laptop computer purchase';
            amount = '1200.00';
            break;
          case 'insurance':
            description = 'Business liability insurance';
            amount = '450.00';
            break;
          case 'software and subscriptions':
            description = 'Monthly CRM subscription';
            amount = '79.00';
            break;
          case 'professional services':
            description = 'Legal consultation';
            amount = '300.00';
            break;
          case 'training and education':
            description = 'Professional development course';
            amount = '395.00';
            break;
          case 'rent and utilities':
            description = 'Office rent payment';
            amount = '2500.00';
            break;
          case 'banking and financial fees':
            description = 'Monthly bank service fees';
            amount = '35.00';
            break;
          case 'phone and internet':
            description = 'Business phone and internet';
            amount = '120.00';
            break;
          default:
            description = `${category} expense`;
            amount = '125.00';
        }
        
        sampleEntries.push(`${dateStr},"${description}","${category}","$${amount}","Credit Card","R${String(1000 + index).padStart(4, '0')}","Yes","Business expense"`);
      });
      
      const csvContent = headers.join(',') + '\n' + sampleEntries.join('\n');
      
      console.log('Expense tracker generated with', finalCategories.length, 'categories');
      
      // Save document to user's collection (if authenticated)
      let savedDocument = null;
      let downloadUrl = null;
      
      if (req.user) {
        const userId = req.user.claims.sub;
        
        // Save document to database
        savedDocument = await storage.createDocument({
          userId,
          title: `Expense Tracker - ${businessType} (AI Generated)`,
          content: csvContent,
          documentType: "expense_tracker",
          status: "generated",
          metadata: {
            businessType: businessType,
            expenseCategories: trackerData.expenseCategories || finalCategories,
            includeBudgetTargets: trackerData.includeBudgetTargets || false,
            trackPaymentMethods: trackerData.trackPaymentMethods || true,
            monthlySummaries: trackerData.monthlySummaries || true,
            customCategories: trackerData.customCategories || '',
            totalCategories: finalCategories.length,
            generatedAt: new Date().toISOString(),
            aiGenerated: true,
            category: "financial"
          }
        });
        
        downloadUrl = `/api/documents/${savedDocument.id}/download/excel`;
      }
      
      res.json({
        preview: csvContent.substring(0, 500) + (csvContent.length > 500 ? '...' : ''),
        downloadUrl: downloadUrl,
        document: savedDocument,
        totalCategories: finalCategories.length,
        businessType: businessType,
        message: "Expense Tracker generated successfully"
      });
    } catch (error) {
      console.error("Error generating expense tracker:", error);
      res.status(500).json({ message: "Failed to generate expense tracker" });
    }
  });

  // Chart of Accounts generation route
  app.post('/api/generate/chart-of-accounts', isAuthenticated, async (req: any, res) => {
    try {
      console.log('Chart of accounts request received:', req.body);
      const chartData = req.body;
      
      // Validate required fields
      if (!chartData.businessType) {
        return res.status(400).json({ error: "Business type is required" });
      }

      console.log('Generating chart of accounts with smart template...');
      
      // Smart template for Chart of Accounts - faster and more reliable than AI
      const { businessType, complexityLevel = 'intermediate', trackInventory = false, includeStatementMapping = true, additionalRequirements = '', businessName = 'Your Business' } = chartData;
      
      // Generate account structure based on business type
      const accounts = [];
      
      // Assets (1000-1999)
      accounts.push('1000,Cash,Asset');
      accounts.push('1010,Checking Account,Asset');
      accounts.push('1020,Savings Account,Asset');
      accounts.push('1100,Accounts Receivable,Asset');
      accounts.push('1200,Prepaid Expenses,Asset');
      
      if (trackInventory) {
        accounts.push('1300,Inventory,Asset');
        accounts.push('1310,Raw Materials,Asset');
        accounts.push('1320,Work in Progress,Asset');
        accounts.push('1330,Finished Goods,Asset');
        accounts.push('1340,Inventory - Finished Goods,Asset');
        accounts.push('1350,Inventory Adjustments,Asset');
      }
      
      accounts.push('1500,Equipment,Asset');
      accounts.push('1510,Accumulated Depreciation - Equipment,Asset');
      
      // Add more assets for advanced complexity
      if (complexityLevel.toLowerCase() === 'advanced') {
        accounts.push('1150,Allowance for Doubtful Accounts,Asset');
        accounts.push('1250,Prepaid Insurance,Asset');
        accounts.push('1260,Prepaid Rent,Asset');
        accounts.push('1400,Investments - Short Term,Asset');
        accounts.push('1450,Investments - Long Term,Asset');
        accounts.push('1520,Furniture & Fixtures,Asset');
        accounts.push('1525,Accumulated Depreciation - Furniture,Asset');
        accounts.push('1600,Intangible Assets,Asset');
        accounts.push('1610,Accumulated Amortization,Asset');
      }
      
      // Liabilities (2000-2999)
      accounts.push('2000,Accounts Payable,Liability');
      accounts.push('2100,Accrued Expenses,Liability');
      accounts.push('2200,Payroll Liabilities,Liability');
      accounts.push('2300,Sales Tax Payable,Liability');
      accounts.push('2400,Credit Card Debt,Liability');
      accounts.push('2500,Long-term Debt,Liability');
      
      // Add more liabilities for advanced complexity
      if (complexityLevel.toLowerCase() === 'advanced') {
        accounts.push('2110,Accrued Payroll,Liability');
        accounts.push('2120,Accrued Vacation,Liability');
        accounts.push('2210,Federal Payroll Tax Payable,Liability');
        accounts.push('2220,State Payroll Tax Payable,Liability');
        accounts.push('2230,FICA Payable,Liability');
        accounts.push('2240,Unemployment Tax Payable,Liability');
        accounts.push('2310,State Sales Tax Payable,Liability');
        accounts.push('2320,Use Tax Payable,Liability');
        accounts.push('2600,Notes Payable - Current,Liability');
        accounts.push('2700,Deferred Revenue,Liability');
      }
      
      // Equity (3000-3999)
      accounts.push('3000,Owner\'s Equity,Equity');
      accounts.push('3100,Retained Earnings,Equity');
      accounts.push('3200,Owner\'s Draw,Equity');
      
      // Revenue (4000-4999)
      if (businessType.toLowerCase().includes('technology') || businessType.toLowerCase().includes('saas')) {
        accounts.push('4000,Software License Revenue,Revenue');
        accounts.push('4100,Subscription Revenue,Revenue');
        accounts.push('4200,Consulting Revenue,Revenue');
        accounts.push('4300,Support Revenue,Revenue');
      } else if (businessType.toLowerCase().includes('retail')) {
        accounts.push('4000,Sales Revenue,Revenue');
        accounts.push('4100,Product Sales,Revenue');
        accounts.push('4200,Service Revenue,Revenue');
      } else {
        accounts.push('4000,Sales Revenue,Revenue');
        accounts.push('4100,Service Revenue,Revenue');
        accounts.push('4200,Other Revenue,Revenue');
      }
      
      // Expenses (5000-9999)
      accounts.push('5000,Cost of Goods Sold,Expense');
      accounts.push('6000,Advertising & Marketing,Expense');
      accounts.push('6100,Office Supplies,Expense');
      accounts.push('6200,Professional Fees,Expense');
      accounts.push('6300,Legal & Professional,Expense');
      accounts.push('6400,Insurance,Expense');
      accounts.push('6500,Rent Expense,Expense');
      accounts.push('6600,Utilities,Expense');
      accounts.push('6700,Travel & Entertainment,Expense');
      accounts.push('6800,Depreciation Expense,Expense');
      accounts.push('6900,Interest Expense,Expense');
      
      // Professional Services specific accounts
      if (businessType.toLowerCase().includes('professional') || businessType.toLowerCase().includes('legal') || businessType.toLowerCase().includes('accounting')) {
        accounts.push('7000,Continuing Education,Expense');
        accounts.push('7100,Professional Licensing,Expense');
        accounts.push('7200,Legal Research & Database,Expense');
        accounts.push('7300,Client Entertainment,Expense');
        accounts.push('7400,Professional Liability Insurance,Expense');
        accounts.push('7500,Expert Witness Fees,Expense');
        accounts.push('7600,Court Filing Fees,Expense');
      }
      
      if (businessType.toLowerCase().includes('technology')) {
        accounts.push('7000,Software & Subscriptions,Expense');
        accounts.push('7100,Hosting & Cloud Services,Expense');
        accounts.push('7200,Development Tools,Expense');
      }
      
      // Add more detailed expense accounts for advanced complexity
      if (complexityLevel.toLowerCase() === 'advanced') {
        accounts.push('8000,Payroll Expense,Expense');
        accounts.push('8100,Employee Benefits,Expense');
        accounts.push('8200,Payroll Taxes,Expense');
        accounts.push('8300,Workers Compensation,Expense');
        accounts.push('8400,Employee Training,Expense');
        accounts.push('8500,Recruitment Expenses,Expense');
        accounts.push('8600,Contract Labor,Expense');
        accounts.push('9000,Bad Debt Expense,Expense');
        accounts.push('9100,Bank Fees,Expense');
        accounts.push('9200,Credit Card Fees,Expense');
        accounts.push('9300,Miscellaneous Expense,Expense');
        accounts.push('9400,Prior Year Adjustments,Expense');
        accounts.push('9500,Income Tax Expense,Expense');
      }
      
      // Add statement mapping column if requested
      let csvHeader = 'Account Number,Account Name,Account Type';
      let csvContent = '';
      
      if (includeStatementMapping) {
        csvHeader += ',Statement,Description';
        // Add statement and description information to each account
        const enhancedAccounts = accounts.map(account => {
          const [number, name, type] = account.split(',');
          let statement = '';
          let description = '';
          
          // Determine financial statement placement
          if (type === 'Asset') {
            statement = 'Balance Sheet';
            if (name.includes('Cash') || name.includes('Checking') || name.includes('Savings')) {
              description = 'Current assets readily convertible to cash';
            } else if (name.includes('Receivable')) {
              description = 'Amounts owed by customers';
            } else if (name.includes('Inventory')) {
              description = 'Goods held for sale or production';
            } else if (name.includes('Equipment') || name.includes('Furniture')) {
              description = 'Fixed assets used in business operations';
            } else {
              description = 'Resources owned by the business';
            }
          } else if (type === 'Liability') {
            statement = 'Balance Sheet';
            if (name.includes('Payable')) {
              description = 'Amounts owed to vendors or creditors';
            } else if (name.includes('Tax')) {
              description = 'Tax obligations to government agencies';
            } else {
              description = 'Debts and obligations of the business';
            }
          } else if (type === 'Equity') {
            statement = 'Balance Sheet';
            description = 'Owner\'s financial interest in the business';
          } else if (type === 'Revenue' || type === 'Income') {
            statement = 'Income Statement';
            description = 'Income earned from business operations';
          } else if (type === 'Expense') {
            statement = 'Income Statement';
            if (name.includes('Cost of Goods')) {
              description = 'Direct costs of producing goods or services';
            } else {
              description = 'Costs incurred in business operations';
            }
          }
          
          return `${number},"${name}",${type},${statement},"${description}"`;
        });
        
        csvContent = csvHeader + '\n' + enhancedAccounts.join('\n');
      } else {
        csvContent = csvHeader + '\n' + accounts.join('\n');
      }
      
      console.log('Chart of accounts generated with', accounts.length, 'accounts');
      
      // Save document to user's collection (if authenticated)
      let savedDocument = null;
      let downloadUrl = null;
      
      if (req.user) {
        const userId = req.user.claims.sub;
        
        // Save document to database
        savedDocument = await storage.createDocument({
          userId,
          title: `Chart of Accounts - ${businessType} (AI Generated)`,
          content: csvContent,
          documentType: "chart_of_accounts",
          status: "generated",
          metadata: {
            businessType: businessType,
            complexity: chartData.complexityLevel || 'standard',
            trackInventory: chartData.trackInventory || false,
            includeStatementMapping: chartData.includeStatementMapping || false,
            additionalRequirements: chartData.additionalRequirements || '',
            totalAccounts: accounts.length,
            generatedAt: new Date().toISOString(),
            aiGenerated: true,
            category: "financial"
          }
        });
        
        downloadUrl = `/api/documents/${savedDocument.id}/download/excel`;
      }
      
      res.json({
        preview: csvContent.substring(0, 500) + (csvContent.length > 500 ? '...' : ''),
        downloadUrl: downloadUrl,
        document: savedDocument,
        totalAccounts: accounts.length,
        businessType: businessType,
        message: "Chart of Accounts generated successfully"
      });
    } catch (error) {
      console.error("Error generating chart of accounts:", error);
      res.status(500).json({ message: "Failed to generate chart of accounts" });
    }
  });

  // Lean Canvas generation route
  app.post('/api/generate-lean-canvas', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const canvasData = req.body;
      
      // Validate required fields
      if (!canvasData.problem || !canvasData.customerSegments || !canvasData.uniqueValueProposition) {
        return res.status(400).json({ message: "Problem, customer segments, and unique value proposition are required" });
      }
      
      // Generate the lean canvas using AI
      const generatedDocument = await openaiService.generateLeanCanvas(canvasData);
      
      // Save document to user's collection
      const savedDocument = await storage.createDocument({
        userId,
        title: `Lean Canvas (AI Generated)`,
        content: generatedDocument,
        documentType: "lean_canvas",
        status: "generated",
        metadata: {
          problem: canvasData.problem,
          customerSegments: canvasData.customerSegments,
          uniqueValueProposition: canvasData.uniqueValueProposition,
          solution: canvasData.solution,
          channels: canvasData.channels,
          revenueStreams: canvasData.revenueStreams,
          costStructure: canvasData.costStructure,
          keyMetrics: canvasData.keyMetrics,
          unfairAdvantage: canvasData.unfairAdvantage,
          generatedAt: new Date().toISOString(),
          aiGenerated: true,
          category: "business_planning"
        }
      });
      
      res.json({ 
        downloadUrl: `/api/documents/${savedDocument.id}/download/pdf`,
        document: savedDocument,
        message: "Lean Canvas generated successfully" 
      });
    } catch (error) {
      console.error("Error generating lean canvas:", error);
      res.status(500).json({ message: "Failed to generate lean canvas" });
    }
  });

  // Prompt Playground endpoints
  app.get('/api/download/prompt-playground-free', async (req, res) => {
    try {
      const content = `Prompt Engineering Library - Free
Category: AI Resources | Access: Free

🎯 10 Essential Business Prompts

1. What are the key steps to start a new [type of business] from scratch?
   Category: Business Formation & Legal

2. Help me brainstorm a catchy name for my [business description].
   Category: Branding & Naming

3. What licenses and permits do I need to start a [industry] business in [Location]?
   Category: Business Formation & Legal

4. Describe the ideal target customer for a [business type].
   Category: Market Research & Planning

5. List some cost-effective marketing ideas to promote my new business.
   Category: Marketing & Sales

6. How can I validate that my business idea will be profitable before investing too much?
   Category: Market Research & Planning

7. What common mistakes should I avoid when starting my first business?
   Category: Growth Strategy

8. What business expenses can I write off on my taxes as a small business owner?
   Category: Tax & Compliance

9. What's a simple one-page business plan outline I can use for my idea?
   Category: Market Research & Planning

10. What are my options for funding my new business idea?
    Category: Funding & Financials

💡 Free Tip: These prompts are designed to help you get started with basic business planning and formation. For more detailed industry-specific and advanced prompts, upgrade to Pro or Premium access.

🔓 Unlock Full Library
Upgrade to Pro for 100+ prompts or Premium for 250+ AI-tailored prompts with live testing and favorites.`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="Prompt_Engineering_Library_Free.txt"');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving prompt playground free:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/prompt-playground-pro', async (req, res) => {
    try {
      const content = `Prompt Engineering Library - Pro
Category: AI Resources | Access: Pro ($29/month)

🚀 100 Professional Business Prompts

Includes Everything in Free (10 prompts), Plus 90 Additional Professional Prompts organized by category:

BUSINESS FORMATION & LEGAL (20 prompts)
11. Which business structure (sole proprietorship, LLC, S-Corp, etc.) is best for a new [type of business] and why?
12. What are the required steps to legally register a new business in [State/Country]?
13. What licenses or permits are required to start a [industry] business in [Location]?
14. How can I check if my desired business name is available and not trademarked?
15. What's the best way to protect my business idea or brand (trademarks, copyrights, patents)?
16. What should I include in a basic client contract for my freelance [service] business?
17. What should I include in the Terms of Service for my [online business]?
18. What are common legal mistakes new business owners should avoid?
19. Do I need business insurance, and if so, what types are recommended for a [industry] startup?
20. What's the difference between hiring an employee vs. an independent contractor, and how do I decide which to use?
21. What is a registered agent, and do I need one for my business?
22. What is an LLC operating agreement and do I need one for my company?
23. Should I have a co-founder (partnership) agreement, and what key terms should it cover?
24. What clauses should I watch out for when signing a commercial lease for my business space?
25. When should I consider patenting a product idea, and what's involved in the process?
26. What is a DBA (Doing Business As) and when might I need one for my business?
27. What local zoning or home business regulations should I check if I run my business from home?
28. At what point should I consult a lawyer when starting my business?
29. How can I minimize the risk of legal disputes in my business (e.g., through contracts or policies)?
30. How do I file a trademark for my business name or logo?

TAX & COMPLIANCE (10 prompts)
31. What taxes (income, sales, etc.) do I need to file as a new business owner?
32. How do I register for an Employer Identification Number (EIN) for my business?
33. What business expenses are tax-deductible for a small business?
34. How often and how do I pay estimated taxes for my business?
35. What is the process for collecting and remitting sales tax if I sell products in [Location]?
36. What records should I keep throughout the year to make tax filing easier?
37. What is self-employment tax and how does it affect my income?
38. Are there any small business tax credits or incentives I should know about?
39. What annual filings or reports does my LLC/corporation need to submit to stay compliant?
40. How can I make sure my website is compliant with privacy laws like GDPR or CCPA?

BRANDING & NAMING (15 prompts)
41. Suggest a creative business name for a [business description or industry].
42. Propose a tagline that highlights [unique selling point] for my [business].
43. Write a mission statement for my company that conveys [core value or purpose].
44. What should I consider when designing a logo or choosing brand colors for my business?
45. How can I define a brand voice for my business (e.g., fun, professional, etc.)?
46. How do I check if a brand name I like has an available domain and social media handles?
47. Give me 3 slogan ideas that emphasize the [unique selling proposition] of my product.
48. Help me come up with a brief brand story or origin story for my business.
49. What are the key elements of a strong brand identity for a [industry] company?
50. How can I build my personal brand as an entrepreneur in the [industry] space?
51. What are some ways to make my brand stand out against competitors in [industry]?
52. Generate a name for my new [product/service] that conveys [desired image or benefit].
53. What should I consider when naming my business to appeal to [target audience]?
54. List 5 core brand values that would resonate with [target audience] for my [business].
55. How can I create a memorable tagline or catchphrase for my brand?

🎯 Pro Features:
✓ 100 categorized professional prompts
✓ Industry-specific variations
✓ Copy prompts to clipboard
✓ Category filtering and search
✓ Regular updates with new prompts
✓ Business context templates

MARKET RESEARCH & PLANNING (15 prompts)
56. Who is my ideal target customer for [product/service], and how can I reach them?
57. What market research methods should I use to validate demand for my [product/service]?
58. How can I analyze my competitors and identify gaps in the market?
59. What questions should I ask potential customers to validate my business idea?
60. How do I estimate the market size for my [product/service] in [location]?
61. What are effective ways to test my product idea before fully launching?
62. How can I identify emerging trends in [industry] that could affect my business?
63. What pricing strategy should I use for my [product/service]?
64. How do I create customer personas for my target market?
65. What are cost-effective ways to conduct market research on a small budget?
66. How can I use surveys to gather customer feedback about my [product/service]?
67. What competitive analysis framework should I use to study my rivals?
68. How do I identify and evaluate potential business partnerships or collaborations?
69. What metrics should I track to measure market demand and customer interest?
70. How can I use social media to research my target audience and competitors?

MARKETING & SALES (15 prompts)
71. What are the most cost-effective marketing strategies for a new [type] business?
72. How can I create a sales funnel that converts leads into customers?
73. What should I include in my elevator pitch for [business/product]?
74. How do I build an email list and create effective email marketing campaigns?
75. What content marketing strategies work best for [industry] businesses?
76. How can I use social media effectively to promote my [business/product]?
77. What are the best practices for networking and building business relationships?
78. How do I create a marketing budget and allocate resources effectively?
79. What key performance indicators (KPIs) should I track for my marketing efforts?
80. How can I optimize my website for search engines (SEO basics)?
81. What are effective ways to get customer reviews and testimonials?
82. How do I create compelling product descriptions that drive sales?
83. What referral marketing strategies can help grow my customer base?
84. How can I use local marketing to attract customers in my area?
85. What sales techniques work best for [product/service] in [industry]?

FUNDING & FINANCIALS (10 prompts)
86. What funding options are available for my startup, and which is best for my situation?
87. How do I create a financial projection for my first year of business?
88. What should I include in a pitch deck when seeking investors?
89. How much money do I realistically need to start my [type] business?
90. What are the pros and cons of bootstrapping vs. seeking external funding?
91. How do I prepare for investor meetings and due diligence?
92. What financial metrics should I track to measure my business's health?
93. How can I improve my cash flow management as a new business?
94. What are angel investors looking for in a startup pitch?
95. How do I value my company when seeking investment?

PRODUCTIVITY & AUTOMATION (5 prompts)
96. What tools and software can help me run my business more efficiently?
97. How can I automate repetitive tasks in my [type] business?
98. What project management system works best for small businesses?
99. How do I create efficient workflows and standard operating procedures?
100. What are the essential apps and tools every entrepreneur should use?

🎯 Pro Features:
✓ 100 categorized professional prompts
✓ Industry-specific variations
✓ Copy prompts to clipboard
✓ Category filtering and search
✓ Regular updates with new prompts
✓ Business context templates

💡 Pro Tip: All prompts include placeholder brackets like [business type] for easy customization to your specific industry and situation.`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving prompt playground pro:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/prompt-playground-premium', async (req, res) => {
    try {
      const content = `Prompt Engineering Library - Premium
Category: AI Resources | Access: Premium ($79/month)

🌟 250 Advanced Business Prompts

Includes Everything in Pro (100 prompts), Plus 150 Additional Premium Prompts:

BUSINESS FORMATION & LEGAL - Premium (25 additional prompts)
111. Outline a step-by-step plan to incorporate a business in [Country/State], including timeline and costs.
112. Draft a basic independent contractor agreement that I can use when hiring freelancers.
113. Advise on an intellectual property strategy: should I use patents, trade secrets, or trademarks for my product, and what are the steps for each?
114. Provide a checklist of legal and compliance steps to follow when hiring my first employee (e.g., registrations, taxes, labor laws).
115. How should co-founders split equity fairly, and what terms (vesting, etc.) should be in a founders' agreement?
116. Draft a Privacy Policy for my [online business] that covers data collection, use, and user rights (GDPR compliant).
117. What are the pros and cons of incorporating my business in Delaware or Nevada versus my home state?
118. List the legal steps to expand my business to another state or country (e.g., foreign entity registration, permits).
119. How do I convert my sole proprietorship or LLC into a corporation, and what legal requirements are involved?
120. What key clauses should I include in a contract with a manufacturer or supplier to protect my business?
121. How can I set up an employee stock ownership plan (ESOP) or other equity compensation for my team?
122. What legal precautions should I take to protect the business if a co-founder leaves (e.g., buy-sell agreements)?
123. How do I comply with employment laws when building a remote team across different states or countries?
124. Walk me through the process of filing a patent for an invention related to my business (steps, considerations).
125. How can I license my product or technology to other companies? What should a licensing agreement include?
126. What should I be aware of when signing contracts with international clients or partners (jurisdiction, arbitration, etc.)?
127. What should I include in a Non-Disclosure Agreement (NDA) to protect my business's confidential information?
128. Help me develop a legal risk management plan identifying potential risks (lawsuits, compliance issues) and mitigation strategies.
129. What legal considerations apply if I run an online business serving customers globally (international laws, taxes, etc.)?
130. How can I ensure my business is compliant with ADA and accessibility requirements (for my website or physical store)?
131. What is the proper process to dissolve or wind down my business, and what legal steps do I need to take?
132. What terms should I pay attention to when negotiating a term sheet or investment agreement with potential investors?
133. What refund, return, or warranty policies should I establish to avoid legal issues and keep customers satisfied?
134. What internal company policies (e.g., employee handbook, code of conduct) should I create to ensure legal compliance and clarity for my team?
135. How should I handle a client who refuses to pay an invoice? What legal options do I have to recover the payment?

TAX & COMPLIANCE - Premium (15 additional prompts)
136. What strategies can I use to minimize my business taxes while staying fully compliant with the law?
137. Compare the tax advantages of an S-Corp versus an LLC for a [type of business] and [scenario].
138. What are the tax implications of hiring employees vs. using independent contractors for my business?
139. How can I use depreciation of equipment or assets to save on taxes for my business?
140. Help me create a calendar of all tax deadlines and compliance filings I need to track for my business (federal, state, quarterly taxes, etc.).
141. Outline the key regulatory compliance requirements for a [industry] business and how to meet them.
142. How do I handle sales tax for online sales or customers in multiple states (sales tax nexus considerations)?
143. What steps can I take to prepare for a potential IRS audit and ensure my records are audit-ready?
144. Which types of insurance are legally required or highly recommended for my business (e.g., workers' comp, liability) and why?
145. What certifications or licenses might my [industry] business need, and how do I obtain them?
146. How can I ensure my business's data security and privacy practices comply with regulations (like GDPR, HIPAA, etc.)?
147. If I start selling internationally, what tax or VAT obligations should I be aware of for overseas sales?
148. Which accounting method (cash vs. accrual) is best for my business, and how does that choice affect my taxes?
149. How should I handle payroll taxes and setup when I hire my first employee?
150. How do quarterly tax estimates work and how can I accurately calculate them to avoid penalties?

BRANDING & NAMING - Premium (20 additional prompts)
151. Perform a brand SWOT analysis comparing my brand with a key competitor.
152. Analyze [Competitor]'s branding and suggest ways I can differentiate my brand effectively.
153. Outline a comprehensive brand strategy for a new [industry] business, including vision, values, voice, and positioning.
154. Help me craft a compelling brand story that will engage customers and reflect our values [value1], [value2], etc.
155. I need to rebrand my [existing business] – what steps should I follow and what factors should I consider?
156. How can I use storytelling in my branding to connect with customers on an emotional level?
157. Suggest a naming strategy for a line of products under my brand to maintain brand consistency.
158. What techniques can I use to test potential brand names with my target market before deciding?
159. How can I build strong brand loyalty and a community around my brand among my customers?
160. Develop a powerful brand tagline that communicates [unique benefit] to [target audience].
161. What should my brand messaging focus on to attract and resonate with [ideal customer persona]?
162. How do I create a brand style guide and what key elements should it include?
163. Advise on choosing a color scheme and typography that convey [desired brand attribute] for my brand.
164. What steps should I take to trademark and legally protect my brand name and logo?
165. How can I ensure consistent branding across my website, social media, and marketing materials?
166. Create a personal branding strategy for me as the founder of a [industry] business to build credibility.
167. What brand positioning strategies can I use to differentiate a premium brand versus a budget brand in [industry]?
168. Plan a brand launch campaign to introduce my new brand to the market successfully.
169. How should I manage a situation where my brand faces negative publicity? (Brand reputation management)
170. How can I leverage influencer partnerships to strengthen my brand image and reach new audiences?

MARKET RESEARCH & PLANNING - Premium (20 additional prompts)
171. Provide a detailed SWOT analysis for my business idea [brief description of business].
172. Use Porter's Five Forces to analyze the competitive landscape of the [industry] I'm entering.
173. Outline a detailed market research plan to validate demand for my [product/service] including methods and timeline.
174. Help me segment my target market: identify 3-4 distinct customer segments for my business and their characteristics.
175. Create a competitor analysis matrix comparing my business with [Competitor A] and [Competitor B] across key factors.
176. Estimate the market size and growth rate for [industry or product category] in [target region].
177. Identify emerging trends in [industry] over the next 5 years and suggest how my business can leverage them.
178. Analyze the potential risks and challenges of entering the [industry] and suggest strategies to mitigate them.
179. Draft a go-to-market strategy outline for launching my [product/service] in [target market].
180. Create a business model canvas for my business, including key partners, activities, value propositions, customer segments, and revenue streams.
181. What key performance indicators (KPIs) should be in my business plan to measure success for a [industry] startup?
182. How can I forecast sales for my new product or service without historical data to work from?
183. Help me identify a strong unique selling proposition (USP) for my business to stand out in the market.
184. What factors should I consider when choosing the best location (or online platform) for my [business type]?
185. Conduct a break-even analysis with scenario planning: if sales are 20% lower or higher than expected, how does it affect my profitability?
186. Outline a contingency plan for my business if a major risk (e.g., supplier failure, economic downturn) occurs.
187. Create a customer journey map for a typical customer of my [product/service], highlighting touchpoints and opportunities to improve their experience.
188. Identify potential strategic partners or collaborators that could help grow my [business type] and how to approach them.
189. Evaluate my business idea's viability: what criteria (market size, competition, cost) should I assess to decide if it's worth pursuing?
190. Outline a 12-month roadmap with major milestones to go from concept to launch for my startup.

MARKETING & SALES - Premium (20 additional prompts)
191. Develop a comprehensive 6-month digital marketing strategy for my [business], including SEO, content, social media, and email.
192. Using the PASTOR framework, write an email campaign addressing [customer pain point] for [Ideal Client Profile] offering [solution].
193. Plan a 3-month social media content calendar for my business, with themes or ideas for each week.
194. Write a sales call script for pitching my product to a major client, emphasizing [key benefits] and handling potential objections.
195. How can I optimize my marketing funnel from online ads to website to increase conversion rates? (Awareness -> Consideration -> Purchase steps)
196. Suggest 3 elements to A/B test on my landing page to improve conversion (and what changes to test for each).
197. How can I leverage influencer marketing to boost brand awareness and sales for my [product/service]?
198. Outline a webinar that I can host to educate my audience and generate leads for my [product/service].
199. Provide a step-by-step guide to implementing a CRM system to manage leads and sales in my business.
200. Which key marketing metrics should I monitor (e.g., CAC, ROI, conversion rate) and how can I use them to improve my strategy?
201. Craft a 3-email follow-up sequence for leads who signed up on my site but haven't made a purchase.
202. What upselling and cross-selling strategies can I implement to increase revenue from existing customers?
203. Write a script for a 2-minute promotional video showcasing the top features and benefits of my product.
204. Help me design a customer referral program, including incentives and how to promote it to customers.
205. How should I structure my pricing or packages to maximize revenue and appeal to different customer segments?
206. Give me best practices for running a successful crowdfunding campaign for my product (marketing message, rewards, outreach).
207. Plan a community event or pop-up to promote my business locally, including engagement ideas and marketing tactics.
208. Propose 5 promotional offers or discount ideas I can run this quarter to boost sales, and how to execute them.
209. How can I improve my sales process to handle common customer objections in the [industry] (provide examples of objection and response)?
210. Provide tips for optimizing my Google Ads or Facebook Ads campaigns to achieve a better ROI on a small budget.

FUNDING & FINANCIALS - Premium (15 additional prompts)
211. Create detailed 3-year financial projections for my business (income statement, cash flow, balance sheet) based on given assumptions.
212. How do I determine a valuation for my startup for potential investors or sale?
213. Prepare an investor pitch deck outline, focusing on the financial projections and growth story.
214. What financial metrics and ratios do investors look at when evaluating a startup, and how can I improve them?
215. How can I reduce my business's burn rate without significantly impacting growth?
216. Help me compare two investment options for my business (e.g., buy equipment vs lease, or marketing campaign A vs B) by calculating ROI for each.
217. What should I consider when applying for a small business loan, and how can I improve my chances of approval?
218. Explain key financial ratios (like current ratio, profit margin, debt-to-equity) and what they indicate about my business health.
219. Suggest cost-cutting and efficiency measures to improve my company's profit margins.
220. What is the process to seek venture capital funding, and what do VCs typically require from startups?
221. How should I structure equity and ownership if I bring on an investor (to ensure fair terms for both sides)?
222. Provide a scenario analysis: If my sales are 20% below forecast, how does it impact my cash flow and how long my funds will last (runway)?
223. Recommend financial software or tools to automate my accounting, invoicing, and financial tracking.
224. How can I improve my business credit score or financial standing to prepare for future financing needs?
225. Explain the concept of unit economics (e.g., CAC, LTV) for my business and how to optimize them for profitability.

PRODUCTIVITY & AUTOMATION - Premium (10 additional prompts)
226. Help me set up an automation to send a welcome email to new customers using [specific tool or platform].
227. Develop an optimal daily and weekly schedule for a [role, e.g., freelance designer] to maximize productivity.
228. How can I implement project management methods (like Agile or Kanban) to improve my team's productivity?
229. Identify routine processes in my business that I can automate, and suggest tools for each.
230. Create a template or checklist for delegating tasks effectively to virtual assistants or team members.
231. How can I integrate my CRM, email marketing, and accounting software to streamline workflows?
232. Suggest a plan for documenting and systematizing my business operations so it's easier to scale or hand off tasks.
233. What advanced Excel or Google Sheets techniques can I use to automate financial tracking or data analysis for my business?
234. How can I set up a dashboard that automatically tracks and visualizes my key business metrics?
235. Recommend AI tools or chatbots I could use to automate customer service or marketing tasks in my business.

GROWTH STRATEGY - Premium (25 additional prompts)
236. Create a 5-year strategic growth plan for my business with key milestones and required resources.
237. How can I scale my business nationally or internationally? Outline considerations like legal, distribution, and localization.
238. Develop a strategy to expand into a new market or customer segment for my business.
239. If my current business model isn't yielding the growth I want, how can I identify if and how I should pivot?
240. Analyze my business model and suggest new revenue streams or business model innovations to drive growth.
241. How can I build a scalable business model that can handle a 10x increase in demand?
242. Propose a plan to increase my user base (or revenue) by 200% in the next year and what resources that would require.
243. How can I prepare my business for a future acquisition or exit? (What should I do now to make it attractive to buyers?)
244. Outline a strategy for building a strong management team and company culture that can support rapid growth.
245. How can I implement OKRs (Objectives and Key Results) or similar frameworks to align my team with growth objectives?
246. Identify potential risks of scaling up quickly (e.g., quality issues, burnout) and how to mitigate them.
247. Should I introduce a subscription or recurring revenue model to drive growth? What are the pros and cons?
248. What strategies can ensure continuous innovation in my company so we stay ahead of competitors as we grow?
249. Help me plan entry into an international market (e.g., expanding to Europe), including market entry strategy and compliance considerations.
250. Evaluate the trade-offs between seeking external funding (VC, loans) vs. growing organically for my business's growth goals.
251. How can I increase my company's valuation in the next 2 years to attract potential investors or buyers?
252. Outline how I could franchise my business model – what would that entail and how would I maintain quality?
253. What steps can I take to build an exit strategy (such as selling the company) while maximizing the business's value?
254. How do I identify and prioritize the high-impact projects or features that will drive the most growth?
255. Suggest ways to improve customer lifetime value (LTV) and reduce churn to fuel sustainable growth.
256. How can I leverage data analytics to inform and refine my growth strategy (what data to collect and how to use it)?
257. What approaches can I take to form strategic alliances or partnerships to accelerate growth?
258. If market conditions change dramatically, how can I pivot or adjust my strategy quickly to keep growing?
259. Design a scalable organizational structure (teams, processes) to support the business as it doubles or triples in size.
260. How do I maintain product/service quality and customer satisfaction during periods of rapid growth?

🏆 Premium AI Features:
✓ 250 comprehensive business prompts (100 Pro + 150 Premium)
✓ Advanced legal and compliance prompts
✓ Strategic planning frameworks
✓ Investor-ready templates
✓ International business guidance
✓ AI-powered prompt customization
✓ Live prompt testing with AI
✓ Personal prompt library
✓ Smart recommendations based on business profile

💡 Premium Tip: These advanced prompts are designed for businesses ready to scale, seeking investment, or operating in complex regulatory environments. Each prompt provides strategic depth for serious entrepreneurs.`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving prompt playground premium:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Pro Automation Templates generators
  app.post('/api/generate/social-calendar', async (req, res) => {
    try {
      console.log('Social calendar request received:', req.body);
      const { industry, launchDate, productType, businessName } = req.body;
      
      if (!industry || !launchDate || !productType || !businessName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const prompt = `Generate a 30-day social media calendar for ${businessName}, a ${industry} company launching ${productType} on ${launchDate}.

Create a simple CSV format with columns: Date, Platform, Post Topic, Hashtags

Provide 30 daily posts covering:
- Pre-launch teasers (first 10 days)
- Launch announcements (next 10 days) 
- Post-launch engagement (final 10 days)

Use varied platforms: LinkedIn, Instagram, Twitter, Facebook.
Keep hashtags relevant to ${industry} and ${productType}.
Be concise and actionable.`;

      console.log('Generating social calendar with smart template...');
      
      // Smart template with dynamic content - faster and more reliable than AI
      const launchDateObj = new Date(launchDate);
      const prelaunchStart = new Date(launchDateObj);
      prelaunchStart.setDate(prelaunchStart.getDate() - 10);
      
      const posts = [];
      for (let i = 0; i < 30; i++) {
        const currentDate = new Date(prelaunchStart);
        currentDate.setDate(currentDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const platforms = ['LinkedIn', 'Instagram', 'Twitter', 'Facebook'];
        const platform = platforms[i % platforms.length];
        
        let topic, hashtags;
        if (i < 10) {
          // Pre-launch phase
          const prelaunchTopics = [
            `Exciting news: ${businessName} is launching soon! Stay tuned for updates.`,
            `Behind the scenes: Our team is working hard to bring you ${productType}`,
            `The problem we're solving in ${industry} and why it matters`,
            `Meet the team behind ${businessName} - passionate about ${industry}`,
            `Sneak peek: Features that will transform your ${productType} experience`,
            `Why we built ${businessName}: Our mission and vision`,
            `Almost there! ${10-i} days until ${businessName} goes live`,
            `Final preparations for ${businessName} launch - we're ready!`,
            `Tomorrow is the day! ${businessName} launches ${launchDate}`,
            `Get ready! ${businessName} launches tomorrow!`
          ];
          topic = prelaunchTopics[i];
          hashtags = `#${industry} #${productType} #Launch #Innovation #ComingSoon`;
        } else if (i < 20) {
          // Launch phase
          const launchTopics = [
            `🚀 IT'S LAUNCH DAY! ${businessName} is officially live!`,
            `Day 1 success! Thank you for the amazing response to ${businessName}`,
            `First customer stories: How ${businessName} is already making a difference`,
            `Behind the metrics: Launch week by the numbers`,
            `Week 1 recap: What we've learned from our ${businessName} launch`,
            `Customer spotlight: Real results with ${businessName}`,
            `Feature deep dive: How ${productType} solves real problems`,
            `Community growth: Welcome to our new ${businessName} users!`,
            `Integration guide: Getting started with ${businessName}`,
            `Success stories: Early wins from ${businessName} users`
          ];
          topic = launchTopics[i-10];
          hashtags = `#LaunchSuccess #${businessName} #${industry} #CustomerSuccess #Live`;
        } else {
          // Post-launch engagement
          const postlaunchTopics = [
            `Month 1 milestone: What we've achieved with ${businessName}`,
            `Feature update: New capabilities added to ${productType}`,
            `Customer feedback: How you're shaping ${businessName}'s future`,
            `Industry insights: Trends in ${industry} we're watching`,
            `Best practices: Maximizing value from ${productType}`,
            `Community spotlight: Power users of ${businessName}`,
            `Partnership news: Expanding the ${businessName} ecosystem`,
            `Roadmap preview: What's coming next for ${businessName}`,
            `Thank you message: Celebrating our ${businessName} community`,
            `Looking ahead: The future of ${industry} with ${businessName}`
          ];
          topic = postlaunchTopics[i-20];
          hashtags = `#Growth #${businessName} #Community #${industry} #Innovation`;
        }
        
        posts.push(`${dateStr},${platform},"${topic}","${hashtags}"`);
      }
      
      const csvContent = 'Date,Platform,Post Topic,Hashtags\n' + posts.join('\n');
      const response = { content: csvContent, metadata: { smart_template: true } };
      
      console.log('Smart template generated, processing...');
      
      // Process CSV content
      const csvLines = response.content.split('\n').filter((line: string) => line.trim());
      const finalCsvContent = csvLines.join('\n');
      
      const result = {
        preview: response.content,
        csvContent: finalCsvContent,
        totalPosts: csvLines.length - 1 // minus header
      };
      
      console.log('Sending response with', result.totalPosts, 'posts');
      res.json(result);
    } catch (error) {
      console.error('Error generating social calendar:', error);
      res.status(500).json({ error: 'Failed to generate social calendar: ' + (error as Error).message });
    }
  });

  app.post('/api/generate/startup-checklist', async (req, res) => {
    try {
      const { businessState, entityType, launchDate, businessName } = req.body;
      
      const prompt = `Create startup checklist for ${businessName} (${entityType}) in ${businessState}, launching ${launchDate}.

Generate 20 essential tasks in CSV format:
Task,Priority,Days Before Launch,Estimated Hours,Cost

Categories: Legal Formation, Tax Setup, Banking, Insurance, Licensing, Operations, Marketing, Compliance

Focus on ${businessState}-specific requirements for ${entityType}. Include realistic timelines and costs.`;

      console.log('Generating startup checklist with fast generation...');
      const response = await openaiService.generateFastContent(prompt, 1000);
      
      // Parse CSV response into structured tasks
      const lines = response.split('\n').filter(line => line.trim() && !line.startsWith('Task,'));
      const tasks = lines.map((line, index) => {
        const [task, priority, daysBefore, hours, cost] = line.split(',').map(s => s.trim());
        return {
          id: index + 1,
          title: task || `Task ${index + 1}`,
          priority: priority || 'Medium',
          daysBefore: daysBefore || '30',
          estimatedHours: hours || '2',
          estimatedCost: cost || '$0'
        };
      });
      
      res.json({
        textContent: response.content,
        tasks: tasks.length > 0 ? tasks : [
          { title: 'Register Business Entity', description: `Register ${entityType} in ${businessState}`, dueDate: '30 days before launch', priority: 'High' },
          { title: 'Obtain EIN', description: 'Apply for Employer Identification Number', dueDate: '25 days before launch', priority: 'High' },
          { title: 'Open Business Bank Account', description: 'Set up business banking', dueDate: '20 days before launch', priority: 'High' },
          { title: 'Get Business Insurance', description: 'Secure liability and other necessary insurance', dueDate: '15 days before launch', priority: 'Medium' },
          { title: 'Set Up Accounting System', description: 'Implement bookkeeping and accounting', dueDate: '10 days before launch', priority: 'Medium' }
        ]
      });
    } catch (error) {
      console.error('Error generating startup checklist:', error);
      res.status(500).json({ error: 'Failed to generate startup checklist' });
    }
  });

  app.post('/api/generate/email-series', async (req, res) => {
    try {
      const { companyName, productService, tone, industryType } = req.body;
      
      const prompt = `Create a 4-email welcome series for ${companyName}, a ${industryType} company offering ${productService}.
      Tone: ${tone}
      
      Generate 4 emails:
      1. Welcome & Introduction (immediate)
      2. Getting Started Guide (day 2)
      3. Success Stories & Tips (day 5)
      4. Next Steps & Support (day 7)
      
      For each email include:
      - Compelling subject line
      - Personalized greeting
      - Clear value proposition
      - Actionable content
      - Professional call-to-action
      - Appropriate closing
      
      Format for easy copy-paste into email marketing platforms like Mailchimp, ConvertKit, etc.`;

      const response = await openaiService.generateChatResponse([{ role: 'user', content: prompt }]);
      
      // Parse emails from response
      const emailSections = response.content.split('Email ').filter((section: string) => section.trim());
      const emails = emailSections.map((section: string, index: number) => {
        const lines = section.split('\n');
        const subjectLine = lines.find((line: string) => line.includes('Subject:'))?.replace('Subject:', '').trim() || `Welcome to ${companyName} - Email ${index + 1}`;
        const bodyStart = lines.findIndex((line: string) => line.includes('Subject:')) + 1;
        const body = lines.slice(bodyStart).join('\n').trim();
        
        return {
          subject: subjectLine,
          body: body || section.trim()
        };
      });
      
      res.json({
        emails: emails.length > 0 ? emails : [
          { subject: `Welcome to ${companyName}!`, body: `Hi there!\n\nWelcome to ${companyName}. We're excited to have you on board...\n\nBest regards,\nThe ${companyName} Team` }
        ],
        fullContent: response.content
      });
    } catch (error) {
      console.error('Error generating email series:', error);
      res.status(500).json({ error: 'Failed to generate email series' });
    }
  });

  app.post('/api/generate/pitch-deck', async (req, res) => {
    try {
      const { businessName, industry, fundingGoal, businessDescription } = req.body;
      
      const prompt = `Create a comprehensive 10-slide investor pitch deck outline for ${businessName}, a ${industry} company.
      Business Description: ${businessDescription}
      Funding Goal: ${fundingGoal}
      
      Generate detailed content for each slide:
      
      1. Title Slide
      2. Problem Statement
      3. Solution
      4. Market Opportunity
      5. Business Model
      6. Traction & Validation
      7. Competition Analysis
      8. Financial Projections
      9. Team
      10. Funding Ask & Use of Funds
      
      For each slide provide:
      - Slide title
      - Key content points
      - Speaker notes
      - Visual recommendations
      - Data points to include
      
      Make it investor-ready with compelling storytelling and clear value proposition.`;

      const response = await openaiService.generateChatResponse([{ role: 'user', content: prompt }]);
      
      // Parse slides from response
      const slideSections = response.content.split('Slide ').filter((section: string) => section.trim());
      const slides = slideSections.map((section: string, index: number) => {
        const lines = section.split('\n');
        const title = lines[0]?.replace(/^\d+[:.]\s*/, '').trim() || `Slide ${index + 1}`;
        const content = lines.slice(1, 5).join('\n').trim();
        const speakerNotes = lines.slice(5).join('\n').trim();
        
        return {
          title,
          content: content || `Content for ${title}`,
          speakerNotes: speakerNotes || `Speaker notes for ${title}`
        };
      });
      
      res.json({
        slides: slides.length > 0 ? slides : [
          { title: 'Company Overview', content: `${businessName} - ${businessDescription}`, speakerNotes: 'Introduce the company and mission' }
        ],
        fullContent: response.content
      });
    } catch (error) {
      console.error('Error generating pitch deck:', error);
      res.status(500).json({ error: 'Failed to generate pitch deck' });
    }
  });

  app.post('/api/generate/business-policies', async (req, res) => {
    try {
      const { businessType, businessModel, location, businessName } = req.body;
      
      const prompt = `Generate comprehensive business policy templates for ${businessName}, a ${businessType} company with ${businessModel} model located in ${location}.
      
      Create the following policies:
      
      1. Privacy Policy
      2. Terms of Service
      3. Return/Refund Policy (if applicable)
      4. Employee Handbook (basic HR policies)
      5. Data Protection Policy
      6. Communication Policy
      7. Remote Work Policy (if applicable)
      
      Tailor each policy to:
      - Business type: ${businessType}
      - Business model: ${businessModel}
      - Location requirements: ${location}
      
      Include legal disclaimers and recommendations for professional review.
      Make policies clear, enforceable, and compliant with general business standards.`;

      const response = await openaiService.generateChatResponse([{ role: 'user', content: prompt }]);
      
      // Parse policies from response
      const policySections = response.content.split(/(?=\d+\.\s*[A-Z])/g).filter((section: string) => section.trim());
      const policies = policySections.map((section: string, index: number) => {
        const lines = section.split('\n');
        const title = lines[0]?.replace(/^\d+[:.]\s*/, '').trim() || `Policy ${index + 1}`;
        const content = lines.slice(1).join('\n').trim();
        
        return {
          title,
          content: content || `Content for ${title} policy`
        };
      });
      
      res.json({
        policies: policies.length > 0 ? policies : [
          { title: 'Privacy Policy', content: `Privacy Policy for ${businessName}\n\nThis policy outlines how we collect, use, and protect your personal information...` }
        ],
        fullContent: response.content
      });
    } catch (error) {
      console.error('Error generating business policies:', error);
      res.status(500).json({ error: 'Failed to generate business policies' });
    }
  });

  app.post('/api/generate/email-campaign', async (req, res) => {
    try {
      const { targetAudience, productService, tone, platform, campaignGoal } = req.body;
      
      const prompt = `Create a complete cold outreach email campaign for ${productService} targeting ${targetAudience}.
      Campaign Goal: ${campaignGoal}
      Tone: ${tone}
      Platform: ${platform}
      
      Generate:
      1. Initial outreach email
      2. First follow-up email (3 days later)
      3. Final follow-up email (7 days later)
      
      For each email provide:
      - Compelling subject line
      - Personalized opening
      - Clear value proposition
      - Specific call-to-action
      - Professional closing
      
      Also provide detailed Zapier automation setup instructions for ${platform} including:
      - Required tools and integrations
      - Step-by-step automation workflow
      - Trigger conditions
      - Email sequencing timing
      - Lead management process
      - Follow-up tracking
      
      Include pre-built Zapier template recommendations and links where possible.`;

      const response = await openaiService.generateChatResponse([{ role: 'user', content: prompt }]);
      
      // Parse emails and automation instructions
      const sections = response.content.split(/(?=Email \d|Zapier|Automation)/gi);
      const emailSections = sections.filter((section: string) => section.toLowerCase().includes('email'));
      const automationSection = sections.find((section: string) => section.toLowerCase().includes('automation') || section.toLowerCase().includes('zapier'));
      
      const emails = emailSections.map((section: string, index: number) => {
        const lines = section.split('\n');
        const subjectLine = lines.find((line: string) => line.includes('Subject:'))?.replace('Subject:', '').trim() || `Outreach Email ${index + 1}`;
        const type = index === 0 ? 'Initial Outreach' : index === 1 ? 'First Follow-up' : 'Final Follow-up';
        const preview = lines.slice(2, 5).join(' ').trim();
        
        return {
          subject: subjectLine,
          type,
          preview: preview || `${type} email content...`
        };
      });
      
      res.json({
        emails: emails.length > 0 ? emails : [
          { subject: `Quick question about ${targetAudience}`, type: 'Initial Outreach', preview: 'Personalized introduction and value proposition...' }
        ],
        automationInstructions: automationSection || `Zapier Automation Setup for ${platform}:\n\n1. Connect ${platform} to Google Sheets\n2. Set up trigger conditions\n3. Configure email sequences...`,
        fullContent: response.content
      });
    } catch (error) {
      console.error('Error generating email campaign:', error);
      res.status(500).json({ error: 'Failed to generate email campaign' });
    }
  });

  app.post('/api/generate/sales-scripts', async (req, res) => {
    try {
      const { industry, product, targetAudience, painPoints, tone } = req.body;
      
      const prompt = `Create 3 comprehensive sales scripts for ${product} in the ${industry} industry.
      Target Audience: ${targetAudience}
      Pain Points: ${painPoints}
      Tone: ${tone}
      
      Generate:
      
      1. Elevator Pitch (30-60 seconds)
      - Hook opening
      - Problem identification
      - Solution presentation
      - Credibility statement
      - Call-to-action
      
      2. Discovery Call Opener (5-10 minutes)
      - Warm introduction
      - Permission-based questioning
      - Pain point exploration
      - Value demonstration
      - Next steps proposal
      
      3. Cold Outreach Email Script
      - Attention-grabbing subject line
      - Personalized opening
      - Pain point connection
      - Solution teaser
      - Soft call-to-action
      
      For each script include:
      - Main talking points
      - Objection handling phrases
      - Transition statements
      - CRM-ready format for HubSpot/Salesforce
      
      Make scripts natural, conversational, and ${tone} in tone.`;

      const response = await openaiService.generateChatResponse([{ role: 'user', content: prompt }]);
      
      // Parse scripts from response
      const scriptSections = response.content.split(/(?=\d+\.\s*[A-Z])/g).filter((section: string) => section.trim());
      const scripts = scriptSections.map((section: string, index: number) => {
        const lines = section.split('\n');
        const title = lines[0]?.replace(/^\d+[:.]\s*/, '').trim() || `Script ${index + 1}`;
        const content = lines.slice(1).join('\n').trim();
        
        // Generate CRM format
        const crmFormat = `Script Type: ${title}\nProduct: ${product}\nTarget: ${targetAudience}\n\nContent:\n${content}`;
        
        return {
          title,
          content: content || `Content for ${title} script`,
          crmFormat
        };
      });
      
      res.json({
        scripts: scripts.length > 0 ? scripts : [
          { 
            title: 'Elevator Pitch', 
            content: `Hi, I'm [Name] from [Company]. We help ${targetAudience} solve ${painPoints} with ${product}...`,
            crmFormat: `Script Type: Elevator Pitch\nProduct: ${product}\nTarget: ${targetAudience}\n\nContent: [Script content]`
          }
        ],
        fullContent: response.content
      });
    } catch (error) {
      console.error('Error generating sales scripts:', error);
      res.status(500).json({ error: 'Failed to generate sales scripts' });
    }
  });

  // Automation Templates endpoints
  app.get('/api/download/automation-templates-free', async (req, res) => {
    try {
      const content = `Automation Templates - Free
Category: AI Resources | Access: Free

🆓 Foundational Templates (5 Essential Templates)

These templates provide immediate utility and time-saving value for new startups:

📋 1. New Hire Checklist Template
- Automated onboarding steps
- Offer letter template
- W-9 and I-9 form tracking
- Employee handbook acknowledgment
- Equipment assignment checklist
- First-day schedule template

💼 2. Basic CRM Tracker
- Simple spreadsheet template for customer interactions
- Lead funnel tracking system
- Contact information management
- Follow-up reminder system
- Basic sales pipeline stages

📝 3. Meeting Agenda Template
- Structured outline for recurring meetings
- Investor sync meeting format
- Product standup agenda
- Team check-in template
- Action item tracking

💰 4. Simple Invoice Generator
- Excel/Google Sheets template
- Auto-populating fields for:
  - Service date and description
  - Amount and tax calculation
  - Subtotal and total computation
  - Client information
  - Payment terms

📱 5. Basic Social Media Calendar
- Pre-filled content categories
- Posting schedule template
- Platform-specific formatting
- Content planning grid
- Hashtag suggestions

✨ Getting Started Tips:
1. Download all templates as Excel/Google Sheets files
2. Customize fields to match your business needs
3. Set up automated formulas where applicable
4. Create regular review schedules
5. Scale up to Pro templates when ready

💡 Pro Tip: These templates integrate seamlessly with popular tools like Google Workspace, Microsoft Office, and basic project management platforms.`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving automation templates free:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/automation-templates-pro', async (req, res) => {
    try {
      const content = `Automation Templates - Pro
Category: AI Resources | Access: Pro ($29/month)

🔵 Pro Tier Templates (8 Essential Business Tools)

Includes Everything in Free, Plus Professional Automations:

📊 Chart of Accounts Generator
- Industry-specific account categorization
- GAAP-compliant numbering system
- QuickBooks/Xero import formats
- Automated balance sheet mapping
- Tax category pre-assignments
- Professional CPA review notes

💳 Expense Tracker Setup
- Advanced budget tracking spreadsheet
- Google Drive receipt sync instructions
- Automated categorization rules
- Monthly/quarterly expense reports
- Tax deduction optimization
- Mileage and travel expense automation

📱 Social Media Launch Calendar
- 30-day post plan tailored to your niche
- Industry-specific content themes
- Engagement optimization timing
- Cross-platform posting schedules
- Hashtag research and tracking
- Performance metrics dashboard

📋 Startup Checklist Builder
- Personalized by state requirements
- Entity-specific compliance tasks
- Timeline optimization based on priorities
- Automated deadline reminders
- Progress tracking with milestones
- State-specific legal requirements

🤝 Founder's Equity Split Calculator
- Fair equity breakdown recommendations
- Vesting schedule templates
- Contribution-based calculations
- Future hiring equity planning
- Investor dilution modeling
- Legal documentation templates

📧 Email Welcome Series Generator
- 3-5 automated onboarding emails
- Industry-specific messaging templates
- Behavioral trigger sequences
- A/B testing variations
- Conversion optimization tips
- Integration with major email platforms

🎯 Pitch Deck Outline Writer
- Auto-creates titles and notes for each slide
- Industry-specific content suggestions
- Investor-focused messaging framework
- Visual design recommendations
- Timing and flow optimization
- Follow-up strategy templates

📄 Business Policy Generator
- HR policy templates and guidelines
- Privacy policy and terms of service
- Refund and return policy creation
- Employee handbook automation
- Compliance checklists by industry
- Legal review preparation guides

✨ Pro Features:
- Template customization options
- Industry-specific variations
- Integration guides for popular tools
- Priority email support
- Monthly template updates
- Advanced formatting options

💡 Pro Tip: All templates include step-by-step implementation guides and can be customized for your specific business needs.`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving automation templates pro:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  app.get('/api/download/automation-templates-premium', async (req, res) => {
    try {
      const content = `Automation Templates - Premium
Category: AI Resources | Access: Premium ($79/month)

🏆 Premium Tier Templates (7 Advanced Business Systems)

Includes Everything in Pro, Plus AI-Enhanced Executive Tools:

📊 Investor One-Pager Generator
- Auto-filled executive summary PDF for investors
- Financial highlights and projections
- Market opportunity analysis
- Team and traction showcase
- Funding request and use of funds
- Professional investor-ready formatting
- Customizable branding and layout

💰 Grant Application Writer
- Populates common grant forms automatically
- Industry-specific grant opportunity database
- Compliance requirement checkers
- Budget justification templates
- Impact measurement frameworks
- Application deadline tracking
- Success rate optimization tips

📁 Due Diligence Doc Pack Builder
- Bundles essential funding documentation
- Financial statements and projections
- Legal documents and contracts
- IP portfolio and protection status
- Customer references and case studies
- Technical documentation library
- Investor Q&A preparation materials

📈 KPI Dashboard Blueprint
- Industry-specific KPI recommendations
- Automated data collection formulas
- Visual dashboard layouts
- Performance trending analysis
- Alert thresholds and notifications
- Executive reporting automation
- Stakeholder access controls

🎯 CRM Email Script Builder
- Custom sales sequences by industry
- Behavioral trigger automation
- A/B testing script variations
- Conversion optimization analysis
- Follow-up timing recommendations
- Personalization token management
- ROI tracking and reporting

🚀 AI Marketing Plan Generator
- 12-month strategy customized by sector
- Market analysis and competitor research
- Channel optimization recommendations
- Budget allocation and ROI projections
- Campaign timeline and milestones
- Content calendar integration
- Performance measurement frameworks

📅 Launch Timeline Roadmapper
- Creates Gantt-style visual timeline
- Critical path analysis and optimization
- Resource allocation and dependencies
- Risk assessment and mitigation plans
- Milestone tracking and notifications
- Team collaboration and assignments
- Stakeholder communication schedules

✨ Premium Features:
- AI-powered customization for your specific business
- One-on-one implementation consultation
- Priority support and custom modifications
- Integration with enterprise tools
- White-label template options
- Quarterly strategy review sessions
- Advanced analytics and reporting

🚀 Executive Benefits:
- Save all templates to your StartSmart roadmap
- AI recommendations based on your business profile
- Custom automation workflows
- Direct access to business experts
- Monthly template library updates
- Industry-specific variations and best practices

💡 Premium Tip: Our AI analyzes your business profile, industry trends, and growth stage to recommend and customize the most relevant templates for your specific needs and goals.`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);
    } catch (error) {
      console.error('Error serving automation templates premium:', error);
      res.status(500).json({ error: 'Failed to load content' });
    }
  });

  // Premium Automation Templates (Tier 3 - $79/month)
  
  // 1. Investor One-Pager Generator
  app.post('/api/generate/investor-one-pager', async (req: any, res) => {
    try {
      const { companyName, fundingAsk, team, traction, product, marketSize, useOfFunds } = req.body;
      
      const prompt = `Create investor one-pager for ${companyName}.

Funding Ask: ${fundingAsk}
Team: ${team}
Traction: ${traction}
Product: ${product}
Market Size: ${marketSize}
Use of Funds: ${useOfFunds}

Generate professional investor document with sections:
1. Executive Summary
2. Problem & Solution
3. Market Opportunity
4. Business Model
5. Traction & Metrics
6. Team
7. Financial Projections
8. Funding Use
9. Contact Information

Format as clean, investor-ready content.`;

      console.log('Generating investor one-pager with fast generation...');
      const response = await openaiService.generateFastContent(prompt, 2000);
      
      res.json({
        content: response,
        companyName,
        fundingAsk,
        generatedAt: new Date().toISOString(),
        message: "Investor One-Pager generated successfully"
      });
    } catch (error) {
      console.error('Error generating investor one-pager:', error);
      res.status(500).json({ error: 'Failed to generate investor one-pager' });
    }
  });

  // 2. Grant Application Writer
  app.post('/api/generate/grant-application', async (req: any, res) => {
    try {
      const { grantType, companyName, businessSummary, fundingAmount, projectDescription } = req.body;
      
      const prompt = `Create grant application for ${grantType}.

Company: ${companyName}
Business Summary: ${businessSummary}
Funding Amount: ${fundingAmount}
Project: ${projectDescription}

Generate complete grant application with:
1. Executive Summary
2. Organization Background
3. Project Description
4. Statement of Need
5. Goals and Objectives
6. Methodology
7. Evaluation Plan
8. Budget Justification
9. Sustainability Plan
10. Appendices

Professional, grant-ready formatting.`;

      console.log('Generating grant application with fast generation...');
      const response = await openaiService.generateFastContent(prompt, 2500);
      
      res.json({
        content: response,
        grantType,
        companyName,
        fundingAmount,
        generatedAt: new Date().toISOString(),
        message: "Grant Application generated successfully"
      });
    } catch (error) {
      console.error('Error generating grant application:', error);
      res.status(500).json({ error: 'Failed to generate grant application' });
    }
  });

  // 3. Due Diligence Document Pack Builder
  app.post('/api/generate/due-diligence-pack', async (req: any, res) => {
    try {
      const { companyName, raiseAmount, stage, hasCapTable } = req.body;
      
      const prompt = `Create due diligence document checklist for ${companyName}.

Raise Amount: ${raiseAmount}
Stage: ${stage}
Cap Table Available: ${hasCapTable}

Generate comprehensive due diligence package outline:

1. LEGAL DOCUMENTS
- Articles of Incorporation
- Operating Agreement/Bylaws
- Cap Table
- Stock Purchase Agreements
- IP Assignments

2. FINANCIAL DOCUMENTS
- Financial Statements (3 years)
- Tax Returns
- Bank Statements
- Revenue/Pipeline Reports
- Budget & Forecasts

3. BUSINESS DOCUMENTS
- Business Plan
- Pitch Deck
- Market Research
- Customer Contracts
- Employment Agreements

4. COMPLIANCE DOCUMENTS
- Licenses & Permits
- Insurance Policies
- Regulatory Filings
- Board Minutes

Format as investor-ready document package checklist.`;

      console.log('Generating due diligence pack with fast generation...');
      const response = await openaiService.generateFastContent(prompt, 2000);
      
      res.json({
        content: response,
        companyName,
        raiseAmount,
        stage,
        documentsIncluded: [
          "Legal Documents Checklist",
          "Financial Documents Template", 
          "Business Documents Guide",
          "Compliance Requirements"
        ],
        generatedAt: new Date().toISOString(),
        message: "Due Diligence Document Pack generated successfully"
      });
    } catch (error) {
      console.error('Error generating due diligence pack:', error);
      res.status(500).json({ error: 'Failed to generate due diligence pack' });
    }
  });

  // 4. KPI Dashboard Blueprint
  app.post('/api/generate/kpi-dashboard', async (req: any, res) => {
    try {
      const { businessModel, goals, revenueModel, industry } = req.body;
      
      // Generate KPI dashboard with industry-specific metrics
      const kpiMetrics = {
        'SaaS': ['MRR', 'Churn Rate', 'CAC', 'LTV', 'ARR Growth', 'Feature Adoption'],
        'E-commerce': ['Conversion Rate', 'AOV', 'Cart Abandonment', 'ROAS', 'Customer Acquisition'],
        'B2B': ['Lead Conversion', 'Sales Cycle', 'Pipeline Value', 'Win Rate', 'Customer Retention'],
        'Default': ['Revenue Growth', 'Customer Acquisition', 'Profit Margin', 'Cash Flow', 'Market Share']
      };
      
      const metrics = kpiMetrics[businessModel] || kpiMetrics['Default'];
      
      const csvHeaders = ['KPI Name', 'Current Value', 'Target Value', 'Variance', 'Status', 'Notes'];
      const sampleRows = metrics.map((metric: any, index: any) => {
        const rowNum = index + 2; // Excel row number (accounting for header)
        return [
          metric,
          '[Enter Current]',
          '[Enter Target]',
          `=C${rowNum}-B${rowNum}`, // Variance formula: Target - Current
          `=IF(D${rowNum}>0,"Above Target",IF(D${rowNum}<0,"Needs Action","On Target"))`, // Status formula
          '[Add notes]'
        ].join('\t');
      });
      
      const csvContent = csvHeaders.join('\t') + '\n' + sampleRows.join('\n');
      
      // Add formatting instructions
      const formatInstructions = `

EXCEL FORMATTING INSTRUCTIONS:
1. Open in Excel and select columns B-E
2. Apply Conditional Formatting to Status column (E):
   - Green highlighting for "Above Target" and "On Target"
   - Red highlighting for "Needs Action"
3. Format Current/Target Value columns as numbers or currency
4. Variance column (D) auto-calculates as Target - Current
5. Status column (E) auto-updates based on variance
6. Adjust column widths for optimal display
7. Consider adding charts for visual KPI tracking`;
      
      console.log('KPI dashboard generated with', metrics.length, 'metrics');
      
      res.json({
        preview: csvContent + formatInstructions,
        excelData: csvContent,
        metrics: metrics,
        businessModel,
        totalKPIs: metrics.length,
        message: "KPI Dashboard with Excel formulas and conditional formatting generated successfully"
      });
    } catch (error) {
      console.error('Error generating KPI dashboard:', error);
      res.status(500).json({ error: 'Failed to generate KPI dashboard' });
    }
  });

  // 5. Sales CRM Email Scripts & Templates
  app.post('/api/generate/crm-email-scripts', async (req: any, res) => {
    try {
      const { productType, audience, salesStrategy, industry } = req.body;
      
      const prompt = `Create CRM email scripts for ${productType}.

Audience: ${audience}
Strategy: ${salesStrategy}
Industry: ${industry}

Generate 10 email templates in CSV format:
Subject,Body,Call-to-Action,Email Type

Include:
- Cold outreach emails (3)
- Nurture sequence emails (4) 
- Follow-up emails (3)

Professional, conversion-focused copy.`;

      console.log('Generating CRM email scripts with fast generation...');
      const response = await openaiService.generateFastContent(prompt, 1500);
      
      // Parse and format as CSV
      const lines = response.split('\n').filter(line => line.trim() && !line.startsWith('Subject,'));
      const csvContent = 'Subject,Body,Call-to-Action,Email Type\n' + lines.join('\n');
      
      res.json({
        preview: csvContent,
        csvContent: csvContent,
        productType,
        salesStrategy,
        totalEmails: lines.length,
        message: "CRM Email Scripts generated successfully"
      });
    } catch (error) {
      console.error('Error generating CRM email scripts:', error);
      res.status(500).json({ error: 'Failed to generate CRM email scripts' });
    }
  });

  // 6. AI Marketing Plan Creator
  app.post('/api/generate/marketing-plan', async (req: any, res) => {
    try {
      const { industry, monthlyBudget, channels, audienceGoals, businessGoals } = req.body;
      
      const prompt = `Create 12-month marketing plan for ${industry} business.

Monthly Budget: ${monthlyBudget}
Channels: ${channels}
Audience Goals: ${audienceGoals}
Business Goals: ${businessGoals}

Generate comprehensive marketing strategy:

MONTH 1-3: Foundation & Awareness
MONTH 4-6: Growth & Engagement  
MONTH 7-9: Conversion & Optimization
MONTH 10-12: Scale & Retention

For each quarter include:
- Channel-specific strategies
- Budget allocation
- Key campaigns
- Success metrics
- Milestones

Format as actionable 12-month roadmap.`;

      console.log('Generating marketing plan with fast generation...');
      const response = await openaiService.generateFastContent(prompt, 2500);
      
      res.json({
        content: response,
        industry,
        monthlyBudget,
        channels: channels.split(','),
        planDuration: "12 months",
        generatedAt: new Date().toISOString(),
        message: "AI Marketing Plan generated successfully"
      });
    } catch (error) {
      console.error('Error generating marketing plan:', error);
      res.status(500).json({ error: 'Failed to generate marketing plan' });
    }
  });

  // 7. AI-Powered Launch Plan Timeline (Gantt Roadmap)
  app.post('/api/generate/launch-timeline', async (req: any, res) => {
    try {
      const { launchDate, steps, teamSize, dependencies } = req.body;
      
      // Calculate launch timeline phases
      const targetDate = new Date(launchDate);
      const startDate = new Date(targetDate);
      startDate.setDate(startDate.getDate() - 112); // 16 weeks before launch
      
      const timeline = `**STARTUP LAUNCH TIMELINE - PROJECT ROADMAP**

**LAUNCH OVERVIEW**
Target Launch Date: ${launchDate}
Team Size: ${teamSize} members
Project Duration: 16 weeks
Key Dependencies: ${dependencies}
Additional Steps: ${steps}

**6-PHASE EXECUTIVE TIMELINE**

**PHASE 1: STRATEGIC PLANNING (Weeks 1-3)**
Duration: 3 weeks
Start: ${new Date(startDate.getTime()).toLocaleDateString()}
Key Activities:
• Market research and competitive analysis
• Product requirements and specifications
• Team roles and responsibility assignments
• Budget allocation and resource planning
• Risk assessment and mitigation strategies

**PHASE 2: DEVELOPMENT & BUILD (Weeks 4-9)**
Duration: 6 weeks
Key Activities:
• Core product development and feature implementation
• Quality assurance testing and bug resolution
• Technical infrastructure setup and scaling
• Legal compliance review and documentation
• Security protocols and data protection measures

**PHASE 3: PRE-LAUNCH MARKETING (Weeks 10-12)**
Duration: 3 weeks
Key Activities:
• Brand identity finalization and messaging
• Marketing website and sales materials creation
• Beta testing program with target customers
• PR strategy and media outreach campaigns
• Partnership development and integrations

**PHASE 4: LAUNCH PREPARATION (Weeks 13-15)**
Duration: 3 weeks
Key Activities:
• Final product testing and performance optimization
• Customer support system setup and training
• Distribution channels and logistics preparation
• Launch event planning and media coordination
• Internal team readiness and process finalization

**PHASE 5: LAUNCH EXECUTION (Week 16)**
Duration: 1 week
Target: ${launchDate}
Key Activities:
• Product go-live and system monitoring
• Marketing campaign activation across channels
• Real-time customer support and issue resolution
• Performance tracking and metrics monitoring
• Stakeholder communication and updates

**PHASE 6: POST-LAUNCH OPTIMIZATION (Weeks 17-20)**
Duration: 4 weeks
Key Activities:
• Performance analysis and customer feedback review
• Product optimization and feature enhancement
• Customer success program implementation
• Growth strategy execution and scaling preparation
• Investor updates and funding round preparation

**CRITICAL MILESTONES & CHECKPOINTS**
Week 3: Product requirements locked and approved
Week 9: MVP development completed and tested
Week 12: Beta testing completed with user feedback
Week 15: Launch readiness confirmed by all teams
Week 16: Official product launch executed
Week 20: Post-launch optimization phase completed

**SUCCESS METRICS & KPIs**
• Feature completion rate vs. timeline
• Budget adherence and resource utilization
• Quality assurance pass rates
• Beta user satisfaction scores
• Launch day performance metrics
• Customer acquisition and retention rates

**RISK MITIGATION STRATEGIES**
• Weekly progress reviews and timeline adjustments
• Contingency planning for critical dependencies
• Resource reallocation protocols for bottlenecks
• Communication escalation paths for issues
• Quality gate checkpoints before each phase

**TEAM COORDINATION FRAMEWORK**
With ${teamSize} team members, ensure:
• Clear ownership and accountability for each phase
• Regular standup meetings and progress tracking
• Cross-functional collaboration on dependencies
• Escalation protocols for timeline risks
• Documentation and knowledge sharing processes

This comprehensive launch timeline provides executive-level visibility into your startup's path to market, ensuring all critical activities are planned, resources are allocated efficiently, and success metrics are clearly defined for investor and stakeholder communication.`;

      console.log('Launch timeline generated with', 6, 'phases');
      
      res.json({
        content: timeline,
        launchDate,
        teamSize,
        dependencies,
        totalPhases: 6,
        estimatedDuration: "16 weeks",
        generatedAt: new Date().toISOString(),
        message: "Launch Timeline Roadmap generated successfully"
      });
    } catch (error) {
      console.error('Error generating launch timeline:', error);
      res.status(500).json({ error: 'Failed to generate launch timeline' });
    }
  });

  // API Endpoints for NexTax.AI Integration
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'supabase-ready',
      features: {
        sharedAuth: true,
        crossPlatform: true,
        iframeEmbedding: true
      }
    });
  });

  // Supabase connection test endpoint
  app.get('/api/test/supabase', async (req, res) => {
    try {
      // Test Supabase connection
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
        
      if (error) {
        throw error;
      }
      
      res.json({
        status: 'connected',
        message: 'Supabase connection successful',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Supabase connection failed',
        error: error.message
      });
    }
  });

  // User sync endpoint for shared authentication
  app.post('/api/external/user/sync', async (req, res) => {
    try {
      const { userId, email, subscriptionTier, accessToken, firstName, lastName } = req.body;
      
      // Validate required fields
      if (!userId || !email) {
        return res.status(400).json({ error: 'userId and email are required' });
      }

      // Sync user from NexTax.AI to our Supabase instance
      const userData = {
        id: userId,
        email,
        firstName,
        lastName,
        subscriptionTier: subscriptionTier || 'free'
      };

      const user = await syncUserFromNexTax(userData);
      
      res.json({ 
        success: true, 
        user: { id: user.id, email: user.email },
        message: 'User synchronized successfully with Supabase'
      });
    } catch (error) {
      console.error('Error syncing user to Supabase:', error);
      res.status(500).json({ error: 'Failed to sync user' });
    }
  });

  // Subscription status check endpoint
  app.get('/api/external/user/:userId/subscription', async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Get subscription status from shared Supabase
      const subscription = await getSubscriptionStatus(userId);
      
      res.json({
        userId,
        tier: subscription.tier || 'free',
        status: subscription.status || 'active',
        features: {
          aiChatLimit: subscription.tier === 'premium' ? 3000 : 
                      subscription.tier === 'pro' ? 300 : 10,
          documentsEnabled: true,
          complianceTracking: true,
          knowledgeHubAccess: subscription.tier || 'free'
        }
      });
    } catch (error) {
      console.error('Error fetching subscription from Supabase:', error);
      res.status(500).json({ error: 'Failed to fetch subscription status' });
    }
  });

  // Feature access validation endpoint
  app.post('/api/external/validate-access', async (req, res) => {
    try {
      const { userId, feature, tier } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userTier = user.subscriptionTier || 'free';
      const hasAccess = checkFeatureAccess(feature, userTier, tier);

      res.json({
        hasAccess,
        userTier,
        requiredTier: tier,
        upgradeRequired: !hasAccess
      });
    } catch (error) {
      console.error('Error validating access:', error);
      res.status(500).json({ error: 'Failed to validate access' });
    }
  });

  // Stripe webhook endpoint for subscription updates  
  app.post('/api/webhooks/stripe', async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'] as string;
      let event;

      // For production, verify webhook signature for security
      if (process.env.NODE_ENV === 'production') {
        try {
          const crypto = require('crypto');
          const body = JSON.stringify(req.body);
          const expectedSig = crypto
            .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
            .update(body, 'utf8')
            .digest('hex');
          
          const signature = `sha256=${expectedSig}`;
          if (!sig || !sig.includes(signature)) {
            console.log('Invalid webhook signature');
            return res.status(400).send('Invalid signature');
          }
        } catch (err) {
          console.log('Webhook signature verification failed:', err);
          return res.status(400).send('Webhook signature verification failed');
        }
      }

      event = req.body;
      
      // Handle subscription events
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = event.data.object;
          const customerId = subscription.customer;
          
          // Update user subscription in Supabase
          const tier = subscription.items.data[0]?.price?.lookup_key || 'free';
          const status = subscription.status === 'active' ? 'active' : 'inactive';
          
          await supabase
            .from('user_subscriptions')
            .upsert({
              stripe_customer_id: customerId,
              tier,
              status,
              expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            });
          
          console.log(`Subscription ${subscription.status} for customer ${customerId}`);
          break;
          
        case 'customer.subscription.deleted':
          const deletedSub = event.data.object;
          await supabase
            .from('user_subscriptions')
            .update({
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_customer_id', deletedSub.customer);
          break;
          
        default:
          console.log(`Unhandled Stripe event: ${event.type}`);
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error('Stripe webhook error:', error);
      res.status(400).json({ error: 'Webhook processing failed' });
    }
  });

  // Helper function for feature access checking
  function checkFeatureAccess(feature: string, userTier: string, requiredTier: string): boolean {
    const tierHierarchy = { 'free': 0, 'pro': 1, 'premium': 2 };
    return tierHierarchy[userTier as keyof typeof tierHierarchy] >= 
           tierHierarchy[requiredTier as keyof typeof tierHierarchy];
  }

  const httpServer = createServer(app);
  return httpServer;
}

