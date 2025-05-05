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
    if (!items) {
      console.log("No items found in Google Drive");
      return { success: true, message: "Drive is already up to date" };
    }

    console.log(`Found ${items.length} items to sync`);

    // First, ensure we have only one root folder
    const existingRoot = await folderService.findRoot();
    if (existingRoot) {
      console.log("Root folder already exists, skipping creation");
    } else {
      // Create root folder if it doesn't exist
      const rootFolder = items.find(item => !item.parents || item.parents.length === 0);
      if (rootFolder) {
        await folderService.upsert({
          googleId: rootFolder.id!,
          title: rootFolder.name!,
          description: rootFolder.description,
          userClerkId: user.id,
          isRoot: true
        });
        console.log("Created root folder");
      }
    }

    // Process shortcuts first
    const shortcuts = items.filter(item => item.mimeType === "application/vnd.google-apps.shortcut");
    console.log(`Found ${shortcuts.length} shortcuts to process`);

    // Track shortcut target folders to prevent them from becoming root folders
    const shortcutTargetIds = new Set<string>();

    for (const shortcut of shortcuts) {
      if (shortcut.shortcutDetails?.targetId) {
        try {
          const targetFolder = await driveService.getFile(shortcut.shortcutDetails.targetId);
          if (targetFolder && targetFolder.mimeType === "application/vnd.google-apps.folder") {
            // Mark this folder as a shortcut target
            shortcutTargetIds.add(targetFolder.id!);
            
            // Add the shortcut target folder to our items list with the correct parent
            items.push({
              ...targetFolder,
              parents: shortcut.parents // Maintain the original parent relationship
            });
            
            // Get all contents of the target folder
            const targetContents = await driveService.fetchFiles(targetFolder.id!);
            
            // Process each item in the target folder
            for (const content of targetContents) {
              // Maintain the original parent relationship
              const parentId = content.parents?.[0] || targetFolder.id!;
              
              if (content.mimeType === "application/vnd.google-apps.folder") {
                // Handle folder
                await folderService.upsert({
                  googleId: content.id!,
                  title: content.name!,
                  userClerkId: user.id,
                  description: content.description || undefined,
                  parent: { connect: { googleId: parentId } },
                  isRoot: false,
                  isShortcut: false,
                  lastSyncTime: new Date(),
                });
              } else {
                // Handle file
                const category = getCategoryFromMimeType(content.mimeType!);
                if (!category) continue; // Skip files with unrecognized mime types

                await fileService.upsert({
                  googleId: content.id!,
                  title: content.name!,
                  userClerkId: user.id,
                  folder: { connect: { googleId: parentId } },
                  categeory: category,
                  mimeType: content.mimeType!,
                  description: content.description || undefined,
                  webViewLink: content.webViewLink!,
                  webContentLink: content.webContentLink!,
                  thumbnailLink: content.thumbnailLink || undefined,
                  iconLink: content.iconLink!,
                  fileSize: parseInt(content.size || "0"),
                  fileExtension: content.fileExtension || "",
                  originalFilename: content.originalFilename || content.name!,
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error processing shortcut ${shortcut.name}:`, error);
        }
      }
    }

    // Then sync all folders
    const folderItems = items.filter(
      (item) => item.mimeType === "application/vnd.google-apps.folder"
    );
    
    console.log(`Found ${folderItems.length} folders to sync`);
    
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
          // Only set isRoot to true if it's not a shortcut target and has no parents
          isRoot: !shortcutTargetIds.has(folderId) && (!folder.parents || folder.parents.length === 0)
        });
        syncedFolders.add(folderId);
      } catch (error) {
        console.error(`Error syncing folder ${folder.name}:`, error);
        throw error;
      }
    };

    // Sync all folders with proper error handling
    await Promise.allSettled(
      folderItems.map(item => 
        limit(() => syncFolder(item.id!))
      )
    );

    console.log(`Synced ${syncedFolders.size} folders`);

    // Then sync all files
    const fileItems = items.filter(
      (item) => item.mimeType !== "application/vnd.google-apps.folder" && 
               item.mimeType !== "application/vnd.google-apps.shortcut"
    );

    console.log(`Found ${fileItems.length} files to sync`);

    // Get all existing files to avoid unnecessary updates
    const existingFiles = await fileService.findMany();
    const existingFileMap = new Map(existingFiles.map(f => [f.googleId, f]));

    // Process files in larger batches
    const batchSize = 50;
    let syncedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < fileItems.length; i += batchSize) {
      const batch = fileItems.slice(i, i + batchSize);
      console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(fileItems.length/batchSize)}`);
      
      const results = await Promise.allSettled(
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

              // Check if parent folder exists in our database
              const parentFolderInDb = await folderService.findByGoogleId(parentFolder);
              if (!parentFolderInDb) {
                // If parent folder doesn't exist, try to create it
                const parentFolderInDrive = folderItems.find(f => f.id === parentFolder);
                if (!parentFolderInDrive) {
                  console.warn(`Parent folder ${parentFolder} not found in Google Drive`);
                  return;
                }

                // Create the missing parent folder in our database only
                await folderService.upsert({
                  parent: parentFolderInDrive.parents?.[0] 
                    ? { connect: { googleId: parentFolderInDrive.parents[0] } }
                    : undefined,
                  description: parentFolderInDrive.description,
                  userClerkId: user.id,
                  googleId: parentFolderInDrive.id!,
                  title: parentFolderInDrive.name!,
                  isRoot: !parentFolderInDrive.parents || parentFolderInDrive.parents.length === 0,
                });
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
                await fileService.update(existingFile.id, {
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
                syncedCount++;
              } else {
                // Create new file if it doesn't exist
                await fileService.upsert({
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
                syncedCount++;
              }
            } catch (error) {
              console.error(`Error syncing file ${item.name}:`, error);
              errorCount++;
              return null;
            }
          })
        )
      );

      // Revalidate paths after each batch
      revalidatePath("/");
      revalidatePath("/folder/:id", "page");
    }

    console.log(`Sync completed: ${syncedCount} files synced, ${errorCount} errors`);
    revalidatePath("/");
    revalidatePath("/folder/:id", "page");
    return { 
      success: true, 
      message: `Drive sync completed. ${syncedCount} files synced${errorCount > 0 ? ` (${errorCount} errors)` : ''}` 
    };
  } catch (error) {
    console.error("Error in syncDrive:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to sync drive" 
    };
  }
};

export const quickSync = async () => {
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");
    
    // Get the root folder to find the last sync time
    const rootFolder = await folderService.findRoot();
    if (!rootFolder) {
      // If no root folder exists, do a full sync
      return await syncDrive();
    }

    // Get items from Google Drive that were modified after the last sync
    const lastSyncTime = rootFolder.lastSyncTime || new Date(0);
    const items = await driveService.getItemsModifiedAfter(lastSyncTime);
    
    if (!items || items.length === 0) {
      console.log("No new items found in Google Drive");
      return { success: true, message: "Drive is already up to date" };
    }

    console.log(`Found ${items.length} new items to sync`);

    // Filter out hidden files and folders
    const visibleItems = items.filter(item => 
      !item.name?.startsWith('.') && // Unix hidden files
      !item.name?.startsWith('~$') && // Temporary files
      !item.trashed && // Not in trash
      item.owners?.[0]?.me // Only files owned by the user
    );

    // Process shortcuts first
    const shortcuts = visibleItems.filter(item => item.mimeType === "application/vnd.google-apps.shortcut");
    console.log(`Found ${shortcuts.length} shortcuts to process`);

    // Track shortcut target folders to prevent them from becoming root folders
    const shortcutTargetIds = new Set<string>();

    for (const shortcut of shortcuts) {
      if (shortcut.shortcutDetails?.targetId) {
        try {
          const targetFolder = await driveService.getFile(shortcut.shortcutDetails.targetId);
          if (targetFolder && targetFolder.mimeType === "application/vnd.google-apps.folder") {
            // Only process the shortcut target if it was modified after last sync
            if (targetFolder.modifiedTime && new Date(targetFolder.modifiedTime) > lastSyncTime) {
              // Mark this folder as a shortcut target
              shortcutTargetIds.add(targetFolder.id!);
              
              // Add the shortcut target folder to our items list with the correct parent
              visibleItems.push({
                ...targetFolder,
                parents: shortcut.parents // Maintain the original parent relationship
              });
              
              // Only fetch contents that were modified after last sync
              const targetContents = await driveService.fetchFiles(targetFolder.id!);
              const modifiedContents = targetContents.filter(content => 
                content.modifiedTime && 
                new Date(content.modifiedTime) > lastSyncTime &&
                !content.name?.startsWith('.') && // Unix hidden files
                !content.name?.startsWith('~$') && // Temporary files
                !content.trashed && // Not in trash
                content.owners?.[0]?.me // Only files owned by the user
              );
              
              // Process each item in the target folder
              for (const content of modifiedContents) {
                // Maintain the original parent relationship
                const parentId = content.parents?.[0] || targetFolder.id!;
                
                if (content.mimeType === "application/vnd.google-apps.folder") {
                  // Handle folder
                  await folderService.upsert({
                    googleId: content.id!,
                    title: content.name!,
                    userClerkId: user.id,
                    description: content.description || undefined,
                    parent: { connect: { googleId: parentId } },
                    isRoot: false, // Never set as root
                    isShortcut: false,
                    lastSyncTime: new Date(),
                  });
                } else {
                  // Handle file
                  const category = getCategoryFromMimeType(content.mimeType!);
                  if (!category) continue; // Skip files with unrecognized mime types

                  await fileService.upsert({
                    googleId: content.id!,
                    title: content.name!,
                    userClerkId: user.id,
                    folder: { connect: { googleId: parentId } },
                    categeory: category,
                    mimeType: content.mimeType!,
                    description: content.description || undefined,
                    webViewLink: content.webViewLink!,
                    webContentLink: content.webContentLink!,
                    thumbnailLink: content.thumbnailLink || undefined,
                    iconLink: content.iconLink!,
                    fileSize: parseInt(content.size || "0"),
                    fileExtension: content.fileExtension || "",
                    originalFilename: content.originalFilename || content.name!,
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error processing shortcut ${shortcut.name}:`, error);
        }
      }
    }

    // Process folders
    const folderItems = visibleItems.filter(
      (item) => item.mimeType === "application/vnd.google-apps.folder"
    );
    
    // Process files
    const fileItems = visibleItems.filter(
      (item) => item.mimeType !== "application/vnd.google-apps.folder" && 
               item.mimeType !== "application/vnd.google-apps.shortcut"
    );

    // Sync folders
    for (const folder of folderItems) {
      try {
        const parentId = folder.parents?.[0];
        await folderService.upsert({
          googleId: folder.id!,
          title: folder.name!,
          description: folder.description,
          userClerkId: user.id,
          parent: parentId ? { connect: { googleId: parentId } } : undefined,
          isRoot: false, // Never set as root in quick sync
          lastSyncTime: new Date()
        });
      } catch (error) {
        console.error(`Error syncing folder ${folder.name}:`, error);
      }
    }

    // Sync files
    for (const file of fileItems) {
      try {
        const mimeType = file.mimeType!;
        const category = getCategoryFromMimeType(mimeType);
        if (!category) continue;

        const parentFolder = file.parents?.[0];
        if (!parentFolder) continue;

        await fileService.upsert({
          folder: { connect: { googleId: parentFolder } },
          iconLink: file.iconLink?.replace("16", "64") || "",
          originalFilename: file.originalFilename!,
          webContentLink: file.webContentLink!,
          fileExtension: file.fileExtension!,
          thumbnailLink: file.thumbnailLink,
          webViewLink: file.webViewLink!,
          description: file.description,
          fileSize: Number(file.size),
          mimeType: file.mimeType!,
          userClerkId: user.id,
          categeory: category,
          title: file.name!,
          googleId: file.id!,
        });
      } catch (error) {
        console.error(`Error syncing file ${file.name}:`, error);
      }
    }

    // Update last sync time for the root folder
    await folderService.update(rootFolder.id, {
      lastSyncTime: new Date()
    });

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");
    return { 
      success: true, 
      message: `Quick sync completed. ${visibleItems.length} items processed.` 
    };
  } catch (error) {
    console.error("Error in quickSync:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to quick sync drive" 
    };
  }
};
