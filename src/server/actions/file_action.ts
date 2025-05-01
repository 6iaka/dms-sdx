"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getCategoryFromMimeType } from "~/lib/utils";
import driveService from "../services/drive_service";
import fileService from "../services/file_service";
import folderService from "../services/folder_service";
import { SyncService } from "../services/sync_service";
import path from "path";
import fs from "fs";

export const getFiles = async (folderId: number) => {
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");
    const files = await fileService.findByFolderId(folderId);

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");

    return files;
  } catch (error) {
    console.error((error as Error).message);
  }
};

export const uploadFiles = async ({
  files,
  folderId,
}: {
  files: File[];
  folderId?: number;
}) => {
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");
    const uploadPromise = files.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      if (folderId) {
        formData.append("folderId", folderId.toString());
      }
      return await uploadFile(formData);
    });

    const upload = await Promise.allSettled(uploadPromise);
    const results = upload.map((item) => {
      if (item.status === "rejected") {
        return { success: false, error: item.reason as string };
      } else {
        return item.value;
      }
    });

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");

    return results;
  } catch (error) {
    console.error((error as Error).message);
    return [{ success: false, error: (error as Error).message }];
  }
};

export const uploadFile = async (formData: FormData) => {
  let driveFileId = "";
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");
    
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");
    
    const folderId = formData.get("folderId") as string;
    const tagNames = JSON.parse(formData.get("tagNames") as string || "[]") as string[];
    const description = formData.get("description") as string;

    console.log("Starting file upload process...");
    console.log("File details:", {
      name: file.name,
      size: file.size,
      type: file.type,
      folderId,
      tagNames,
      description
    });

    // Get target folder ID
    const targetFolderId = folderId
      ? (await folderService.findById(parseInt(folderId)))?.googleId
      : (await driveService.getRootFolder()).id;
    if (!targetFolderId) throw new Error("Failed to retrieve folderId");

    // Start parallel uploads to Google Drive and local storage
    const [driveFile, localFile] = await Promise.all([
      // Upload to Google Drive
      (async () => {
        try {
          console.log("Starting Google Drive upload...");
          const result = await driveService.uploadFile({
            description,
            file,
            folderId: targetFolderId,
          });
          console.log("Google Drive upload completed:", result.id);
          return result;
        } catch (error) {
          console.error("Google Drive upload failed:", error);
          throw error;
        }
      })(),
      
      // Save to local storage
      (async () => {
        try {
          console.log("Starting local storage upload...");
          // Create a unique filename
          const timestamp = Date.now();
          const fileExtension = file.name.split('.').pop();
          const uniqueFilename = `${timestamp}-${file.name}`;
          
          // Save file to local storage
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Create the uploads directory if it doesn't exist
          const uploadDir = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          // Save the file
          const filePath = path.join(uploadDir, uniqueFilename);
          await fs.promises.writeFile(filePath, buffer);
          
          console.log("Local storage upload completed:", filePath);
          return {
            path: filePath,
            filename: uniqueFilename,
            originalFilename: file.name,
            size: file.size,
            mimeType: file.type
          };
        } catch (error) {
          console.error("Local storage upload failed:", error);
          throw error;
        }
      })()
    ]);

    if (!driveFile.id) throw new Error("Failed to retrieve file google data");
    driveFileId = driveFile.id;

    const mimeType = driveFile.mimeType!;
    const category = getCategoryFromMimeType(mimeType);
    if (!category) throw new Error("Unrecognized File Type");

    console.log("Creating database record...");
    // Create file record
    const newFile = await fileService.upsert({
      ...(tagNames.length > 0 && {
        tags: {
          connect: tagNames.map((name) => ({ name })),
        },
      }),
      iconLink: driveFile.iconLink!.replace("16", "64"),
      folder: { connect: { googleId: targetFolderId } },
      originalFilename: driveFile.originalFilename!,
      webContentLink: driveFile.webContentLink!,
      fileExtension: driveFile.fileExtension!,
      thumbnailLink: null, // Initialize as null
      webViewLink: driveFile.webViewLink!,
      fileSize: Number(driveFile.size),
      description,
      mimeType: driveFile.mimeType!,
      googleId: driveFile.id,
      title: driveFile.name!,
      userClerkId: user.id,
      categeory: category,
      localPath: localFile.path, // Store local file path
      localFilename: localFile.filename // Store local filename
    });
    console.log("Database record created:", newFile.id);

    // Update thumbnail asynchronously
    if (mimeType.startsWith('video/') || mimeType.startsWith('image/')) {
      void (async () => {
        try {
          if (mimeType.startsWith('video/')) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
          
          const updatedDriveFile = await driveService.getFile(driveFileId);
          if (updatedDriveFile.thumbnailLink) {
            console.log("Updating thumbnail for file:", newFile.id);
            await fileService.update(newFile.id, {
              thumbnailLink: updatedDriveFile.thumbnailLink,
            });
            console.log("Thumbnail updated successfully");
          }
        } catch (error) {
          console.error('Error updating thumbnail:', error);
        }
      })();
    }

    // Force a sync of the folder to ensure all files are up to date
    console.log("Syncing folder contents...");
    const syncService = new SyncService();
    await syncService.syncFolder(targetFolderId);
    console.log("Folder sync completed");

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");

    return { 
      success: true, 
      data: {
        ...newFile,
        driveStatus: "uploaded",
        localStatus: "uploaded"
      }
    };
  } catch (error) {
    console.error("Upload error:", error);
    
    // Cleanup if Google Drive upload succeeded but local storage failed
    if (driveFileId) {
      console.log("Cleaning up Google Drive file...");
      try {
        await driveService.deleteItem(driveFileId);
      } catch (cleanupError) {
        console.error("Error cleaning up Google Drive file:", cleanupError);
      }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to upload file",
      driveStatus: driveFileId ? "uploaded" : "failed",
      localStatus: "failed"
    };
  }
};

export const deleteFiles = async (ids: number[]) => {
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");
    
    // Get all files first to ensure they exist and get their Google IDs
    const files = await fileService.findByIds(ids);
    if (!files || files.length === 0) throw new Error("No files found to delete");

    // Delete from Google Drive first
    const driveDeletions = files.map(async (file: { id: number; googleId: string | null }) => {
      if (file.googleId) {
        try {
          await driveService.deleteItem(file.googleId);
        } catch (error) {
          console.error(`Error deleting file ${file.id} from Google Drive:`, error);
          // Continue with database deletion even if Google Drive deletion fails
        }
      }
    });
    await Promise.allSettled(driveDeletions);

    // Then delete from our database
    const deletedFiles = await fileService.deleteMany(ids);
    if (!deletedFiles || deletedFiles.count === 0) {
      throw new Error("Failed to delete files from database");
    }

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");

    return { success: true, count: deletedFiles.count };
  } catch (error) {
    console.error("Error in deleteFiles:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to delete files");
  }
};

export const deleteFile = async (id: number) => {
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");

    const file = await fileService.findById(id);
    if (!file) throw new Error("File not found");

    // Delete from Google Drive first
    if (file.googleId) {
      await driveService.deleteItem(file.googleId);
    }

    // Then delete from our database
    const deletedFile = await fileService.delete(id);
    if (!deletedFile) throw new Error("Failed to delete file from database");

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");

    return deletedFile;
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
};

// export const searchFile = async (
//   query: string,
//   category?: Category,
//   tags?: string[],
// ) => {
//   try {
//     const results = await fileService.search(query, category, tags);
//     return results;
//   } catch (error) {
//     console.error((error as Error).message);
//   }
// };

export const updateFile = async (
  id: number,
  data: {
    title?: string;
    tagNames?: string[];
    description?: string;
  },
) => {
  const user = await currentUser();

  try {
    if (!user) {
      console.error("Update failed: User not authenticated");
      throw new Error("Not authorized");
    }

    // Update file with all changes at once
    const updated = await fileService.update(id, {
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      tags: {
        set: [],
        ...(data.tagNames &&
          data.tagNames.length > 0 && {
            connect: data.tagNames.map((name) => ({ name })),
          }),
      },
    });

    if (!updated) {
      console.error("Update failed: No file returned from service");
      throw new Error("Failed to update file");
    }

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");
    revalidatePath("/tags", "page");

    return updated;
  } catch (error) {
    console.error("Error updating file:", {
      error,
      fileId: id,
      updateData: data,
      userId: user?.id
    });
    throw new Error(
      error instanceof Error ? error.message : "Failed to update file"
    );
  }
};

export async function getFilesByTag(tagName: string) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const files = await fileService.findByTag(tagName);
    return files;
  } catch (error) {
    console.error("Error in getFilesByTag:", error);
    throw new Error((error as Error).message);
  }
}

export const assignTagToFiles = async ({
  fileIds,
  tagNames,
}: {
  fileIds: number[];
  tagNames: string[];
}) => {
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");

    // Get all files with their current tags
    const files = await Promise.all(
      fileIds.map((fileId) => fileService.findById(fileId)),
    );

    // Update each file individually, only connecting tags that aren't already present
    const updatePromises = files.map(async (file) => {
      if (!file) return null;

      // Get existing tag names
      const existingTagNames = file.tags.map((tag) => tag.name);

      // Filter out tags that are already present
      const newTags = tagNames.filter(
        (tagName) => !existingTagNames.includes(tagName),
      );

      if (newTags.length === 0) return file;

      return await fileService.update(file.id, {
        tags: {
          connect: newTags.map((name) => ({ name })),
        },
      });
    });

    await Promise.all(updatePromises);

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");
    revalidatePath("/tags", "page");

    return true;
  } catch (error) {
    console.error("Error assigning tags:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to assign tags",
    );
  }
};

export const moveFiles = async ({
  fileIds,
  targetFolderId,
}: {
  fileIds: number[];
  targetFolderId: number;
}) => {
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");

    const updated = await fileService.move(fileIds, targetFolderId);

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");

    return updated;
  } catch (error) {
    console.error("Error moving files:", error);
    throw error;
  }
};
