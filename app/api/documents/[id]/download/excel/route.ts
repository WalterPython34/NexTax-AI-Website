import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

// Helper functions from your original code
function convertExpenseTrackerToExcel(content: string): Buffer {
  try {
    const XLSX = require("xlsx")
    const workbook = XLSX.utils.book_new()

    // Parse CSV content directly (our new generation format)
    const lines = content.split("\n").filter((line) => line.trim())
    const expenseLines: string[][] = []

    // Process each line as CSV
    for (const line of lines) {
      if (line.trim()) {
        // Split by comma, but handle quoted strings properly
        const cells = []
        let current = ""
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === "," && !inQuotes) {
            cells.push(current.trim())
            current = ""
          } else {
            current += char
          }
        }
        cells.push(current.trim())

        // Clean up quoted strings
        const cleanedCells = cells.map((cell) => cell.replace(/^"|"$/g, ""))

        if (cleanedCells.length >= 6) {
          expenseLines.push(cleanedCells)
        }
      }
    }

    // If no proper data found, create a basic structure
    if (expenseLines.length === 0) {
      expenseLines.push(["Date", "Description", "Category", "Amount", "Payment Method", "Budget Target", "Notes"])
      expenseLines.push([
        new Date().toISOString().split("T")[0],
        "Sample Expense",
        "Office Supplies",
        "100",
        "Credit Card",
        "500",
        "AI Generated expense tracker",
      ])
    }

    // Create the main expense sheet
    const expenseSheet = XLSX.utils.aoa_to_sheet(expenseLines)
    expenseSheet["!cols"] = [
      { wch: 12 }, // Date
      { wch: 25 }, // Description
      { wch: 20 }, // Category
      { wch: 12 }, // Amount
      { wch: 15 }, // Payment Method
      { wch: 15 }, // Budget Target
      { wch: 30 }, // Notes
    ]

    XLSX.utils.book_append_sheet(workbook, expenseSheet, "Expense Tracker")

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
  } catch (error) {
    console.error("Error creating Excel file:", error)
    // Create a basic fallback Excel file
    const XLSX = require("xlsx")
    const fallbackData = [
      ["Date", "Description", "Category", "Amount", "Payment Method", "Budget Target", "Notes"],
      [
        new Date().toISOString().split("T")[0],
        "Sample Expense",
        "Office Supplies",
        "100",
        "Credit Card",
        "500",
        "Generated expense tracker",
      ],
    ]

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(fallbackData)
    worksheet["!cols"] = [{ wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expense Tracker")

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
  }
}

function convertChartToExcel(content: string): Buffer {
  try {
    const XLSX = require("xlsx")
    // Parse CSV content directly (our new generation format)
    const lines = content.split("\n").filter((line) => line.trim())
    const data: string[][] = []

    // Process each line as CSV
    for (const line of lines) {
      if (line.trim()) {
        // Split by comma, but handle quoted strings properly
        const cells = []
        let current = ""
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === "," && !inQuotes) {
            cells.push(current.trim())
            current = ""
          } else {
            current += char
          }
        }
        cells.push(current.trim())

        // Clean up quoted strings
        const cleanedCells = cells.map((cell) => cell.replace(/^"|"$/g, ""))

        if (cleanedCells.length >= 3) {
          data.push(cleanedCells)
        }
      }
    }

    // If no proper data found, create a basic structure
    if (data.length === 0) {
      data.push(["Account Number", "Account Name", "Account Type", "Description"])
      data.push(["1000", "Cash", "Asset", "Business checking account"])
      data.push(["1100", "Accounts Receivable", "Asset", "Money owed by customers"])
      data.push(["2000", "Accounts Payable", "Liability", "Money owed to vendors"])
      data.push(["3000", "Owner Equity", "Equity", "Owner investment in business"])
      data.push(["4000", "Revenue", "Income", "Sales and service income"])
      data.push(["5000", "Operating Expenses", "Expense", "Business operating costs"])
    }

    // Create Excel workbook
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(data)

    // Set column widths
    worksheet["!cols"] = [
      { width: 15 }, // Account Number
      { width: 30 }, // Account Name
      { width: 15 }, // Account Type
      { width: 40 }, // Description/Statement
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, "Chart of Accounts")

    // Generate Excel buffer
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
  } catch (error) {
    console.error("Error converting chart to Excel:", error)
    // Create a basic fallback Excel file
    const XLSX = require("xlsx")
    const data = [
      ["Account Number", "Account Name", "Account Type", "Description"],
      ["1000", "Cash", "Asset", "Business checking account"],
      ["1100", "Accounts Receivable", "Asset", "Money owed by customers"],
      ["2000", "Accounts Payable", "Liability", "Money owed to vendors"],
      ["3000", "Owner Equity", "Equity", "Owner investment in business"],
      ["4000", "Revenue", "Income", "Sales and service income"],
      ["5000", "Operating Expenses", "Expense", "Business operating costs"],
    ]

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    worksheet["!cols"] = [{ width: 15 }, { width: 30 }, { width: 15 }, { width: 40 }]
    XLSX.utils.book_append_sheet(workbook, worksheet, "Chart of Accounts")

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: documentId } = await params
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const documents = await storage.getUserDocuments(userId)
    const document = documents.find((doc: any) => doc.id === documentId)

    if (!document || document.userId !== userId) {
      return NextResponse.json({ message: "Document not found" }, { status: 404 })
    }

    let excelBuffer: Buffer

    if (document.documentType === "chart_of_accounts") {
      excelBuffer = convertChartToExcel(document.content || "")
    } else if (document.documentType === "expense_tracker") {
      excelBuffer = convertExpenseTrackerToExcel(document.content || "")
    } else {
      return NextResponse.json({ message: "Document type not supported for Excel download" }, { status: 400 })
    }

    const filename = `${document.title.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error downloading Excel document:", error)
    return NextResponse.json({ message: "Failed to download document" }, { status: 500 })
  }
}
