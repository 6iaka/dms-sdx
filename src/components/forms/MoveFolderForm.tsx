"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { moveFolder, getFolders } from "~/server/actions/folder_action";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useToast } from "~/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "~/hooks/usePermissions";
import { Folder } from "@prisma/client";
import { Move } from "lucide-react";

type Props = {
  id: number;
};

export default function MoveFolderForm({ id }: Props) {
  const [open, setOpen] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canEdit } = usePermissions();

  const { data: folders, isLoading, error } = useQuery({
    queryKey: ["folders"],
    queryFn: async () => {
      return await getFolders();
    },
  });

  const handleMove = async () => {
    if (!targetFolderId) return;

    try {
      await moveFolder(id, parseInt(targetFolderId));
      toast({
        title: "Success",
        description: "Folder moved successfully",
      });
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
      setOpen(false);
    } catch (error) {
      console.error("Failed to move folder:", error);
      toast({
        title: "Error",
        description: "Failed to move folder",
        variant: "destructive",
      });
    }
  };

  // Function to get folder path
  const getFolderPath = (folder: Folder, allFolders: Folder[]): string => {
    if (!folder.parentId) return folder.title;
    
    const parent = allFolders.find(f => f.id === folder.parentId);
    if (!parent) return folder.title;
    
    return `${getFolderPath(parent, allFolders)} / ${folder.title}`;
  };

  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <Move className="mr-2 h-4 w-4" />
          Move
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Folder</DialogTitle>
          <DialogDescription>
            Select a destination folder to move this folder to.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading && <div>Loading folders...</div>}
          {error && <div>Error loading folders: {error.message}</div>}
          <Select
            value={targetFolderId}
            onValueChange={setTargetFolderId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a folder" />
            </SelectTrigger>
            <SelectContent>
              {folders && folders.length > 0 ? (
                folders
                  .filter((folder: Folder) => folder.id !== id)
                  .map((folder: Folder) => (
                    <SelectItem 
                      key={folder.id} 
                      value={folder.id.toString()}
                      className="flex items-center gap-2"
                    >
                      <span className="flex-1">
                        {getFolderPath(folder, folders)}
                        {folder.isRoot && " (Root)"}
                      </span>
                    </SelectItem>
                  ))
              ) : (
                <div className="p-2 text-sm text-muted-foreground">
                  No folders available
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={!targetFolderId}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 