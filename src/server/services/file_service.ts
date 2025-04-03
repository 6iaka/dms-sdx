"server only";

import type { File as FileData, Prisma } from "@prisma/client";
import { db } from "../db";

export class FileService {
  /**
   * Get all files from the database
   * @returns Array of files
   */
  findMany = async () => {
    try {
      const files = await db.file.findMany({
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
      const file = await db.file.findUnique({
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
   * Get files by folder ID
   * @param folderId ID of the folder to get files from
   * @returns Array of files in the specified folder
   */
  findByFolderId = async (folderId: number) => {
    try {
      const files = await db.file.findMany({
        where: {
          folder: {
            id: folderId
          }
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
      const files = await db.file.findMany({
        where: {
          tags: {
            some: {
              name: tagName
            }
          }
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
      const deleted = await db.file.delete({ where: { id } });
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
  search = async (query: {
    text: string;
    type: string;
    name: string;
    tag: string;
  }) => {
    try {
      const whereClause: Prisma.FileWhereInput = {};

      // Text search across title, filename, and description
      if (query.text) {
        whereClause.OR = [
          { title: { contains: query.text, mode: "insensitive" } },
          { originalFilename: { contains: query.text, mode: "insensitive" } },
          { description: { contains: query.text, mode: "insensitive" } },
        ];
      }

      // File type filter
      if (query.type) {
        whereClause.mimeType = { contains: query.type, mode: "insensitive" };
      }

      // Name filter
      if (query.name) {
        whereClause.OR = [
          ...(whereClause.OR || []),
          { title: { contains: query.name, mode: "insensitive" } },
          { originalFilename: { contains: query.name, mode: "insensitive" } },
        ];
      }

      // Tag filter
      if (query.tag) {
        whereClause.tags = {
          some: {
            name: query.tag
          }
        };
      }

      const results = await db.file.findMany({
        where: whereClause,
        include: {
          tags: true,
          folder: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return results;
    } catch (error) {
      console.error("Error in search:", error);
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
      const updated = await db.file.update({
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
      const file = await db.file.upsert({
        where: { googleId: data.googleId },
        create: data,
        update: data,
      });
      return file;
    } catch (error) {
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
      const files = await db.file.updateMany({
        where: { id: { in: ids } },
        data,
      });
      return files;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };
}

const fileService = new FileService();
export default fileService;
