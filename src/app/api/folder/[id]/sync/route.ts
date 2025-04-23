import { NextResponse } from "next/server";
import { SyncService } from "~/server/services/sync_service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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