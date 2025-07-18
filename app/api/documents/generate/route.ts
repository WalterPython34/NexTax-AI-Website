import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"
import { openaiService } from "@/lib/openai"

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { documentType, businessId, title, businessData } = await request.json()

    if (!documentType || !title) {
      return NextResponse.json({ message: "Document type and title are required" }, { status: 400 })
    }

    // Get business profile for context if businessId provided
    let businessProfile = null
    if (businessId) {
      businessProfile = await storage.getBusinessProfile(businessId)
    }

    // Generate document content
    const generatedDoc = await openaiService.generateDocument(documentType, businessProfile, businessData)

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
        generatedAt: new Date().toISOString(),
      },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error("Error generating document:", error)
    return NextResponse.json({ message: "Failed to generate document" }, { status: 500 })
  }
}

