"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Pencil } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useToast } from "~/hooks/use-toast";
import { updateFile } from "~/server/actions/file_action";
import { getAllTags } from "~/server/actions/tag_action";
import type { File as FileData, Tag } from "@prisma/client";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";

type Props = { 
  data: FileData & {
    tags: Tag[];
  };
};

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  tagNames: z.array(z.string()).optional(),
  description: z.string().optional(),
});

const EditFileForm = ({ data }: Props) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<string[]>(data.tags ? data.tags.map(tag => tag.name) : []);

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const allTags = await getAllTags();
      // Filter out any tags with empty names
      return allTags.filter(tag => tag.name && tag.name.trim() !== "");
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: data.title,
      tagNames: data.tags ? data.tags.map(tag => tag.name) : [],
      description: data.description || "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const result = await updateFile(data.id, {
        title: values.title,
        tagNames: selectedTags,
        description: values.description,
      });

      if (result) {
        toast({ 
          title: "Success",
          description: "File updated successfully"
        });
        setIsOpen(false);
        await queryClient.invalidateQueries({ queryKey: ["files"] });
        await queryClient.invalidateQueries({ queryKey: ["tags"] });
      } else {
        throw new Error("Failed to update file");
      }
    } catch (error) {
      console.error("Error updating file:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update file",
        variant: "destructive",
      });
    }
  };

  const handleAddTag = (tagName: string) => {
    const trimmedTagName = tagName.trim();
    if (trimmedTagName && !selectedTags.includes(trimmedTagName)) {
      const newTags = [...selectedTags, trimmedTagName];
      setSelectedTags(newTags);
      form.setValue("tagNames", newTags);
    }
  };

  const handleRemoveTag = (tagName: string) => {
    const newTags = selectedTags.filter(t => t !== tagName);
    setSelectedTags(newTags);
    form.setValue("tagNames", newTags);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <Pencil className="h-4 w-4" />
          <span>Edit</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit File</DialogTitle>
          <DialogDescription>
            Make changes to your file here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              name="title"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="File title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="tagNames"
              control={form.control}
              render={() => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <div className="flex flex-col gap-2">
                    <Select onValueChange={handleAddTag}>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedTags.length > 0 ? "Add another tag" : "Add a tag"} />
                      </SelectTrigger>
                      <SelectContent>
                        {tags?.map((tag) => {
                          const tagName = tag.name.trim();
                          if (!tagName) return null;
                          return (
                            <SelectItem 
                              key={tag.id} 
                              value={tagName}
                              disabled={selectedTags.includes(tagName)}
                            >
                              {tagName} {selectedTags.includes(tagName) && '(already added)'}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    
                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map((tagName) => (
                          <Badge 
                            key={tagName} 
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {tagName}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-4 rounded-full p-0 hover:bg-destructive/20"
                              onClick={() => handleRemoveTag(tagName)}
                            >
                              <X className="size-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="description"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="File description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit">Save changes</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditFileForm; 