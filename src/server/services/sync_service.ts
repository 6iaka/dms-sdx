"server only";
import { DriveService } from "./drive_service";
import { FolderService } from "./folder_service";
import { FileService } from "./file_service";

export class SyncService {
  private driveService = new DriveService();
  private folderService = new FolderService();
  private fileService = new FileService();

  /**
   * Quick sync that fetches all items in the folder and its subfolders
   */
  quickSync = async (folderId: string) => {
    try {
      // Get the folder from our database
      const folder = await this.folderService.findByGoogleId(folderId);
      if (!folder) {
        throw new Error("Folder not found in database");
      }

      // First, check if this folder is already marked as root
      if (folder.isRoot) {
        console.log("This folder is already marked as root, skipping root folder creation");
        return;
      }

      // Get or create the root folder
      let rootFolder = await this.folderService.findRoot();
      if (!rootFolder) {
        // If no root folder exists, create one
        const driveRoot = await this.driveService.getRootFolder();
        if (!driveRoot.id) {
          throw new Error("Failed to get or create root folder");
        }
        
        // Create the root folder in our database
        rootFolder = await this.folderService.upsert({
          googleId: driveRoot.id,
          title: "Root",
          userClerkId: folder.userClerkId,
          description: "Main folder of the project",
          isRoot: true,
        });
      }

      if (!rootFolder) {
        throw new Error("Failed to get or create root folder");
      }

      // Get all items in the folder and its subfolders
      const allItems = await this.driveService.listItemsInFolder(folderId, true);
      
      if (allItems.length === 0) {
        console.log("No items found in Google Drive folder");
        return;
      }

      console.log(`Found ${allItems.length} total items in Google Drive`);

      // Process all files first
      const files = allItems.filter(item => 
        item.mimeType !== "application/vnd.google-apps.folder" && 
        item.mimeType !== "application/vnd.google-apps.shortcut"
      );

      console.log(`Found ${files.length} files to process`);

      // Get all existing files from our database
      const existingFiles = await this.fileService.findMany();
      const existingFileIds = new Set(existingFiles.map(f => f.googleId));

      for (const file of files) {
        if (!existingFileIds.has(file.id!)) {
          console.log(`Processing new file: ${file.name}`);
          // New file - connect to root folder
          await this.fileService.upsert({
            googleId: file.id!,
            title: file.name!,
            userClerkId: folder.userClerkId,
            folder: { connect: { id: rootFolder.id } }, // Connect to root folder
            categeory: this.getFileCategory(file.mimeType!),
            mimeType: file.mimeType!,
            description: file.description || undefined,
            webViewLink: file.webViewLink!,
            webContentLink: file.webContentLink!,
            thumbnailLink: file.thumbnailLink || undefined,
            iconLink: file.iconLink!,
            fileSize: parseInt(file.size || "0"),
            fileExtension: file.fileExtension || "",
            originalFilename: file.originalFilename || file.name!,
          });
        } else if (existingFiles.find(f => f.googleId === file.id)?.folderId !== rootFolder.id) {
          console.log(`Moving existing file to root: ${file.name}`);
          // Move to root folder
          const existingFile = existingFiles.find(f => f.googleId === file.id);
          if (existingFile) {
            await this.fileService.move([existingFile.id], rootFolder.id);
          }
        }
      }

      // Then process all folders
      const folders = allItems.filter(item => 
        item.mimeType === "application/vnd.google-apps.folder" || 
        (item.mimeType === "application/vnd.google-apps.shortcut" && item.shortcutDetails?.targetId)
      );

      // Get all existing folders from our database
      const existingFolders = await this.folderService.findMany();
      const existingFolderIds = new Set(existingFolders.map(f => f.googleId));

      for (const item of folders) {
        if (item.mimeType === "application/vnd.google-apps.folder") {
          if (!existingFolderIds.has(item.id!)) {
            console.log(`Processing new folder: ${item.name}`);
            // Handle new folder - connect to root folder but don't mark as root
            await this.folderService.upsert({
              googleId: item.id!,
              title: item.name!,
              userClerkId: folder.userClerkId,
              description: item.description || undefined,
              parent: { connect: { id: rootFolder.id } }, // Connect to root folder
              isRoot: false, // Don't mark as root by default
              isShortcut: false,
              lastSyncTime: new Date(),
            });
          } else if (existingFolders.find(f => f.googleId === item.id)?.parentId !== rootFolder.id) {
            console.log(`Moving existing folder to root: ${item.name}`);
            // Move to root folder but preserve root/favorite status
            const existingFolder = existingFolders.find(f => f.googleId === item.id);
            if (existingFolder) {
              await this.folderService.move(existingFolder.id, rootFolder.id);
            }
          }
        } else if (item.mimeType === "application/vnd.google-apps.shortcut" && item.shortcutDetails?.targetId) {
          // Handle shortcut
          const targetFolder = await this.driveService.getFile(item.shortcutDetails.targetId);
          if (targetFolder?.mimeType === "application/vnd.google-apps.folder") {
            if (!existingFolderIds.has(targetFolder.id!)) {
              console.log(`Processing new shortcut: ${targetFolder.name}`);
              // Handle new shortcut - connect to root folder but don't mark as root
              await this.folderService.upsert({
                googleId: targetFolder.id!,
                title: targetFolder.name!,
                userClerkId: folder.userClerkId,
                description: targetFolder.description || undefined,
                parent: { connect: { id: rootFolder.id } }, // Connect to root folder
                isRoot: false, // Don't mark as root by default
                isShortcut: true,
                lastSyncTime: new Date(),
              });
            } else if (existingFolders.find(f => f.googleId === targetFolder.id)?.parentId !== rootFolder.id) {
              console.log(`Moving existing shortcut to root: ${targetFolder.name}`);
              // Move to root folder but preserve root/favorite status
              const existingShortcut = existingFolders.find(f => f.googleId === targetFolder.id);
              if (existingShortcut) {
                await this.folderService.move(existingShortcut.id, rootFolder.id);
              }
            }
          }
        }
      }

      // Update last sync time
      await this.folderService.update(folder.id, {
        lastSyncTime: new Date(),
      });

      console.log(`Quick sync completed. Processed ${folders.length} folders and ${files.length} files.`);
    } catch (error) {
      console.error("Error in quick sync:", error);
      throw error;
    }
  };

  private getFileCategory(mimeType: string) {
    if (mimeType.startsWith("image/")) return "IMAGE";
    if (mimeType.startsWith("video/")) return "VIDEO";
    return "DOCUMENT";
  }

  /**
   * Sync only items within a specific folder (non-recursive)
   */
  syncFolder = async (folderId: string) => {
    try {
      // Get the folder from our database by its ID
      const folder = await this.folderService.findById(parseInt(folderId));
      if (!folder) {
        throw new Error("Folder not found in database");
      }

      // Get all items in the folder (non-recursive)
      const items = await this.driveService.listItemsInFolder(folder.googleId, false);
      
      if (items.length === 0) {
        console.log("No items found in Google Drive folder");
        return;
      }

      console.log(`Found ${items.length} items in folder`);

      // Process all files first
      const files = items.filter(item => 
        item.mimeType !== "application/vnd.google-apps.folder" && 
        item.mimeType !== "application/vnd.google-apps.shortcut"
      );

      console.log(`Found ${files.length} files to process`);

      // Get all existing files from our database
      const existingFiles = await this.fileService.findMany();
      const existingFileIds = new Set(existingFiles.map(f => f.googleId));

      for (const file of files) {
        if (!existingFileIds.has(file.id!)) {
          console.log(`Processing new file: ${file.name}`);
          // New file - connect to current folder
          await this.fileService.upsert({
            googleId: file.id!,
            title: file.name!,
            userClerkId: folder.userClerkId,
            folder: { connect: { id: folder.id } }, // Connect to current folder
            categeory: this.getFileCategory(file.mimeType!),
            mimeType: file.mimeType!,
            description: file.description || undefined,
            webViewLink: file.webViewLink!,
            webContentLink: file.webContentLink!,
            thumbnailLink: file.thumbnailLink || undefined,
            iconLink: file.iconLink!,
            fileSize: parseInt(file.size || "0"),
            fileExtension: file.fileExtension || "",
            originalFilename: file.originalFilename || file.name!,
          });
        } else if (existingFiles.find(f => f.googleId === file.id)?.folderId !== folder.id) {
          console.log(`Moving existing file to current folder: ${file.name}`);
          // Move to current folder
          const existingFile = existingFiles.find(f => f.googleId === file.id);
          if (existingFile) {
            await this.fileService.move([existingFile.id], folder.id);
          }
        }
      }

      // Then process all folders
      const folders = items.filter(item => 
        item.mimeType === "application/vnd.google-apps.folder" || 
        (item.mimeType === "application/vnd.google-apps.shortcut" && item.shortcutDetails?.targetId)
      );

      // Get all existing folders from our database
      const existingFolders = await this.folderService.findMany();
      const existingFolderIds = new Set(existingFolders.map(f => f.googleId));

      for (const item of folders) {
        if (item.mimeType === "application/vnd.google-apps.folder") {
          if (!existingFolderIds.has(item.id!)) {
            console.log(`Processing new folder: ${item.name}`);
            // Handle new folder - connect to current folder
            await this.folderService.upsert({
              googleId: item.id!,
              title: item.name!,
              userClerkId: folder.userClerkId,
              description: item.description || undefined,
              parent: { connect: { id: folder.id } }, // Connect to current folder
              isRoot: false,
              isShortcut: false,
              lastSyncTime: new Date(),
            });
          } else if (existingFolders.find(f => f.googleId === item.id)?.parentId !== folder.id) {
            console.log(`Moving existing folder to current folder: ${item.name}`);
            // Move to current folder but preserve root/favorite status
            const existingFolder = existingFolders.find(f => f.googleId === item.id);
            if (existingFolder) {
              await this.folderService.move(existingFolder.id, folder.id);
            }
          }
        } else if (item.mimeType === "application/vnd.google-apps.shortcut" && item.shortcutDetails?.targetId) {
          // Handle shortcut
          const targetFolder = await this.driveService.getFile(item.shortcutDetails.targetId);
          if (targetFolder?.mimeType === "application/vnd.google-apps.folder") {
            if (!existingFolderIds.has(targetFolder.id!)) {
              console.log(`Processing new shortcut: ${targetFolder.name}`);
              // Handle new shortcut - connect to current folder
              await this.folderService.upsert({
                googleId: targetFolder.id!,
                title: targetFolder.name!,
                userClerkId: folder.userClerkId,
                description: targetFolder.description || undefined,
                parent: { connect: { id: folder.id } }, // Connect to current folder
                isRoot: false,
                isShortcut: true,
                lastSyncTime: new Date(),
              });
            } else if (existingFolders.find(f => f.googleId === targetFolder.id)?.parentId !== folder.id) {
              console.log(`Moving existing shortcut to current folder: ${targetFolder.name}`);
              // Move to current folder but preserve root/favorite status
              const existingShortcut = existingFolders.find(f => f.googleId === targetFolder.id);
              if (existingShortcut) {
                await this.folderService.move(existingShortcut.id, folder.id);
              }
            }
          }
        }
      }

      // Update last sync time
      await this.folderService.update(folder.id, {
        lastSyncTime: new Date(),
      });

      console.log(`Folder sync completed. Processed ${folders.length} folders and ${files.length} files.`);
    } catch (error) {
      console.error("Error in folder sync:", error);
      throw error;
    }
  };
}