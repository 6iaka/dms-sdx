"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import driveService from "../services/drive_service";
import folderService from "../services/folder_service";
import fileService from "../services/file_service";

export const getAllFolders = async () => {
  try {
    const folders = await folderService.findMany();
    return folders;
  } catch (error) {
    console.error(error);
  }
};

export const findFolderById = async (id: number) => {
  try {
    const folders = await folderService.findById(id);
    return folders;
  } catch (error) {
    console.error(error);
  }
};

export const createRootFolder = async () => {
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not autorized");
    const root = await driveService.getRootFolder();
    if (!root.id) throw new Error("Root folder not found");

    const folderExists = await folderService.findByGoogleId(root.id);
    if (folderExists) return folderExists;

    const folder = await folderService.upsert({
      description: "Main folder of the project.",
      userClerkId: user.id,
      googleId: root.id,
      title: "Root",
      isRoot: true,
    });

    return folder;
  } catch (error) {
    console.error(error);
  }
};

export const createNewFolder = async (payload: {
  title: string;
  description?: string;
  parentId?: number;
}) => {
  let driveId = "";
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");

    const folderId = payload?.parentId
      ? (await folderService.findById(payload.parentId))?.googleId
      : (await driveService.getRootFolder()).id;

    if (!folderId) throw new Error("Failed to retrieve FolderID");

    const driveFolder = await driveService.createFolder({
      description: payload.description,
      title: payload.title,
      folderId,
    });
    if (!driveFolder.id) throw new Error("Folder GoogleId not found");
    driveId = driveFolder.id;

    await folderService.upsert({
      parent: { connect: { googleId: folderId } },
      description: payload.description,
      googleId: driveFolder.id,
      title: payload.title,
      userClerkId: user.id,
    });

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");
  } catch (error) {
    await driveService.deleteItem(driveId);
    console.error(error);
  }
};

export const editFolder = async (payload: {
  id: number;
  title: string;
  description?: string;
}) => {
  const schema = z.object({
    id: z.coerce.number().min(1),
    title: z.string().trim(),
    description: z.string().optional(),
  });
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");
    const valid = schema.parse(payload);

    const newFolder = await folderService.update(valid.id, {
      description: valid.description,
      title: valid.title,
    });

    await driveService.renameItem(newFolder.googleId, payload.title);

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");
  } catch (error) {
    console.error(error);
  }
};

export async function deleteFolder(id: number) {
  try {
    // Get the folder from our database
    const folder = await folderService.findById(id);
    if (!folder) {
      throw new Error("Folder not found in database");
    }

    // Get all child folders and files
    const childFolders = await folderService.findByParentId(id);
    const childFiles = await fileService.findByFolderId(id);

    // Recursively delete all child folders
    for (const childFolder of childFolders) {
      await deleteFolder(childFolder.id);
    }

    // Delete all child files
    for (const childFile of childFiles) {
      try {
        // Delete from Google Drive first
        if (childFile.googleId) {
          await driveService.deleteItem(childFile.googleId);
        }
        // Then delete from our database
        await fileService.delete(childFile.id);
      } catch (error) {
        console.error(`Error deleting file ${childFile.id}:`, error);
      }
    }

    // Delete from Google Drive first
    try {
      await driveService.deleteItem(folder.googleId);
    } catch (error) {
      // If we can't delete from Google Drive, still try to delete from our database
      console.error("Error deleting from Google Drive:", error);
    }

    // Delete from our database
    await folderService.delete(id);

    // Revalidate the paths
    revalidatePath("/");
    revalidatePath(`/folder/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting folder:", error);
    if (error instanceof Error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
    return { 
      success: false, 
      error: "An unknown error occurred while deleting the folder" 
    };
  }
}

export const searchFolder = async (query: string) => {
  try {
    const results = await folderService.search(query);
    return results;
  } catch (error) {
    console.error(error);
  }
};

export const toggleFolderFavorite = async (id: number) => {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Not authorized");

    console.log("Toggling favorite for folder:", id);
    const folder = await folderService.toggleFavorite(id);
    console.log("Folder after toggle:", folder);
    
    revalidatePath("/");
    revalidatePath("/folder/:id", "page");
    return {
      success: true,
      isFavorite: folder.isFavorite,
      message: folder.isFavorite ? "Added to favorites" : "Removed from favorites"
    };
  } catch (error) {
    console.error("Error in toggleFolderFavorite:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update favorite status"
    };
  }
};

export const moveFolder = async (folderId: number, targetFolderId: number) => {
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");
    
    // Get the folders from our database
    const folder = await folderService.findById(folderId);
    const targetFolder = await folderService.findById(targetFolderId);
    
    if (!folder || !targetFolder) {
      throw new Error("Folder not found");
    }

    // Move the folder in Google Drive
    await driveService.moveItem(folder.googleId, targetFolder.googleId);

    // Update the folder in our database
    await folderService.update(folderId, {
      parent: { connect: { id: targetFolderId } },
    });

    revalidatePath("/");
    revalidatePath("/folder/[id]", "page");

    return { success: true, message: "Folder moved successfully" };
  } catch (error) {
    console.error("Error moving folder:", error);
    throw error;
  }
};

export async function getFolders() {
  try {
    return await folderService.findMany();
  } catch (error) {
    console.error("Error fetching folders:", error);
    throw new Error("Failed to fetch folders");
  }
}
