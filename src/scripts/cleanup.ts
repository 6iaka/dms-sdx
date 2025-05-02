"use server"

import { type drive_v3, google } from "googleapis";
import { env } from "~/env";
import { FolderService } from "../server/services/folder_service";
import { PrismaClient } from "@prisma/client";

const auth = new google.auth.GoogleAuth({
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

  const drive = google.drive({ version: "v3", auth });

const prisma = new PrismaClient();

export const getAllItems = async () => {
  try {
    let allFiles: drive_v3.Schema$File[] = [];
    let pageToken: string | undefined;
    
    do {
      const response = await drive.files.list({
        fields: "*",
        pageSize: 1000,
        pageToken,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        corpora: 'allDrives',
        q: 'trashed = false'
      });

      const items = response.data.files || [];
      pageToken = response.data.nextPageToken ?? undefined;
      allFiles = [...allFiles, ...items];
    } while (pageToken);

    return allFiles;
  } catch (error) {
    console.error("Error fetching files from Google Drive:", error);
    throw error;
  }
};

export const moveAllItems = async (targetFolderId: string) => {
  try {
    console.log("Starting thorough file analysis...");
    // Get all files including those in shared drives
    const allItems = await getAllItems();
    const cannotDelete: { name: string; owner: string; id: string; size: number; location: string }[] = [];
    const serviceAccountFiles: { name: string; id: string; size: number; location: string }[] = [];
    let deletedCount = 0;
    let totalSize = 0;
    let deletedSize = 0;
    
    console.log(`\nFound ${allItems.length} total items to analyze`);
    console.log("Analyzing file ownership, sizes, and locations...");

    // First, identify all service account files
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      if (!item) continue;
      
      try {
        process.stdout.write(`\rAnalyzing files: ${i + 1}/${allItems.length} (${Math.round((i + 1) / allItems.length * 100)}%)`);
        
        const file = await drive.files.get({
          fileId: item.id!,
          fields: 'owners,size,parents,driveId',
          supportsAllDrives: true
        });

        if (file.data.owners?.some(owner => owner.emailAddress === env.GOOGLE_CLIENT_EMAIL)) {
          const fileSize = Number(file.data.size || 0);
          const location = file.data.driveId ? 'Shared Drive' : 'My Drive';
          serviceAccountFiles.push({
            name: item.name || 'Unknown',
            id: item.id!,
            size: fileSize,
            location
          });
          totalSize += fileSize;
        }
      } catch (error) {
        console.error(`\nError checking file ${item.name}:`, error);
      }
    }

    console.log(`\n\nAnalysis complete!`);
    console.log(`Found ${serviceAccountFiles.length} files owned by service account`);
    console.log(`Total size to be freed: ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log("\nFile locations:");
    const locationSummary = serviceAccountFiles.reduce((acc, file) => {
      acc[file.location] = (acc[file.location] || 0) + file.size;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(locationSummary).forEach(([location, size]) => {
      console.log(`${location}: ${(size / 1024 / 1024 / 1024).toFixed(2)} GB`);
    });

    console.log("\nStarting deletion operations...");

    // Delete service account files
    for (let i = 0; i < serviceAccountFiles.length; i++) {
      const file = serviceAccountFiles[i];
      if (!file) continue;
      
      try {
        process.stdout.write(`\rProcessing file ${i + 1}/${serviceAccountFiles.length}: ${file.name} (${file.location})`);
        
        // Delete the file
        await drive.files.delete({
          fileId: file.id,
          supportsAllDrives: true
        });
        console.log(`\n✓ Deleted: ${file.name} from ${file.location}`);
        deletedCount++;
        deletedSize += file.size;
      } catch (error) {
        console.log(`\n✗ Failed to delete ${file.name} from ${file.location}`);
        cannotDelete.push({
          name: file.name,
          owner: env.GOOGLE_CLIENT_EMAIL,
          id: file.id,
          size: file.size,
          location: file.location
        });
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Empty trash to ensure storage is freed
    console.log("\nEmptying trash to free up storage...");
    await drive.files.emptyTrash();
    console.log("Trash emptied successfully");

    console.log("\n\nOperation Summary:");
    console.log(`Total files processed: ${serviceAccountFiles.length}`);
    console.log(`Successfully deleted: ${deletedCount}`);
    console.log(`Failed to delete: ${cannotDelete.length}`);
    console.log(`Total storage freed: ${(deletedSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`Total size of failed files: ${(cannotDelete.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024 / 1024).toFixed(2)} GB`);
    
    console.log("\nFailed files by location:");
    const failedByLocation = cannotDelete.reduce((acc, file) => {
      acc[file.location] = (acc[file.location] || 0) + file.size;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(failedByLocation).forEach(([location, size]) => {
      console.log(`${location}: ${(size / 1024 / 1024 / 1024).toFixed(2)} GB`);
    });

    return { 
      success: true, 
      message: `Deleted ${deletedCount} service account files`,
      cannotDelete,
      serviceAccountFiles: {
        count: serviceAccountFiles.length,
        totalSize: `${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`,
        deletedSize: `${(deletedSize / 1024 / 1024 / 1024).toFixed(2)} GB`,
        files: serviceAccountFiles
      }
    };
  } catch (error) {
    console.error("\nFatal error in moveAllItems:", error);
    throw error;
  }
};

async function cleanup() {
  try {
    // Get all root folders
    const rootFolders = await prisma.folder.findMany({
      where: { isRoot: true },
      orderBy: { createdAt: 'asc' }
    });

    if (rootFolders.length <= 1) {
      console.log("No duplicate root folders found");
      return;
    }

    // Keep the oldest root folder and move all items from other root folders to it
    const mainRootFolder = rootFolders[0];
    if (!mainRootFolder) {
      throw new Error("No root folder found");
    }

    const duplicateRoots = rootFolders.slice(1);

    for (const duplicateRoot of duplicateRoots) {
      // Move all files from duplicate root to main root
      await prisma.file.updateMany({
        where: { folderId: duplicateRoot.id },
        data: { folderId: mainRootFolder.id }
      });

      // Move all subfolders from duplicate root to main root
      await prisma.folder.updateMany({
        where: { parentId: duplicateRoot.id },
        data: { parentId: mainRootFolder.id }
      });

      // Delete the duplicate root folder
      await prisma.folder.delete({
        where: { id: duplicateRoot.id }
      });
    }

    console.log(`Cleaned up ${duplicateRoots.length} duplicate root folders`);
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();