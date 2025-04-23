import { NextRequest, NextResponse } from "next/server";
import { SyncService } from "~/server/services/sync_service";

type RouteHandler = (
  request: NextRequest,
  context: { params: { id: string } }
) => Promise<NextResponse>;

export const POST: RouteHandler = async (request, { params }) => {
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
}; 