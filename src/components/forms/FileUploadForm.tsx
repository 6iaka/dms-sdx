"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck, Loader2, Cloud, HardDrive, RefreshCw } from "lucide-react";
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
import { Progress } from "~/components/ui/progress";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  file: z.instanceof(File).nullable(),
  tagNames: z.array(z.string()).optional(),
  description: z.string().min(1).optional(),
});

type Props = { folderId?: number };

type UploadResponse = {
  success: boolean;
  error?: string;
  data?: {
    id: number;
    title: string;
    driveStatus: 'uploaded' | 'failed';
    localStatus: 'uploaded' | 'failed';
  };
  driveStatus?: 'uploaded' | 'failed';
  localStatus?: 'uploaded' | 'failed';
};

const FileUploadForm = ({ folderId }: Props) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [driveStatus, setDriveStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'failed'>('idle');
  const [localStatus, setLocalStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'failed'>('idle');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'failed'>('idle');
  const router = useRouter();

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => await getAllTags(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { file: null, tagNames: [] },
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
    } catch {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setUploadProgress(0);
      setDriveStatus('uploading');
      setLocalStatus('uploading');
      setSyncStatus('idle');

      const formData = new FormData();
      if (data.file) {
        formData.append("file", data.file);
      }
      if (folderId) {
        formData.append("folderId", folderId.toString());
      }
      if (data.tagNames) {
        formData.append("tagNames", JSON.stringify(data.tagNames));
      }
      if (data.description) {
        formData.append("description", data.description);
      }

      // Create a new XMLHttpRequest for better progress tracking
      const xhr = new XMLHttpRequest();
      
      // Set up progress tracking
      xhr.upload.addEventListener("progress", async (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          const roundedProgress = Math.round(percentComplete);
          setUploadProgress(roundedProgress);
          
          // When upload reaches 100%, update statuses
          if (roundedProgress === 100) {
            setDriveStatus('uploaded');
            setLocalStatus('uploaded');
          }
        }
      });

      // Create a promise to handle the upload
      const uploadPromise = new Promise<UploadResponse>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success) {
                setDriveStatus('uploaded');
                
                // Start sync only after upload is fully complete
                if (folderId) {
                  setSyncStatus('syncing');
                  console.log('Starting folder sync...');
                  
                  fetch(`/api/folder/${folderId}/sync`, {
                    method: "POST",
                  })
                    .then(async syncResponse => {
                      if (!syncResponse.ok) {
                        throw new Error("Failed to sync");
                      }
                      const syncResult = await syncResponse.json();
                      console.log('Sync completed:', syncResult);
                      setSyncStatus('synced');
                      toast({
                        title: "Success",
                        description: "File uploaded and synced",
                      });
                      form.reset();
                      setSelectedTags([]);
                      setUploadProgress(0);
                      setIsLoading(false);
                      setIsOpen(false);
                      router.refresh();
                    })
                    .catch(error => {
                      console.error('Sync error:', error);
                      setSyncStatus('failed');
                      toast({
                        title: "Error",
                        description: "Uploaded but sync failed",
                        variant: "destructive",
                      });
                      setIsLoading(false);
                    });
                } else {
                  toast({
                    title: "Success",
                    description: "File uploaded",
                  });
                  form.reset();
                  setSelectedTags([]);
                  setUploadProgress(0);
                  setIsLoading(false);
                  setIsOpen(false);
                  router.refresh();
                }
              } else {
                setDriveStatus('failed');
                setSyncStatus('failed');
                toast({
                  title: "Error",
                  description: "Upload failed",
                  variant: "destructive",
                });
                setIsLoading(false);
              }
              resolve(response);
            } catch (error) {
              reject(new Error("Invalid response"));
            }
          } else {
            reject(new Error("Upload failed"));
          }
        };

        xhr.onerror = () => {
          setDriveStatus('failed');
          setSyncStatus('failed');
          reject(new Error("Upload failed"));
        };
      });

      // Start the upload
      xhr.open("POST", "/api/upload");
      xhr.send(formData);

      // Wait for the upload to complete
      await uploadPromise;
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Upload failed",
        variant: "destructive",
      });
      setIsLoading(false);
      setUploadProgress(0);
      setDriveStatus('failed');
      setSyncStatus('failed');
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
                          if (file) {
                            onChange(file);
                            form.setValue("file", file);
                          }
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
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="size-8 animate-spin text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Uploading file...</p>
                          <Progress value={uploadProgress} className="w-full" />
                          <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
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

            {isLoading && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Cloud className="size-4" />
                  <span>Uploading to Drive</span>
                  <span className="ml-auto">
                    {driveStatus === 'uploading' && <Loader2 className="size-4 animate-spin" />}
                    {driveStatus === 'uploaded' && <FileCheck className="size-4 text-green-500" />}
                    {driveStatus === 'failed' && <span className="text-red-500">Failed</span>}
                  </span>
                </div>
                {folderId && (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="size-4" />
                    <span>Syncing</span>
                    <span className="ml-auto">
                      {syncStatus === 'syncing' && <Loader2 className="size-4 animate-spin" />}
                      {syncStatus === 'synced' && <FileCheck className="size-4 text-green-500" />}
                      {syncStatus === 'failed' && <span className="text-red-500">Failed</span>}
                    </span>
                  </div>
                )}
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-xs text-muted-foreground text-center">{uploadProgress}%</p>
              </div>
            )}

            <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>
              {form.formState.isSubmitting || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : "Uploading..."}
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadForm;
