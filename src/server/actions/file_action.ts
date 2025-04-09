"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import driveService from "../services/drive_service";
import fileService from "../services/file_service";
import folderService from "../services/folder_service";
import { getCategoryFromMimeType } from "~/lib/utils";

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
      const uploaded = await uploadFile({ file, folderId });
      return uploaded;
    });

    const upload = await Promise.allSettled(uploadPromise);
    const results = upload.map((item) => {
      if (item.status === "rejected") {
        return { success: false, error: item.reason as string };
      } else {
        return { success: false, data: item.value };
      }
    });

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");

    return results;
  } catch (error) {
    console.error((error as Error).message);
  }
};

type UploadType = {
  file: File;
  folderId?: number | null;
  tagNames?: string[];
  description?: string;
};

export const uploadFile = async (payload: UploadType) => {
  let driveFileId = "";
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");
    const folderId = payload.folderId
      ? (await folderService.findById(payload.folderId))?.googleId
      : (await driveService.getRootFolder()).id;
    if (!folderId) throw new Error("Failed to retrieve folderId");

    const driveFile = await driveService.uploadFile({
      description: payload.description,
      file: payload.file,
      folderId,
    });
    if (!driveFile.id) throw new Error("Failed to retrieve file google data");
    driveFileId = driveFile.id;

    const mimeType = driveFile.mimeType!;
    const category = getCategoryFromMimeType(mimeType);
    if (!category) throw new Error("Unrecognized File Type");

    const newFile = await fileService.upsert({
      ...(payload.tagNames && {
        tags: {
          connect: payload.tagNames.map(name => ({ name }))
        }
      }),
      iconLink: driveFile.iconLink!.replace("16", "64"),
      folder: { connect: { googleId: folderId } },
      originalFilename: driveFile.originalFilename!,
      webContentLink: driveFile.webContentLink!,
      fileExtension: driveFile.fileExtension!,
      thumbnailLink: driveFile.thumbnailLink,
      webViewLink: driveFile.webViewLink!,
      fileSize: Number(driveFile.size),
      description: payload.description,
      mimeType: driveFile.mimeType!,
      googleId: driveFile.id,
      title: driveFile.name!,
      userClerkId: user.id,
      categeory: category,
    });

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");

    return newFile;
  } catch (error) {
    await driveService.deleteItem(driveFileId);
    console.error((error as Error).message);
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

    // First try to delete from Google Drive
    try {
      await driveService.deleteItem(file.googleId);
    } catch (error) {
      // If we can't delete from Drive, still try to delete from our database
      console.error("Error deleting from Google Drive:", error);
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

export const searchFile = async (query: string) => {
  try {
    const results = await fileService.search({
      text: query,
      type: "",
      name: query,
      tag: ""
    });
    return results;
  } catch (error) {
    console.error((error as Error).message);
  }
};

export const updateFile = async (id: number, data: { 
  title?: string; 
  tagNames?: string[];
  description?: string;
}) => {
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");
    
    // Update file with all changes at once
    const updated = await fileService.update(id, {
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      tags: {
        set: [],
        ...(data.tagNames && data.tagNames.length > 0 && {
          connect: data.tagNames.map(name => ({ name }))
        })
      }
    });

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");
    revalidatePath("/tags", "page");

    return updated;
  } catch (error) {
    console.error("Error updating file:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to update file");
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

    // Update each file individually to ensure proper tag connection
    const updatePromises = fileIds.map(async (fileId) => {
      return await fileService.update(fileId, {
        tags: {
          set: [],
          ...(tagNames.length > 0 && {
            connect: tagNames.map(name => ({ name }))
          })
        }
      });
    });

    await Promise.all(updatePromises);

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");
    revalidatePath("/tags", "page");

    return true;
  } catch (error) {
    console.error("Error assigning tags:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to assign tags");
  }
};
