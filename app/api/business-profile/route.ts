import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const answers = await request.json()

    // Create tasks based on answers (add tasks for "no" or "undecided" responses)
    const tasksToCreate = []

    if (answers.businessName === "no") {
      tasksToCreate.push({
        userId,
        taskName: "Choose Business Name",
        description: "Brainstorm and select a unique business name that reflects your brand",
        category: "foundation",
        status: "pending",
        dueDate: null,
        orderIndex: 1,
      })
    }

    if (answers.nameAvailable === "no") {
      tasksToCreate.push({
        userId,
        taskName: "Check Business Name Availability",
        description: "Verify your chosen business name is available in your state",
        category: "legal",
        status: "pending",
        dueDate: null,
        orderIndex: 2,
      })
    }

    if (answers.businessType === "undecided") {
      tasksToCreate.push({
        userId,
        taskName: "Choose Business Entity Type",
        description: "Decide between LLC, S-Corp, Corporation, or Sole Proprietorship",
        category: "legal",
        status: "pending",
        dueDate: null,
        orderIndex: 3,
      })
    }

    if (answers.registeredAgent === "no") {
      tasksToCreate.push({
        userId,
        taskName: "Appoint Registered Agent",
        description: "Select and appoint a registered agent for your business",
        category: "legal",
        status: "pending",
        dueDate: null,
        orderIndex: 4,
      })
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
          orderIndex: 5,
        })
      } else if (answers.businessType === "corporation" || answers.businessType === "s-corp") {
        tasksToCreate.push({
          userId,
          taskName: "Prepare Articles of Incorporation",
          description: "Create and file your Articles of Incorporation",
          category: "legal",
          status: "pending",
          dueDate: null,
          orderIndex: 5,
        })
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
        orderIndex: 6,
      })
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
        orderIndex: 7,
      },
      {
        userId,
        taskName: "Set Up Business Accounting",
        description: "Choose and implement an accounting system",
        category: "financial",
        status: "pending",
        dueDate: null,
        orderIndex: 8,
      },
      {
        userId,
        taskName: "Register for State and Local Taxes",
        description: "Complete state and local tax registration requirements",
        category: "compliance",
        status: "pending",
        dueDate: null,
        orderIndex: 9,
      },
    )

    // Create all the tasks
    for (const taskData of tasksToCreate) {
      await storage.createProgressTask(taskData)
    }

    return NextResponse.json({
      message: "Profile created and tasks generated successfully",
      tasksCreated: tasksToCreate.length,
    })
  } catch (error) {
    console.error("Error creating business profile:", error)
    return NextResponse.json({ message: "Failed to create business profile" }, { status: 500 })
  }
}
