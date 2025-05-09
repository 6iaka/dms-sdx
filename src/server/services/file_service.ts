"server only";

import type { Category, Prisma } from "@prisma/client";
import { prisma } from "../db";

export class FileService {
  /**
   * Get all files from the database
   * @returns Array of files
   */
  findMany = async () => {
    try {
      const files = await prisma.file.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          tags: true,
          folder: true,
        },
      });
      return files;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Get a file by ID
   * @param id ID of the file to get
   * @returns File details
   */
  findById = async (id: number) => {
    try {
      const file = await prisma.file.findUnique({
        where: { id },
        include: {
          tags: true,
          folder: true,
        },
      });
      return file;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Get a file by Google ID
   * @param googleId Google ID of the file to get
   * @returns File details
   */
  findByGoogleId = async (googleId: string) => {
    try {
      const file = await prisma.file.findUnique({
        where: { googleId },
        include: {
          tags: true,
          folder: true,
        },
      });
      return file;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Get files by folder ID
   * @param folderId ID of the folder to get files from
   * @returns Array of files in the specified folder
   */
  findByFolderId = async (folderId: number) => {
    try {
      const files = await prisma.file.findMany({
        where: {
          folder: {
            id: folderId,
          },
        },
        include: {
          tags: true,
          folder: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return files;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Get files by tag name
   * @param tagName Name of the tag to filter by
   * @returns Array of files with the specified tag
   */
  findByTag = async (tagName: string) => {
    try {
      const files = await prisma.file.findMany({
        where: {
          tags: {
            some: {
              name: tagName,
            },
          },
        },
        include: {
          tags: true,
          folder: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return files;
    } catch (error) {
      console.error("Error in findByTag:", error);
      throw new Error((error as Error).message);
    }
  };

  /**
   * Delete a file from the database
   * @param id ID of the file to be deleted
   * @returns Metadata of the deleted file
   */
  delete = async (id: number) => {
    try {
      const deleted = await prisma.file.delete({ where: { id } });
      return deleted;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Search files in the database based on various criteria
   * @param query Search parameters including text, type, name, and tag
   * @returns Array of results based on the query
   */
  search = async ({
    query,
    category,
    tags,
  }: {
    query: string;
    category?: Category;
    tags?: string[];
  }) => {
    try {
      const files = await prisma.file.findMany({
        where: {
          AND: [
            // Only apply text search if query is not empty
            query ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { originalFilename: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            } : {},
            category ? { categeory: category } : {},
            tags && tags.length > 0
              ? {
                  tags: {
                    some: {
                      name: { in: tags },
                    },
                  },
                }
              : {},
          ],
        },
        orderBy: { updatedAt: "desc" },
        include: { tags: true },
      });
      return files;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Update a file's metadata
   * @param id ID of the file to update
   * @param data Data to update the file with
   * @returns Updated file details
   */
  update = async (id: number, data: Prisma.FileUpdateInput) => {
    try {
      const updated = await prisma.file.update({
        where: { id },
        data,
        include: {
          tags: true,
          folder: true,
        },
      });
      return updated;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Upsert a file
   * @param data Data to create or update the file with
   * @returns Upserted file details
   */
  upsert = async (data: Prisma.FileCreateInput) => {
    try {
      console.log("Attempting to upsert file with data:", {
        googleId: data.googleId,
        title: data.title,
        userClerkId: data.userClerkId
      });

      const file = await prisma.file.upsert({
        where: { googleId: data.googleId },
        create: data,
        update: data,
      });

      console.log("File upsert successful:", {
        id: file.id,
        googleId: file.googleId,
        title: file.title
      });

      return file;
    } catch (error) {
      console.error("Error in file upsert:", error);
      throw new Error((error as Error).message);
    }
  };

  /**
   * Update multiple files
   * @param ids Array of file IDs to update
   * @param data Data to update
   * @returns Updated files
   */
  updateMany = async (ids: number[], data: Prisma.FileUpdateInput) => {
    try {
      const files = await prisma.file.updateMany({
        where: { id: { in: ids } },
        data,
      });
      return files;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Move files to a different folder
   * @param fileIds Array of file IDs to move
   * @param targetFolderId ID of the target folder
   * @returns Updated files
   */
  move = async (fileIds: number[], targetFolderId: number) => {
    try {
      const updated = await prisma.file.updateMany({
        where: { id: { in: fileIds } },
        data: { folderId: targetFolderId },
      });
      return updated;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Find files by their IDs
   * @param ids Array of file IDs to find
   * @returns Array of files
   */
  findByIds = async (ids: number[]) => {
    try {
      const files = await prisma.file.findMany({
        where: { id: { in: ids } },
      });
      return files;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Delete multiple files from the database
   * @param ids Array of file IDs to delete
   * @returns Count of deleted files
   */
  deleteMany = async (ids: number[]) => {
    try {
      const deleted = await prisma.file.deleteMany({
        where: { id: { in: ids } },
      });
      return deleted;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };
}

const fileService = new FileService();
export default fileService;
