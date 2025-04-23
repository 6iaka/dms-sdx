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
   * Quick sync that only fetches items modified after the last sync time
   */
  quickSync = async (folderId: string) => {
    try {
      // Get the folder from our database
      const folder = await this.folderService.findByGoogleId(folderId);
      if (!folder) {
        throw new Error("Folder not found in database");
      }

      // Get the last sync time
      const lastSyncTime = folder.lastSyncTime || new Date(0);

      // Get items modified after last sync
      const modifiedItems = await this.driveService.getItemsModifiedAfter(lastSyncTime);
      
      // Filter items that belong to this folder or its children
      const relevantItems = modifiedItems.filter(item => {
        const parents = item.parents || [];
        return parents.includes(folderId);
      });

      if (relevantItems.length === 0) {
        console.log("No new items found in Google Drive");
        return;
      }

      // Process each modified item
      for (const item of relevantItems) {
        if (item.mimeType === "application/vnd.google-apps.folder") {
          // Check if folder already exists in our system
          const existingFolder = await this.folderService.findByGoogleId(item.id!);
          
          if (!existingFolder) {
            // Handle new folder
            await this.folderService.upsert({
              googleId: item.id!,
              title: item.name!,
              userClerkId: folder.userClerkId,
              description: item.description || undefined,
              parent: { connect: { id: folder.id } },
              isRoot: false,
              isShortcut: false,
              lastSyncTime: new Date(),
            });
          } else if (existingFolder.parentId !== folder.id) {
            // Update parent if it has changed
            await this.folderService.move(existingFolder.id, folder.id);
          }
        } else if (item.mimeType === "application/vnd.google-apps.shortcut") {
          // Handle shortcut
          if (item.shortcutDetails?.targetId) {
            const targetFolder = await this.driveService.getFile(item.shortcutDetails.targetId);
            if (targetFolder?.mimeType === "application/vnd.google-apps.folder") {
              const existingShortcut = await this.folderService.findByGoogleId(targetFolder.id!);
              
              if (!existingShortcut) {
                await this.folderService.upsert({
                  googleId: targetFolder.id!,
                  title: targetFolder.name!,
                  userClerkId: folder.userClerkId,
                  description: targetFolder.description || undefined,
                  parent: { connect: { id: folder.id } },
                  isRoot: false,
                  isShortcut: true,
                  lastSyncTime: new Date(),
                });
              } else if (existingShortcut.parentId !== folder.id) {
                await this.folderService.move(existingShortcut.id, folder.id);
              }
            }
          }
        } else {
          // Handle file
          await this.fileService.upsert({
            googleId: item.id!,
            title: item.name!,
            userClerkId: folder.userClerkId,
            folder: { connect: { id: folder.id } },
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
      }

      // Update last sync time
      await this.folderService.update(folder.id, {
        lastSyncTime: new Date(),
      });

      console.log(`Quick sync completed. Processed ${relevantItems.length} items.`);
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