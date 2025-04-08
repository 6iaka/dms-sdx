"use server";

import { currentUser } from "@clerk/nextjs/server";
import Limit from "p-limit";
import { getCategoryFromMimeType } from "~/lib/utils";
import driveService from "../services/drive_service";
import fileService from "../services/file_service";
import folderService from "../services/folder_service";
import { revalidatePath } from "next/cache";
const limit = Limit(10);

export const syncDrive = async () => {
  const user = await currentUser();

  try {
    if (!user) throw new Error("Not authorized");
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

    // Sync all folders
    await Promise.allSettled(
      folderItems.map(item => syncFolder(item.id!))
    );

    // Then sync all files
    const fileItems = items.filter(
      (item) => item.mimeType !== "application/vnd.google-apps.folder"
    );

    await Promise.allSettled(
      fileItems.map((item) =>
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
              googleId: item.id!,
              title: item.name!,
            });
          } catch (error) {
            console.error("Error syncing file:", error);
          }
        }),
      ),
    );

    revalidatePath("/");
    revalidatePath("/folder/:id", "page");
  } catch (error) {
    console.error((error as Error).message);
  }
};
