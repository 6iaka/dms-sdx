import { NextRequest, NextResponse } from "next/server";
import { SyncService } from "~/server/services/sync_service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const syncService = new SyncService();
    await syncService.quickSync(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in quick sync:", error);
    return NextResponse.json(
      { error: "Failed to sync folder" },
      { status: 500 }
    );
  }
}

// Add type declaration for the route
declare module "next/server" {
  interface NextRequest {
    params: { id: string };
  }
} 