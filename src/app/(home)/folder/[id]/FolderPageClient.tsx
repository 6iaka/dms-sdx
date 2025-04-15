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
import { deleteFile, assignTagToFiles, moveFiles } from "~/server/actions/file_action";
import { deleteFolder, moveFolder, createRootFolder } from "~/server/actions/folder_action";
import { getAllTags } from "~/server/actions/tag_action";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "~/components/ui/badge";

type FolderWithChildren = Folder & {
  children: Folder[];
  files: (File & {
    tags: Tag[];
  })[];
};

const FolderPageClient = ({ data }: { data: FolderWithChildren }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<number | null>(null);
  const [rootFolder, setRootFolder] = useState<Folder | null>(null);

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
    fetchRootFolder();
  }, []);

  const handleSelect = (id: number, selected: boolean, isFolder: boolean) => {
    if (isFolder) {
      setSelectedFolders(prev => {
        const next = new Set(prev);
        if (selected) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
    } else {
      setSelectedFiles(prev => {
        const next = new Set(prev);
        if (selected) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
    }
  };

  const handleSelectAll = () => {
    const allFileIds = new Set(data.files.map(file => file.id));
    const allFolderIds = new Set(data.children.map(folder => folder.id));
    setSelectedFiles(allFileIds);
    setSelectedFolders(allFolderIds);
  };

  const handleDelete = async () => {
    try {
      // Delete selected files
      for (const fileId of selectedFiles) {
        await deleteFile(fileId);
      }
      // Delete selected folders
      for (const folderId of selectedFolders) {
        await deleteFolder(folderId);
      }
      toast({
        title: "Success",
        description: "Items deleted successfully",
      });
      setShowDeleteDialog(false);
      setSelectedFiles(new Set());
      setSelectedFolders(new Set());
      setIsSelecting(false);
      // Invalidate queries to refresh the data
      await queryClient.invalidateQueries({ queryKey: ["files"] });
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
    } catch (error) {
      console.error("Failed to delete items:", error);
      toast({
        title: "Error",
        description: "Failed to delete items",
        variant: "destructive",
      });
    }
  };

  const handleAssignTag = async () => {
    if (selectedTags.length === 0) return;
    
    try {
      await assignTagToFiles({
        fileIds: Array.from(selectedFiles),
        tagNames: selectedTags,
      });
      toast({
        title: "Success",
        description: "Tags assigned successfully",
      });
      setShowTagDialog(false);
      setSelectedTags([]);
      setExistingTags([]);
      setSelectedFiles(new Set());
      setIsSelecting(false);
      await queryClient.invalidateQueries({ queryKey: ["files"] });
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
    } catch {
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
      if (selectedFiles.size > 0) {
        await moveFiles({
          fileIds: Array.from(selectedFiles),
          targetFolderId,
        });
      }
      // Move selected folders
      if (selectedFolders.size > 0) {
        for (const folderId of selectedFolders) {
          await moveFolder(folderId, targetFolderId);
        }
      }
      toast({
        title: "Success",
        description: "Items moved successfully",
      });
      setShowMoveDialog(false);
      setTargetFolderId(null);
      setSelectedFiles(new Set());
      setSelectedFolders(new Set());
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
    if (selectedFiles.size > 0) {
      const tags = new Set<string>();
      data.files
        .filter(file => selectedFiles.has(file.id))
        .forEach(file => {
          if (file.tags) {
            file.tags.forEach(tag => tags.add(tag.name));
          }
        });
      setExistingTags(Array.from(tags));
    } else {
      setExistingTags([]);
    }
  }, [selectedFiles, data.files]);

  return (
    <>
      <header className="flex flex-col gap-2 p-4 pb-0">
        <div className="flex flex-1 items-start justify-between gap-2">
          {data.parentId ? (
            <Button variant={"secondary"} className="rounded-full" asChild>
              <Link href={`/folder/${data.parentId}`}>
                <ChevronLeft />
                Back
              </Link>
            </Button>
          ) : (
            <Button variant={"secondary"} className="rounded-full" asChild>
              <Link href={"/"}>
                <ChevronLeft />
                Dashboard
              </Link>
            </Button>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {isSelecting && (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowTagDialog(true)}
                >
                  Assign Tag
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowMoveDialog(true)}
                >
                  Move
                </Button>
              </>
            )}
            <SelectionMode 
              onSelect={setIsSelecting} 
              onSelectAll={handleSelectAll}
            />
            {!isSelecting && (
              <>
                <FileUploadForm folderId={data.id} />
                <CreateFolderForm parentId={data.id} />
              </>
            )}
          </div>
        </div>
        <h2 className="text-xl font-bold capitalize">{data.title}</h2>
      </header>

      <DropzoneProvider
        folderId={data.id}
        className="flex h-full flex-1 flex-col gap-4 overflow-y-auto p-4"
      >
        <section className="flex flex-col gap-2 rounded-lg">
          <h3 className="text-balance font-medium">Folders</h3>
          <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2">
            {data.children.length > 0 ? (
              data.children.map((item) => (
                <FolderCard 
                  data={item} 
                  key={item.id}
                  isSelecting={isSelecting}
                  isSelected={selectedFolders.has(item.id)}
                  onSelect={(selected) => handleSelect(item.id, selected, true)}
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
            {data.files.length > 0 ? (
              data.files.map((item) => (
                <FileCard 
                  data={item} 
                  key={item.id}
                  isSelecting={isSelecting}
                  isSelected={selectedFiles.has(item.id)}
                  onSelect={(selected) => handleSelect(item.id, selected, false)}
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
              Are you sure you want to delete {selectedFiles.size} file{selectedFiles.size !== 1 ? "s" : ""} and {selectedFolders.size} folder{selectedFolders.size !== 1 ? "s" : ""}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
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
              Select tags to assign to {selectedFiles.size} file{selectedFiles.size !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Select
              value={selectedTags[selectedTags.length - 1]}
              onValueChange={(value) => {
                if (!selectedTags.includes(value)) {
                  setSelectedTags([...selectedTags, value]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedTags.length > 0 ? "Add another tag" : "Add a tag"} />
              </SelectTrigger>
              <SelectContent>
                {tags?.map((tag) => (
                  <SelectItem 
                    key={tag.id} 
                    value={tag.name}
                  >
                    {tag.name}
                  </SelectItem>
                ))}
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
              Select a folder to move {selectedFiles.size} file{selectedFiles.size !== 1 ? "s" : ""} and {selectedFolders.size} folder{selectedFolders.size !== 1 ? "s" : ""} to.
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
                  {data.children.map((folder) => (
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
    </>
  );
};

export default FolderPageClient; 