"server only";

import type { Prisma } from "@prisma/client";
import { prisma } from "../db";

class TagService {
  /**
   * Get all tags from the database with file counts
   * @returns Array of tags with file counts
   */
  findMany = async () => {
    try {
      const tags = await prisma.tag.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              files: true,
            },
          },
        },
      });
      return tags;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Get a tag by ID with file count
   * @param id ID of the tag to get
   * @returns Tag details with file count
   */
  findById = async (id: number) => {
    try {
      const tag = await prisma.tag.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              files: true,
            },
          },
        },
      });
      return tag;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Get a tag by name with file count
   * @param name Name of the tag to get
   * @returns Tag details with file count
   */
  findByName = async (name: string) => {
    try {
      const tag = await prisma.tag.findUnique({
        where: { name },
        include: {
          _count: {
            select: {
              files: true,
            },
          },
        },
      });
      return tag;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Create a new tag
   * @param data Tag data to create
   * @returns Created tag with file count
   */
  create = async (data: Prisma.TagCreateInput) => {
    try {
      const tag = await prisma.tag.create({
        data,
        include: {
          _count: {
            select: {
              files: true,
            },
          },
        },
      });
      return tag;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Update a tag
   * @param id ID of the tag to update
   * @param data Data to update the tag with
   * @returns Updated tag with file count
   */
  update = async (id: number, data: Prisma.TagUpdateInput) => {
    try {
      const updated = await prisma.tag.update({
        where: { id },
        data,
        include: {
          _count: {
            select: {
              files: true,
            },
          },
        },
      });
      return updated;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Delete a tag
   * @param id ID of the tag to delete
   * @returns Deleted tag with file count
   */
  delete = async (id: number) => {
    try {
      const deleted = await prisma.tag.delete({
        where: { id },
        include: {
          _count: {
            select: {
              files: true,
            },
          },
        },
      });
      return deleted;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   * Upsert a tag
   * @param data Data to create or update the tag with
   * @returns Upserted tag with file count
   */
  upsert = async (data: Prisma.TagCreateInput) => {
    try {
      const tag = await prisma.tag.upsert({
        where: { name: data.name },
        create: data,
        update: data,
        include: {
          _count: {
            select: {
              files: true,
            },
          },
        },
      });
      return tag;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };
}

const tagService = new TagService();
export default tagService;
