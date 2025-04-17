"server only";
import { type drive_v3, google } from "googleapis";
import { Readable } from "stream";
import { env } from "~/env";

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
  fetchFiles = async (folderId: string, allFiles: drive_v3.Schema$File[]) => {
    try {
      let pageToken: string | undefined;
      do {
        const response = await this.drive.files.list({
          q: `'${folderId}' in parents and trashed=false`,
          pageSize: 1000,
          fields: "nextPageToken, files(id, name, mimeType, parents, description, size, iconLink, originalFilename, webContentLink, fileExtension, thumbnailLink, webViewLink)",
          pageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          corpora: "allDrives"
        });

        const files = response.data.files || [];
        console.log(`Fetched ${files.length} files from folder ${folderId}`);
        allFiles.push(...files);

        // Process folders first
        const folders = files.filter(file => file.mimeType === "application/vnd.google-apps.folder");
        console.log(`Found ${folders.length} folders to process`);
        for (const folder of folders) {
          if (folder.id) {
            await this.fetchFiles(folder.id, allFiles);
          }
        }

        pageToken = response.data.nextPageToken ?? undefined;
        if (pageToken) {
          console.log("Fetching next page...");
        }
      } while (pageToken);

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

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // For large files, use resumable upload
      const uploadType = file.size > 5 * 1024 * 1024 ? "resumable" : "multipart";

      const response = await this.drive.files.create({
        requestBody: {
          parents: [folderId],
          description: description,
          mimeType: file.type,
          name: file.name,
        },
        supportsAllDrives: true,
        uploadType,
        media: {
          mimeType: file.type,
          body: Readable.from(buffer),
        },
        fields: "id, name, mimeType, webContentLink, webViewLink, iconLink, size, fileExtension, originalFilename",
      });

      if (!response.data.id) {
        throw new Error("Failed to upload file to Google Drive");
      }

      // Set permissions asynchronously
      void this.drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(error instanceof Error ? error.message : "Failed to upload file");
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
      const response = await this.drive.files.list({
        q: "mimeType = 'application/vnd.google-apps.folder'",
        fields: "*",
      });

      const folders = response.data.files ?? [];
      const rootFolder = folders.find(
        (folder) => !folder.parents || folder.parents.length === 0,
      );
      if (!rootFolder) throw new Error("Root folder not found");

      return rootFolder;
    } catch (error) {
      console.error(error);
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
      await this.drive.files.delete({ fileId: itemId });
      return true;
    } catch (error) {
      console.error(error);
      throw new Error((error as Error).message);
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
        fields: 'id, name, mimeType, thumbnailLink, webContentLink, webViewLink, iconLink, size, fileExtension, originalFilename',
      });

      // For videos, if no thumbnail is available, wait and try again
      if (response.data.mimeType?.startsWith('video/') && !response.data.thumbnailLink) {
        console.log("Waiting for video thumbnail generation...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const retryResponse = await this.drive.files.get({
          fileId,
          fields: 'id, name, mimeType, thumbnailLink, webContentLink, webViewLink, iconLink, size, fileExtension, originalFilename',
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
}

const driveService = new DriveService();
export default driveService;
