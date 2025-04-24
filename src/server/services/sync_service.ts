"server only";
import { DriveService } from "./drive_service";
import { FolderService } from "./folder_service";
import { FileService } from "./file_service";
import { prisma } from "../db";

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

      // Get all items in the folder and its subfolders
      const allItems = await this.driveService.listItemsInFolder(folderId, true);
      
      // Get all items from our database for this folder
      const dbFolders = await this.folderService.findByParentId(folder.id);
      const dbFiles = await this.fileService.findByFolderId(folder.id);

      // Create sets of Google IDs for quick lookup
      const driveItemIds = new Set(allItems.map(item => item.id!));
      const dbFolderIds = new Set(dbFolders.map(f => f.googleId));
      const dbFileIds = new Set(dbFiles.map(f => f.googleId));

      // Find items to delete (in DB but not in Drive)
      const foldersToDelete = dbFolders.filter(f => !driveItemIds.has(f.googleId));
      const filesToDelete = dbFiles.filter(f => !driveItemIds.has(f.googleId));

      // Delete items that no longer exist in Drive
      for (const folderToDelete of foldersToDelete) {
        await this.folderService.delete(folderToDelete.id);
      }
      for (const fileToDelete of filesToDelete) {
        await this.fileService.delete(fileToDelete.id);
      }

      if (allItems.length === 0) {
        console.log("No items found in Google Drive folder");
        return;
      }

      // First, process all folders to ensure the folder structure exists
      const folders = allItems.filter(item => 
        item.mimeType === "application/vnd.google-apps.folder" || 
        (item.mimeType === "application/vnd.google-apps.shortcut" && item.shortcutDetails?.targetId)
      );

      for (const item of folders) {
        if (item.mimeType === "application/vnd.google-apps.folder") {
          // Check if folder already exists in our system
          const existingFolder = await this.folderService.findByGoogleId(item.id!);
          
          if (!existingFolder) {
            // Handle new folder - always connect to root folder
            await this.folderService.upsert({
              googleId: item.id!,
              title: item.name!,
              userClerkId: folder.userClerkId,
              description: item.description || undefined,
              parent: { connect: { id: folder.id } }, // Always connect to root folder
              isRoot: false,
              isShortcut: false,
              lastSyncTime: new Date(),
            });
          } else if (existingFolder.parentId !== folder.id) {
            // Always move to root folder
            await this.folderService.move(existingFolder.id, folder.id);
          }
        } else if (item.mimeType === "application/vnd.google-apps.shortcut") {
          // Handle shortcut
          if (item.shortcutDetails?.targetId) {
            const targetFolder = await this.driveService.getFile(item.shortcutDetails.targetId);
            if (targetFolder?.mimeType === "application/vnd.google-apps.folder") {
              const existingShortcut = await this.folderService.findByGoogleId(targetFolder.id!);
              
              if (!existingShortcut) {
                // Handle new shortcut - always connect to root folder
                await this.folderService.upsert({
                  googleId: targetFolder.id!,
                  title: targetFolder.name!,
                  userClerkId: folder.userClerkId,
                  description: targetFolder.description || undefined,
                  parent: { connect: { id: folder.id } }, // Always connect to root folder
                  isRoot: false,
                  isShortcut: true,
                  lastSyncTime: new Date(),
                });
              } else if (existingShortcut.parentId !== folder.id) {
                // Always move to root folder
                await this.folderService.move(existingShortcut.id, folder.id);
              }
            }
          }
        }
      }

      // Then process all files
      const files = allItems.filter(item => 
        item.mimeType !== "application/vnd.google-apps.folder" && 
        item.mimeType !== "application/vnd.google-apps.shortcut"
      );

      for (const item of files) {
        // Always connect files to the root folder
        await this.fileService.upsert({
          googleId: item.id!,
          title: item.name!,
          userClerkId: folder.userClerkId,
          folder: { connect: { id: folder.id } }, // Always connect to root folder
          categeory: this.getFileCategory(item.mimeType!),
          mimeType: item.mimeType!,
          description: item.description || undefined,
          webViewLink: item.webViewLink!,
          webContentLink: item.webContentLink!,
          thumbnailLink: item.thumbnailLink || undefined,
          iconLink: item.iconLink!,
          fileSize: parseInt(item.size || "0"),
          fileExtension: item.fileExtension || "",
          originalFilename: item.originalFilename || item.name!,
        });
      }

      // Update last sync time
      await this.folderService.update(folder.id, {
        lastSyncTime: new Date(),
      });

      console.log(`Quick sync completed. Processed ${folders.length} folders and ${files.length} files. Deleted ${foldersToDelete.length} folders and ${filesToDelete.length} files.`);
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
} 