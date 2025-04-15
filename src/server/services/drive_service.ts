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
      private_key: env.GOOGLE_PRIVATE_KEY,
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
      const rootId = (await this.getRootFolder()).id;
      if (!rootId) throw new Error("Failed to retrieve root folder");

      const allFiles: drive_v3.Schema$File[] = [];
      await this.fetchFiles(rootId, allFiles);

      return allFiles;
    } catch (error) {
      console.error(error);
      throw new Error((error as Error).message);
    }
  };

  /**
   * Get Files recursively
   * @param folderId ID of the folder to get the content of
   * @param allFiles list of files to add the results to
   */
  fetchFiles = async (folderId: string, allFiles: drive_v3.Schema$File[]) => {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        pageSize: 1000,
        fields: "*",
      });

      const files = response.data.files || [];
      allFiles.push(...files);

      for (const file of files) {
        if (file.mimeType === "application/vnd.google-apps.folder") {
          await this.fetchFiles(file.id!, allFiles); // Recursively fetch subfolder contents
        }
      }
    } catch (error) {
      console.error(error);
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
      const stream = Readable.from(buffer);

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
        fields: "*",
      });

      await this.drive.permissions.create({
        fileId: response.data.id!,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      return response.data;
    } catch (error) {
      console.error(error);
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
      // First get the current parents of the item
      const file = await this.drive.files.get({
        fileId: itemId,
        fields: 'parents',
      });

      // Remove the item from its current parent(s)
      if (file.data.parents) {
        await this.drive.files.update({
          fileId: itemId,
          removeParents: file.data.parents.join(','),
          addParents: targetFolderId,
        });
      } else {
        // If no parents, just add to the new folder
        await this.drive.files.update({
          fileId: itemId,
          addParents: targetFolderId,
        });
      }

      return true;
    } catch (error) {
      console.error(error);
      throw new Error((error as Error).message);
    }
  };
}

const driveService = new DriveService();
export default driveService;
