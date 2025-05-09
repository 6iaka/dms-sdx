"server only";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";

export class FolderService {
  /**
   * Get all folders from the database
   * @returns Array of folders
   */
  findMany = async (filter?: Prisma.FolderWhereInput) => {
    try {
      const folders = await prisma.folder.findMany({
        where: filter,
        orderBy: { createdAt: "desc" },
        include: {
          files: true,
          children: true,
        },
      });
      return folders;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Get a folder by ID
   * @param id ID of the folder to get
   * @returns Folder details
   */
  findById = async (id: number) => {
    try {
      const folder = await prisma.folder.findUnique({
        where: { id },
        include: {
          files: {
            include: {
              tags: true,
            },
          },
          children: true,
        },
      });
      return folder;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Get a folder by Google ID
   * @param googleId Google ID of the folder to get
   * @returns Folder details
   */
  findByGoogleId = async (googleId: string) => {
    try {
      const folder = await prisma.folder.findUnique({
        where: { googleId },
        include: {
          files: true,
          children: true,
        },
      });
      return folder;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Get folders by parent ID
   * @param parentId ID of the parent folder
   * @returns Array of child folders
   */
  findByParentId = async (parentId: number) => {
    try {
      const folders = await prisma.folder.findMany({
        where: { parentId },
        include: {
          files: true,
          children: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return folders;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Create a new folder
   * @param data Folder data to create
   * @returns Created folder
   */
  create = async (data: Prisma.FolderCreateInput) => {
    try {
      const folder = await prisma.folder.create({
        data,
        include: {
          files: true,
          children: true,
        },
      });
      return folder;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Update a folder
   * @param id ID of the folder to update
   * @param data Data to update the folder with
   * @returns Updated folder
   */
  update = async (id: number, data: Prisma.FolderUpdateInput) => {
    try {
      const updated = await prisma.folder.update({
        where: { id },
        data,
        include: {
          files: true,
          children: true,
        },
      });
      return updated;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Delete a folder
   * @param id ID of the folder to delete
   * @returns Deleted folder
   */
  delete = async (id: number) => {
    try {
      const deleted = await prisma.folder.delete({
        where: { id },
      });
      return deleted;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Upsert a folder
   * @param data Data to create or update the folder with
   * @returns Upserted folder
   */
  upsert = async (data: Prisma.FolderCreateInput) => {
    try {
      const folder = await prisma.folder.upsert({
        where: { googleId: data.googleId },
        create: data,
        update: data,
        include: {
          files: true,
          children: true,
        },
      });
      return folder;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Move a folder to a different parent
   * @param folderId ID of the folder to move
   * @param targetParentId ID of the target parent folder
   * @returns Updated folder
   */
  move = async (folderId: number, targetParentId: number | null) => {
    try {
      const updated = await prisma.folder.update({
        where: { id: folderId },
        data: { parentId: targetParentId },
        include: {
          files: true,
          children: true,
        },
      });
      return updated;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Search folders by title
   * @param query Search query
   * @returns Array of matching folders
   */
  search = async (query: string) => {
    try {
      const folders = await prisma.folder.findMany({
        where: {
          title: {
            contains: query,
            mode: "insensitive",
          },
        },
        include: {
          files: {
            include: {
              tags: true,
            },
          },
          children: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return folders;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  toggleFavorite = async (id: number) => {
    try {
      const folder = await prisma.folder.findUnique({
        where: { id },
      });
      if (!folder) throw new Error("Folder not found");

      const updated = await prisma.folder.update({
        where: { id },
        data: { isFavorite: !folder.isFavorite },
        include: {
          files: true,
          children: true,
        },
      });
      return updated;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  async findRoot() {
    return await prisma.folder.findFirst({
      where: {
        isRoot: true
      }
    });
  }

  cleanupDuplicateRoots = async () => {
    try {
      // Get all root folders
      const rootFolders = await prisma.folder.findMany({
        where: { isRoot: true },
        orderBy: { createdAt: 'asc' }
      });

      if (rootFolders.length <= 1) {
        return; // No duplicates to clean up
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
      console.error("Error cleaning up duplicate root folders:", error);
      throw error;
    }
  };
}

const folderService = new FolderService();
export default folderService;
