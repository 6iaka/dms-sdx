"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import Dropzone from "shadcn-dropzone";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useToast } from "~/hooks/use-toast";
import { uploadFile } from "~/server/actions/file_action";
import { getAllTags } from "~/server/actions/tag_action";

const formSchema = z.object({
  file: z.instanceof(File),
  tagNames: z.array(z.string()).optional(),
  description: z.string().min(1).optional(),
});

type Props = { folderId?: number };

const FileUploadForm = ({ folderId }: Props) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => await getAllTags(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { tagNames: [] },
  });

  const handleExternalDrop = async (url: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(url);
      const blob = await response.blob();
      const fileName = url.split('/').pop() || 'downloaded-file';
      const file = new File([blob], fileName, { type: blob.type });
      form.setValue("file", file);
      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const response = await uploadFile({
      description: values.description,
      tagNames: selectedTags,
      file: values.file,
      folderId,
    });

    if (!response) {
      toast({
        title: "Error",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success" });
      form.reset();
      setSelectedTags([]);
      setIsOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["files"] });
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
    }
  };

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen} defaultOpen={isOpen}>
      <DialogTrigger asChild>
        <Button size={"sm"} className="rounded-full" variant={"secondary"}>
          Upload File
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a new file</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              name="file"
              control={form.control}
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>File</FormLabel>
                  <FormControl>
                    <div
                      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Handle file drops
                        if (e.dataTransfer.files.length > 0) {
                          const file = e.dataTransfer.files[0];
                          onChange(file);
                          form.setValue("file", file);
                          return;
                        }

                        // Handle URL drops
                        const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
                        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                          await handleExternalDrop(url);
                        }
                      }}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="size-8 animate-spin text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Downloading file...</p>
                        </div>
                      ) : (
                        <>
                          <FileCheck className="size-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {value?.name || "Drop a file or URL here"}
                          </p>
                        </>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="tagNames"
              control={form.control}
              render={() => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Select
                      value={selectedTags[selectedTags.length - 1]}
                      onValueChange={(value) => {
                        if (!selectedTags.includes(value)) {
                          setSelectedTags([...selectedTags, value]);
                          form.setValue("tagNames", [...selectedTags, value]);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tags" />
                      </SelectTrigger>
                      <SelectContent>
                        {tags?.map((tag) => (
                          <SelectItem key={tag.id} value={tag.name}>
                            {tag.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    {selectedTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedTags.map((tag) => (
                          <span
                            key={tag}
                            className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => {
                                const newTags = selectedTags.filter((t) => t !== tag);
                                setSelectedTags(newTags);
                                form.setValue("tagNames", newTags);
                              }}
                              className="ml-1 text-primary hover:text-primary/80"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="description"
              control={form.control}
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Description" {...field}></Textarea>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="animate-spin" />
              )}
              Upload
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadForm;
