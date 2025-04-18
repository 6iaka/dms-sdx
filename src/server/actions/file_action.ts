"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getCategoryFromMimeType } from "~/lib/utils";
import driveService from "../services/drive_service";
import fileService from "../services/file_service";
import folderService from "../services/folder_service";

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

    try {
      const targetFolderId = folderId
        ? (await folderService.findById(parseInt(folderId)))?.googleId
        : (await driveService.getRootFolder()).id;
      if (!targetFolderId) throw new Error("Failed to retrieve folderId");

      console.log("Uploading to Google Drive...");
      const driveFile = await driveService.uploadFile({
        description,
        file,
        folderId: targetFolderId,
      });
      if (!driveFile.id) throw new Error("Failed to retrieve file google data");
      driveFileId = driveFile.id;
      console.log("Google Drive upload successful:", driveFileId);

      const mimeType = driveFile.mimeType!;
      const category = getCategoryFromMimeType(mimeType);
      if (!category) throw new Error("Unrecognized File Type");

      console.log("Creating database record...");
      // Create file record without waiting for thumbnail
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
      });
      console.log("Database record created:", newFile.id);

      // Update thumbnail asynchronously
      if (mimeType.startsWith('video/') || mimeType.startsWith('image/')) {
        void (async () => {
          try {
            // For videos, wait a bit longer for thumbnail generation
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
            } else {
              console.log("No thumbnail available for file:", newFile.id);
            }
          } catch (error) {
            console.error('Error updating thumbnail:', error);
          }
        })();
      }

      revalidatePath("/");
      revalidatePath("/folder/:id", "page");

      return { success: true, data: newFile };
    } catch (error) {
      console.error("Error during file upload process:", error);
      if (driveFileId) {
        console.log("Cleaning up Google Drive file...");
        try {
          await driveService.deleteItem(driveFileId);
        } catch (cleanupError) {
          console.error("Error cleaning up Google Drive file:", cleanupError);
        }
      }
      throw error;
    }
  } catch (error) {
    console.error("Upload error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to upload file" 
    };
  }
};

export const deleteFiles = async (ids: number[]) => {
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");
    const deletePromise = ids.map(async (id) => {
      return await deleteFile(id);
    });
    const deleted = await Promise.allSettled(deletePromise);

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");

    return deleted;
  } catch (error) {
    console.error((error as Error).message);
  }
};

export const deleteFile = async (id: number) => {
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");

    const file = await fileService.findById(id);
    if (!file) throw new Error("File not found");

    // Only delete from our database, not from Google Drive
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
