"use client";
import { ChevronLeft, Trash, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { File, Folder, Tag } from "@prisma/client";
import DropzoneProvider from "~/components/DropzoneProvider";
import FileCard from "~/components/FileCard";
import FolderCard from "~/components/FolderCard";
import SelectionMode from "~/components/SelectionMode";
import CreateFolderForm from "~/components/forms/CreateFolderForm";
import FileUploadForm from "~/components/forms/FileUploadForm";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useToast } from "~/hooks/use-toast";
import { deleteFile, assignTagToFiles, moveFiles, getFiles } from "~/server/actions/file_action";
import { deleteFolder, moveFolder, createRootFolder, findFolderById } from "~/server/actions/folder_action";
import { getAllTags } from "~/server/actions/tag_action";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "~/components/ui/badge";
import { usePermissions } from "~/hooks/usePermissions";
import { getFolderById } from "~/server/actions/folder_action";
import { getFilesByFolderId } from "~/server/actions/file_action";
import type { FolderWithChildren } from "~/types";

type Props = { folderId: number };

const FolderPageClient = ({ folderId }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canSelect, canUpload, canCreateFolders, isViewer, canEdit, canDelete } = usePermissions();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<number | null>(null);
  const [rootFolder, setRootFolder] = useState<Folder | null>(null);
  const [folder, setFolder] = useState<FolderWithChildren | null>(null);
  const [files, setFiles] = useState<(File & { tags: Tag[] })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: folderData } = useQuery({
    queryKey: ["folder", folderId],
    queryFn: async () => await getFolderById(folderId),
  });

  const { data: filesData } = useQuery({
    queryKey: ["files", folderId],
    queryFn: async () => await getFilesByFolderId(folderId),
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => await getAllTags(),
  });

  // Fetch root folder
  useEffect(() => {
    const fetchRootFolder = async () => {
      try {
        const root = await createRootFolder();
        if (root) setRootFolder(root);
      } catch (error) {
        console.error("Failed to fetch root folder:", error);
      }
    };
    void fetchRootFolder();
  }, []);

  useEffect(() => {
    const loadDataAsync = async () => {
      try {
        const [folderData, tagsData] = await Promise.all([
          findFolderById(folderId),
          getAllTags(),
        ]);
        if (folderData) {
          setFolder(folderData);
          setFiles(folderData.files);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    void loadDataAsync();
  }, [folderId]);

  const handleSelectAll = () => {
    const hasSelectedItems = selectedFiles.length > 0;
    if (!hasSelectedItems) {
      const allFileIds = files.map(file => file.id);
      const allFolderIds = folder?.children.map(child => child.id) || [];
      setSelectedFiles([...allFileIds, ...allFolderIds]);
    } else {
      setSelectedFiles([]);
    }
  };

  const handleFileSelect = (fileId: number, selected: boolean) => {
    if (selected) {
      setSelectedFiles([...selectedFiles, fileId]);
    } else {
      setSelectedFiles(selectedFiles.filter((id) => id !== fileId));
    }
  };

  const handleDeleteSelected = async () => {
    if (!canDelete) return;
    try {
      setIsLoading(true);
      await deleteFiles(selectedFiles);
      setSelectedFiles([]);
      setIsSelecting(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to delete files");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignTag = async () => {
    if (selectedTags.length === 0) return;
    
    try {
      await assignTagToFiles({
        fileIds: selectedFiles,
        tagNames: selectedTags,
      });
      toast({
        title: "Success",
        description: "Tags assigned successfully",
      });
      setShowTagDialog(false);
      setSelectedTags([]);
      setSelectedFiles([]);
      setIsSelecting(false);
      await queryClient.invalidateQueries({ queryKey: ["files"] });
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
    } catch (error) {
      console.error("Error assigning tags:", error);
      toast({
        title: "Error",
        description: "Failed to assign tags",
        variant: "destructive",
      });
    }
  };

  const handleMove = async () => {
    if (!targetFolderId) return;
    
    try {
      // Move selected files
      if (selectedFiles.length > 0) {
        await moveFiles({
          fileIds: selectedFiles,
          targetFolderId,
        });
      }
      // Move selected folders
      if (selectedFiles.length > 0 && selectedFiles.every(id => typeof id === 'number')) {
        for (const folderId of selectedFiles.filter(id => typeof id === 'number')) {
          await moveFolder(folderId, targetFolderId);
        }
      }
      toast({
        title: "Success",
        description: "Items moved successfully",
      });
      setShowMoveDialog(false);
      setTargetFolderId(null);
      setSelectedFiles([]);
      setIsSelecting(false);
      await queryClient.invalidateQueries({ queryKey: ["files"] });
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
    } catch {
      toast({
        title: "Error",
        description: "Failed to move items",
        variant: "destructive",
      });
    }
  };

  // Update existing tags when files are selected
  useEffect(() => {
    if (selectedFiles.length > 0) {
      const tags = new Set<string>();
      files
        .filter(file => selectedFiles.includes(file.id))
        .forEach(file => {
          if (file.tags) {
            file.tags.forEach(tag => tags.add(tag.name));
          }
        });
      setSelectedTags(Array.from(tags));
    } else {
      setSelectedTags([]);
    }
  }, [selectedFiles, files]);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{folder?.title || "Loading..."}</h1>
        {!isViewer && (
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setIsSelecting(!isSelecting)}
            >
              {isSelecting ? "Cancel" : "Select Files"}
            </Button>
            {isSelecting && selectedFiles.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleDeleteSelected}
                disabled={isLoading}
              >
                Delete Selected
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <DropzoneProvider
        folderId={folderId}
        className="flex h-full flex-1 flex-col gap-4 overflow-y-auto p-4"
      >
        <section className="flex flex-col gap-2 rounded-lg">
          <h3 className="text-balance font-medium">Folders</h3>
          <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2">
            {folder?.children.length > 0 ? (
              folder.children.map((item) => (
                <FolderCard 
                  key={item.id}
                  data={{ ...item, files: [] }}
                  isSelecting={isSelecting}
                  isSelected={selectedFiles.includes(item.id)}
                  onSelect={(id, selected) => handleFileSelect(id, selected)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No Folders Here</p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-lg">
          <h3 className="text-balance font-medium">Files</h3>
          <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
            {files.length > 0 ? (
              files.map((item) => (
                <FileCard 
                  key={item.id}
                  data={item}
                  isSelecting={isSelecting}
                  isSelected={selectedFiles.includes(item.id)}
                  onSelect={(selected: boolean) => handleFileSelect(item.id, selected)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No Files Here</p>
            )}
          </div>
        </section>
      </DropzoneProvider>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Items</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedFiles.length} item{selectedFiles.length !== 1 ? "s" : ""}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelected}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Tags</DialogTitle>
            <DialogDescription>
              Select tags to assign to {selectedFiles.length} item{selectedFiles.length !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Select
              value=""
              onValueChange={(value) => {
                if (value && value.trim() !== "" && !selectedTags.includes(value)) {
                  setSelectedTags([...selectedTags, value]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add a tag" />
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
                      onClick={() => setSelectedTags(selectedTags.filter(t => t !== tagName))}
                    >
                      <X className="size-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignTag} disabled={selectedTags.length === 0}>
              Assign Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Items</DialogTitle>
            <DialogDescription>
              Select a folder to move {selectedFiles.length} item{selectedFiles.length !== 1 ? "s" : ""} to.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Destination Folder</label>
              <Select
                value={targetFolderId?.toString()}
                onValueChange={(value) => setTargetFolderId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a folder" />
                </SelectTrigger>
                <SelectContent>
                  {rootFolder && (
                    <SelectItem value={rootFolder.id.toString()}>
                      {rootFolder.title}
                    </SelectItem>
                  )}
                  {folder?.children.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id.toString()}>
                      {folder.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMove}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FolderPageClient; 