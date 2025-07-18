import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

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

    // For now, return the content as a downloadable text file since we don't have PDF generation
    // The frontend should handle PDF conversion using print functionality
    const filename = `${document.title.replace(/[^a-zA-Z0-9]/g, "_")}.txt`

    return new NextResponse(document.content || "No content available", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error downloading PDF document:", error)
    return NextResponse.json({ message: "Failed to download document" }, { status: 500 })
  }
}
