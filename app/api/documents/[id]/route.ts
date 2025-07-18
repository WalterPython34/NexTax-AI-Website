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

    return NextResponse.json(document)
  } catch (error) {
    console.error("Error fetching document:", error)
    return NextResponse.json({ message: "Failed to fetch document" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: documentId } = await params
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const updates = await request.json()
    const documents = await storage.getUserDocuments(userId)
    const document = documents.find((doc: any) => doc.id === documentId)

    if (!document || document.userId !== userId) {
      return NextResponse.json({ message: "Document not found" }, { status: 404 })
    }

    const updatedDocument = await storage.updateDocument(documentId, {
      ...updates,
      updatedAt: new Date(),
    })

    return NextResponse.json(updatedDocument)
  } catch (error) {
    console.error("Error updating document:", error)
    return NextResponse.json({ message: "Failed to update document" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    await storage.deleteDocument(documentId)
    return NextResponse.json({ message: "Document deleted successfully" })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json({ message: "Failed to delete document" }, { status: 500 })
  }
}
