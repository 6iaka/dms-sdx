"server only";
import { type drive_v3, google } from "googleapis";
import { Readable } from "stream";
import { env } from "~/env";
import { prisma } from "../db";

export class DriveService {
  private auth = new google.auth.GoogleAuth({
    credentials: {
      type: "service_account",
      project_id: env.GOOGLE_PROJECT_ID,
      private_key_id: env.GOOGLE_PRIVATE_KEY_ID,
      private_key: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: env.GOOGLE_CLIENT_EMAIL,
      client_id: env.GOOGLE_CLIENT_ID,
      universe_domain: "googleapis.com",
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  private drive = google.drive({ version: "v3", auth: this.auth });

  /**
   * Get all google drive files
   * @returns All files and documents in google drive
   */
  getAllItems = async () => {
    try {
      console.log("Starting Google Drive authentication...");
      const authClient = await this.auth.getClient();
      if (!authClient) {
        console.error("Authentication failed: No auth client returned");
        throw new Error("Failed to authenticate with Google Drive");
      }
      console.log("Authentication successful");

      const rootId = (await this.getRootFolder()).id;
      if (!rootId) {
        console.error("Failed to retrieve root folder");
        throw new Error("Failed to retrieve root folder");
      }
      console.log("Root folder retrieved successfully");

      const allFiles: drive_v3.Schema$File[] = [];
      await this.fetchFiles(rootId, allFiles);
      console.log(`Successfully fetched ${allFiles.length} files`);

      return allFiles;
    } catch (error) {
      console.error("Error in getAllItems:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          env: {
            hasClientEmail: !!env.GOOGLE_CLIENT_EMAIL,
            hasPrivateKey: !!env.GOOGLE_PRIVATE_KEY,
            hasProjectId: !!env.GOOGLE_PROJECT_ID,
            hasPrivateKeyId: !!env.GOOGLE_PRIVATE_KEY_ID,
          }
        });
      }
      throw new Error("Failed to fetch files from Google Drive");
    }
  };

  /**
   * Get Files recursively
   * @param folderId ID of the folder to get the content of
   * @param allFiles list of files to add the results to
   */
  fetchFiles = async (folderId: string, allFiles: drive_v3.Schema$File[] = []): Promise<drive_v3.Schema$File[]> => {
    try {
      let pageToken: string | undefined;
      do {
        const response = await this.drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          fields: "nextPageToken, files(id, name, mimeType, size, description, iconLink, originalFilename, webContentLink, fileExtension, thumbnailLink, webViewLink, parents, shortcutDetails)",
          pageSize: 1000,
          pageToken,
        });

        const items = response.data.files || [];
        pageToken = response.data.nextPageToken ?? undefined;

        // Add all items to allFiles first
        allFiles.push(...items);

        // Process shortcuts first
        const shortcuts = items.filter(item => item.mimeType === "application/vnd.google-apps.shortcut");
        for (const shortcut of shortcuts) {
          if (shortcut.shortcutDetails?.targetId) {
            try {
              const targetFolder = await this.getFile(shortcut.shortcutDetails.targetId);
              if (targetFolder && targetFolder.mimeType === "application/vnd.google-apps.folder") {
                // Recursively fetch contents of the target folder
                await this.fetchFiles(targetFolder.id!, allFiles);
              }
            } catch (error) {
              console.error(`Error processing shortcut ${shortcut.name}:`, error);
            }
          }
        }

        // Process regular folders
        const folders = items.filter(item => item.mimeType === "application/vnd.google-apps.folder");
        for (const folder of folders) {
          if (folder.id) {
            // Recursively fetch its contents
            await this.fetchFiles(folder.id, allFiles);
          }
        }

      } while (pageToken);

      return allFiles;
    } catch (error) {
      console.error(`Error fetching files from folder ${folderId}:`, error);
      throw new Error((error as Error).message);
    }
  };

  /**
   * Upload a file to Google Drive
   * @param params Upload parameters including file data and metadata
   * @returns Uploaded file metadata
   */
  uploadFile = async ({
    file,
    folderId,
    description,
  }: {
    file: File;
    folderId: string;
    description?: string;
  }) => {
    try {
      if (!file) throw new Error("No file provided");

      console.log("Starting file upload to Google Drive...");
      console.log("File details:", {
        name: file.name,
        size: file.size,
        type: file.type,
        folderId,
        description
      });

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const stream = Readable.from(buffer);

      // Configure resumable upload for large files
      console.log("Creating file metadata in Google Drive...");
      const response = await this.drive.files.create({
        requestBody: {
          parents: [folderId],
          description: description,
          mimeType: file.type,
          name: file.name,
        },
        supportsAllDrives: true,
        uploadType: "resumable",
        media: {
          mimeType: file.type,
          body: stream,
        },
        fields: "id, name, mimeType, thumbnailLink, webContentLink, webViewLink, iconLink, size, fileExtension, originalFilename",
      });

      console.log("File metadata created, starting upload...");

      // Wait for the upload to complete
      await new Promise((resolve, reject) => {
        let uploadedBytes = 0;
        const totalBytes = file.size;

        stream.on('data', (chunk: Buffer) => {
          uploadedBytes += chunk.length;
          const progress = (uploadedBytes / totalBytes) * 100;
          console.log(`Upload progress: ${progress.toFixed(2)}%`);
        });

        stream.on('end', () => {
          console.log("Upload completed successfully");
          resolve(true);
        });

        stream.on('error', (error) => {
          console.error("Upload error:", error);
          reject(error);
        });
      });

      console.log("Getting file details from Google Drive...");
      const fileData = await this.drive.files.get({
        fileId: response.data.id!,
        fields: "id, name, mimeType, thumbnailLink, webContentLink, webViewLink, iconLink, size, fileExtension, originalFilename",
      });

      console.log("Setting file permissions...");
      await this.drive.permissions.create({
        fileId: fileData.data.id!,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      console.log("File upload completed successfully:", {
        id: fileData.data.id,
        name: fileData.data.name,
        size: fileData.data.size
      });

      return fileData.data;
    } catch (error) {
      console.error("Error in uploadFile:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack
        });
      }
      throw new Error((error as Error).message);
    }
  };

  /**
   * Create a folder
   * @param payload New folder details
   * @returns Created folder details
   */
  createFolder = async (payload: {
    title: string;
    folderId: string;
    description?: string;
  }) => {
    try {
      const response = await this.drive.files.create({
        requestBody: {
          name: payload.title,
          parents: [payload.folderId],
          mimeType: "application/vnd.google-apps.folder",
          description: payload.description,
        },
      });
      return response.data;
    } catch (error) {
      console.error(error);
      throw new Error((error as Error).message);
    }
  };

  /**
   * Get Root Folder from Google Drive
   * @returns Root folder details
   */
  getRootFolder = async () => {
    try {
      // First check if we already have a root folder in our database
      const existingRoot = await prisma.folder.findFirst({
        where: { isRoot: true }
      });

      if (existingRoot) {
        // If we have a root folder in our database, try to get it from Google Drive
        try {
          const response = await this.drive.files.get({
            fileId: existingRoot.googleId,
            fields: "id, name, mimeType, parents",
          });
          return response.data;
        } catch (error) {
          console.error("Error getting existing root folder:", error);
          // If we can't get it from Google Drive, we'll create a new one
        }
      }

      // If we don't have a root folder or can't get it, create a new one
      console.log("Creating new root folder...");
      const newRootFolder = await this.drive.files.create({
        requestBody: {
          name: "Root",
          mimeType: "application/vnd.google-apps.folder",
          description: "Main folder of the project",
        },
      });
      
      if (!newRootFolder.data.id) {
        throw new Error("Failed to create root folder");
      }
      
      // If we had an existing root folder in our database but couldn't get it from Google Drive,
      // update our database to point to the new root folder
      if (existingRoot) {
        await prisma.folder.update({
          where: { id: existingRoot.id },
          data: { googleId: newRootFolder.data.id }
        });
      }
      
      return newRootFolder.data;
    } catch (error) {
      console.error("Error getting root folder:", error);
      throw new Error((error as Error).message);
    }
  };

  /**
   * Rename Item
   * @param itemId ID of the item to be renamed
   * @param newName New name for the item
   * @returns Updated item details
   */
  renameItem = async (itemId: string, newName: string) => {
    try {
      const response = await this.drive.files.update({
        requestBody: { name: newName },
        fileId: itemId,
      });
      return response.data;
    } catch (error) {
      console.error(error);
      throw new Error((error as Error).message);
    }
  };

  /**
   *
   * @param itemId ID of the item to deleete
   * @returns True if item was deleted or error
   */
  deleteItem = async (itemId: string) => {
    try {
      // First try to get the file to check permissions
      const file = await this.drive.files.get({
        fileId: itemId,
        fields: 'permissions',
      });

      // Check if we have delete permission
      const hasDeletePermission = file.data.permissions?.some(
        permission => permission.role === 'owner' || permission.role === 'writer'
      );

      if (!hasDeletePermission) {
        // If we don't have delete permission, try to add it
        await this.drive.permissions.create({
          fileId: itemId,
          requestBody: {
            role: 'writer',
            type: 'user',
            emailAddress: env.GOOGLE_CLIENT_EMAIL,
          },
        });
      }

      // Now try to delete the file
      await this.drive.files.delete({ 
        fileId: itemId,
        supportsAllDrives: true,
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting item:", error);
      if (error instanceof Error) {
        // Check if it's a permission error
        if (error.message.includes('insufficient permissions') || 
            error.message.includes('permission denied')) {
          throw new Error("You don't have permission to delete this item. Please ensure you have the necessary permissions in Google Drive.");
        }
      }
      throw new Error("Failed to delete item: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  /**
   * Move an item to a new folder
   * @param itemId ID of the item to move
   * @param targetFolderId ID of the target folder
   * @returns Updated item details
   */
  moveItem = async (itemId: string, targetFolderId: string) => {
    try {
      // First get the current parents
      const file = await this.drive.files.get({
        fileId: itemId,
        fields: 'parents',
      });

      const previousParents = file.data.parents?.join(',') || '';

      // Move the file to the new folder
      const response = await this.drive.files.update({
        fileId: itemId,
        addParents: targetFolderId,
        removeParents: previousParents,
        fields: '*',
      });

      // For videos, ensure thumbnail is generated
      if (response.data.mimeType?.startsWith('video/')) {
        // Wait a bit for thumbnail generation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get the file again to check thumbnail
        const updatedFile = await this.drive.files.get({
          fileId: itemId,
          fields: 'thumbnailLink',
        });

        if (!updatedFile.data.thumbnailLink) {
          console.warn('Thumbnail not yet generated for video:', itemId);
        }
      }

      return response.data;
    } catch (error) {
      console.error('Error moving item:', error);
      throw new Error((error as Error).message);
    }
  };

  /**
   * Get a single file's details
   * @param fileId ID of the file to get
   * @returns File details
   */
  getFile = async (fileId: string) => {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: "id, name, mimeType, thumbnailLink, webContentLink, webViewLink, iconLink, size, fileExtension, originalFilename",
      });

      // For videos, if no thumbnail is available, wait and try again
      if (response.data.mimeType?.startsWith('video/') && !response.data.thumbnailLink) {
        console.log("Waiting for video thumbnail generation...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const retryResponse = await this.drive.files.get({
          fileId,
          fields: "id, name, mimeType, thumbnailLink, webContentLink, webViewLink, iconLink, size, fileExtension, originalFilename",
        });
        
        if (retryResponse.data.thumbnailLink) {
          console.log("Video thumbnail generated successfully");
          return retryResponse.data;
        }
      }

      return response.data;
    } catch (error) {
      console.error('Error getting file:', error);
      throw new Error(error instanceof Error ? error.message : "Failed to get file");
    }
  };

  /**
   * Get items modified after a specific date
   * @param date The date to check for modifications after
   * @returns Array of modified items
   */
  getItemsModifiedAfter = async (date: Date) => {
    try {
      const allItems: drive_v3.Schema$File[] = [];
      let pageToken: string | undefined;

      do {
        const response = await this.drive.files.list({
          q: `modifiedTime > '${date.toISOString()}' and trashed = false`,
          fields: "nextPageToken, files(id, name, mimeType, size, description, iconLink, originalFilename, webContentLink, fileExtension, thumbnailLink, webViewLink, parents, shortcutDetails, modifiedTime)",
          pageSize: 1000,
          pageToken,
        });

        const items = response.data.files || [];
        allItems.push(...items);
        pageToken = response.data.nextPageToken ?? undefined;
      } while (pageToken);

      return allItems;
    } catch (error) {
      console.error("Error in getItemsModifiedAfter:", error);
      throw new Error((error as Error).message);
    }
  };

  /**
   * List all items in a folder and optionally its subfolders
   * @param folderId ID of the folder to list items from
   * @param recursive Whether to include items from subfolders
   * @returns List of items in the folder
   */
  listItemsInFolder = async (folderId: string, recursive = false): Promise<drive_v3.Schema$File[]> => {
    try {
      const allFiles: drive_v3.Schema$File[] = [];
      
      if (recursive) {
        // Use existing fetchFiles method for recursive listing
        await this.fetchFiles(folderId, allFiles);
      } else {
        // List only direct children
        let pageToken: string | undefined;
        do {
          const response = await this.drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: "nextPageToken, files(id, name, mimeType, size, description, iconLink, originalFilename, webContentLink, fileExtension, thumbnailLink, webViewLink, parents, shortcutDetails)",
            pageSize: 1000,
            pageToken,
          });

          const items = response.data.files || [];
          allFiles.push(...items);
          pageToken = response.data.nextPageToken ?? undefined;
        } while (pageToken);
      }

      return allFiles;
    } catch (error) {
      console.error(`Error listing items in folder ${folderId}:`, error);
      throw new Error((error as Error).message);
    }
  };

  // Add proper type checking for the length property
  private async getFileSize(fileId: string): Promise<number> {
    try {
      const file = await this.drive.files.get({
        fileId,
        fields: 'size',
      });

      if (!file.data || typeof file.data.size !== 'string') {
        return 0;
      }

      return parseInt(file.data.size, 10);
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  }
}

const driveService = new DriveService();
export default driveService;
