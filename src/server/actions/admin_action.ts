"use server";

import { currentUser } from "@clerk/nextjs/server";
import Limit from "p-limit";
import { getCategoryFromMimeType } from "~/lib/utils";
import driveService from "../services/drive_service";
import fileService from "../services/file_service";
import folderService from "../services/folder_service";
import { revalidatePath } from "next/cache";

// Limit concurrent operations to prevent overload
const limit = Limit(5);

export const syncDrive = async () => {
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");
    
    // Get all items from Google Drive
    const items = await driveService.getAllItems();
    if (!items) throw new Error("Failed to retrieve google drive files");

    // First sync all folders to ensure they exist
    const folderItems = items.filter(
      (item) => item.mimeType === "application/vnd.google-apps.folder"
    );
    
    // Create a map to track folder relationships
    const folderMap = new Map<string, string>();
    folderItems.forEach(item => {
      if (item.parents?.[0]) {
        folderMap.set(item.id!, item.parents[0]);
      }
    });

    // Get all existing folders to avoid unnecessary updates
    const existingFolders = await folderService.findMany();
    const existingFolderMap = new Map(existingFolders.map(f => [f.googleId, f]));

    // Sync folders in order of hierarchy (root first, then children)
    const syncedFolders = new Set<string>();
    const syncFolder = async (folderId: string) => {
      if (syncedFolders.has(folderId)) return;
      
      const folder = folderItems.find(item => item.id === folderId);
      if (!folder) return;

      const parentId = folderMap.get(folderId);
      if (parentId && !syncedFolders.has(parentId)) {
        await syncFolder(parentId);
      }

      // Skip if folder exists and hasn't changed
      const existingFolder = existingFolderMap.get(folderId);
      if (existingFolder && 
          existingFolder.title === folder.name &&
          existingFolder.description === folder.description &&
          existingFolder.parentId === (parentId ? existingFolderMap.get(parentId)?.id : null)) {
        syncedFolders.add(folderId);
        return;
      }

      try {
        await folderService.upsert({
          parent: parentId 
            ? { connect: { googleId: parentId } }
            : undefined,
          description: folder.description,
          userClerkId: user.id,
          googleId: folder.id!,
          title: folder.name!,
          isRoot: !folder.parents || folder.parents.length === 0,
        });
        syncedFolders.add(folderId);
      } catch (error) {
        console.error("Error syncing folder:", error);
      }
    };

    // Sync all folders with proper error handling
    await Promise.allSettled(
      folderItems.map(item => 
        limit(() => syncFolder(item.id!))
      )
    );

    // Then sync all files
    const fileItems = items.filter(
      (item) => item.mimeType !== "application/vnd.google-apps.folder"
    );

    // Get all existing files to avoid unnecessary updates
    const existingFiles = await fileService.findMany();
    const existingFileMap = new Map(existingFiles.map(f => [f.googleId, f]));

    // Process files in larger batches
    const batchSize = 50;
    for (let i = 0; i < fileItems.length; i += batchSize) {
      const batch = fileItems.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map((item) =>
          limit(async () => {
            try {
              const mimeType = item.mimeType!;
              const category = getCategoryFromMimeType(mimeType);
              if (!category) {
                console.warn(`Unrecognized file type for ${item.name}: ${mimeType}`);
                return;
              }

              const parentFolder = item.parents?.[0];
              if (!parentFolder) {
                console.warn(`File ${item.name} has no parent folder`);
                return;
              }

              // Check if file exists and hasn't changed
              const existingFile = existingFileMap.get(item.id!);
              if (existingFile && 
                  existingFile.title === item.name &&
                  existingFile.description === item.description &&
                  existingFile.folder?.googleId === parentFolder &&
                  existingFile.fileSize === Number(item.size)) {
                return;
              }

              // Only update if the file exists, don't create new ones
              if (existingFile) {
                return await fileService.update(existingFile.id, {
                  folder: { connect: { googleId: parentFolder } },
                  iconLink: item.iconLink?.replace("16", "64") || "",
                  originalFilename: item.originalFilename!,
                  webContentLink: item.webContentLink!,
                  fileExtension: item.fileExtension!,
                  thumbnailLink: item.thumbnailLink,
                  webViewLink: item.webViewLink!,
                  description: item.description,
                  fileSize: Number(item.size),
                  mimeType: item.mimeType!,
                  userClerkId: user.id,
                  categeory: category,
                  title: item.name!,
                });
              } else {
                // Create new file if it doesn't exist
                return await fileService.upsert({
                  folder: { connect: { googleId: parentFolder } },
                  iconLink: item.iconLink?.replace("16", "64") || "",
                  originalFilename: item.originalFilename!,
                  webContentLink: item.webContentLink!,
                  fileExtension: item.fileExtension!,
                  thumbnailLink: item.thumbnailLink,
                  webViewLink: item.webViewLink!,
                  description: item.description,
                  fileSize: Number(item.size),
                  mimeType: item.mimeType!,
                  userClerkId: user.id,
                  categeory: category,
                  title: item.name!,
                  googleId: item.id!,
                });
              }
            } catch (error) {
              console.error("Error syncing file:", error);
            }
          })
        )
      );
    }

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");
  } catch (error) {
    console.error("Error in syncDrive:", error);
    throw error;
  }
};
