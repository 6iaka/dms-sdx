"use server";

import { revalidatePath } from "next/cache";
import tagService from "../services/tag_service";

export const upsertTag = async (name: string) => {
  try {
    const tag = await tagService.upsert({ name });
    revalidatePath("/");
    return tag;
  } catch (error) {
    console.error(error);
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
    const tag = await tagService.findByName(name);
    if (!tag) throw new Error("Tag not found");
    const deletedTag = await tagService.delete(tag.id);
    revalidatePath("/");
    return deletedTag;
  } catch (error) {
    console.error(error);
  }
};
