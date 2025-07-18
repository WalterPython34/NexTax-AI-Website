import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"
import { insertBusinessProfileSchema } from "@/lib/schema"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const profiles = await storage.getUserBusinessProfiles(userId)
    return NextResponse.json(profiles)
  } catch (error) {
    console.error("Error fetching business profiles:", error)
    return NextResponse.json({ message: "Failed to fetch business profiles" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const profileData = insertBusinessProfileSchema.parse({ ...body, userId })
    const profile = await storage.createBusinessProfile(profileData)

    // Create default progress tasks for this business
    await storage.createDefaultProgressTasks(userId, profile.id)

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Error creating business profile:", error)
    return NextResponse.json({ message: "Failed to create business profile" }, { status: 500 })
  }
}
