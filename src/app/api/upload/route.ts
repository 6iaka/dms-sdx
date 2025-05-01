import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "~/server/actions/file_action";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    console.log("Received upload request");
    
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folderId = formData.get("folderId") as string;
    const description = formData.get("description") as string;
    const tagNames = formData.get("tagNames") as string;

    if (!file) {
      console.error("No file provided in request");
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    console.log("Processing upload request:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      folderId,
      hasDescription: !!description,
      hasTags: !!tagNames
    });

    const result = await uploadFile(formData);

    if (result.success && result.data) {
      console.log("Upload completed successfully:", {
        fileId: result.data.id,
        fileName: result.data.title
      });
      return NextResponse.json(result);
    } else {
      console.error("Upload failed:", result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in upload API route:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
} 