"use server";

import { revalidatePath } from "next/cache";
import tagService from "../services/tag_service";

export const upsertTag = async (name: string) => {
  try {
    // Validate tag name
    const trimmedName = name?.trim() || "";
    if (trimmedName.length === 0) {
      throw new Error("Tag name cannot be empty");
    }

    const tag = await tagService.upsert({ name: trimmedName });
    revalidatePath("/");
    return tag;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getAllTags = async () => {
  try {
    const tags = await tagService.findMany();
    return tags;
  } catch (error) {
    console.error("Error getting tags:", error);
    return [];
  }
};

export const deleteTag = async (name: string) => {
  try {
    // First try to find the tag by name
    let tag = await tagService.findByName(name);
    
    // If not found by name, try to find it by ID (for empty tags)
    if (!tag) {
      const allTags = await tagService.findMany();
      const foundTag = allTags.find(t => t.name === name);
      if (foundTag) tag = foundTag;
    }
    
    if (!tag) throw new Error("Tag not found");
    const deletedTag = await tagService.delete(tag.id);
    revalidatePath("/");
    return deletedTag;
  } catch (error) {
    console.error(error);
  }
};
