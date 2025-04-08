"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import driveService from "../services/drive_service";
import folderService from "../services/folder_service";

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

export const deleteFolder = async (id: number) => {
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");
    
    // First get the folder and all its children
    const folder = await folderService.findById(id);
    if (!folder) throw new Error("Folder not found");

    // Delete all child folders recursively
    const deleteChildren = async (folderId: number) => {
      const children = await folderService.findMany({ parentId: folderId });
      for (const child of children) {
        await deleteChildren(child.id);
        try {
          // Try to delete from Google Drive first
          await driveService.deleteItem(child.googleId);
        } catch {
          // If the item doesn't exist in Drive, just log it and continue
          console.log(`Item ${child.googleId} not found in Drive, proceeding with database deletion`);
        }
        await folderService.delete(child.id);
      }
    };

    // Delete all children first
    await deleteChildren(id);

    // Then delete the parent folder
    try {
      // Try to delete from Google Drive first
      await driveService.deleteItem(folder.googleId);
    } catch {
      // If the item doesn't exist in Drive, just log it and continue
      console.log(`Item ${folder.googleId} not found in Drive, proceeding with database deletion`);
    }
    await folderService.delete(id);

    // Revalidate all relevant paths
    revalidatePath("/");
    revalidatePath("/folder/:id", "page");
    revalidatePath("/folder/[id]", "page");
    
    return {
      success: true,
      message: "Folder deleted successfully"
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete folder"
    };
  }
};

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
