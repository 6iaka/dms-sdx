"use client";
import type { Folder, File } from "@prisma/client";
import { 
  EllipsisVertical, 
  Loader2, 
  Star, 
  Trash, 
  Edit, 
  Move, 
  MoreVertical, 
  Folder as FolderIcon,
  Pencil,
  RefreshCw,
  Share2,
  Trash2
} from "lucide-react";
import { cn } from "~/lib/utils";
import { deleteFolder, toggleFolderFavorite, editFolder } from "~/server/actions/folder_action";
import EditFolderForm from "./forms/EditFolderForm";
import MoveFolderForm from "./forms/MoveFolderForm";
import { Button } from "./ui/button";
import { useToast } from "~/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "~/hooks/usePermissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { useDrag, useDrop } from "react-dnd";
import { ItemTypes } from "~/lib/constants";
import { toast } from "sonner";
import { moveFolder } from "~/server/actions/folder_action";
import {
  Badge,
  BadgeProps,
} from "./ui/badge";
import {
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

type DragItem = {
  id: number;
  type: typeof ItemTypes[keyof typeof ItemTypes];
};

type Props = {
  data: Folder & {
    files: File[];
  };
  onSelect?: (id: number, selected: boolean) => void;
  isSelected?: boolean;
  isSelecting?: boolean;
};

export default function FolderCard({ data, onSelect, isSelected, isSelecting }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { canEdit, canDelete } = usePermissions();
  const [isMoving, setIsMoving] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const isRootFolder = data.parentId === null;

  const handleDelete = async () => {
    if (!canDelete) return;
    try {
      const result = await deleteFolder(data.id);
      if (result.success) {
        toast({
          title: "Success",
          description: "Folder deleted successfully",
        });
        await queryClient.invalidateQueries({ queryKey: ["folders"] });
        await queryClient.invalidateQueries({ queryKey: ["files"] });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete folder",
          variant: "destructive",
        });
      }
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Failed to delete folder:", error);
      toast({
        title: "Error",
        description: "Failed to delete folder",
        variant: "destructive",
      });
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isSelecting && onSelect) {
      e.stopPropagation();
      onSelect(data.id, !isSelected);
    } else {
      router.push(`/folder/${data.id}`);
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(data.id, !data.isFavorite);
  };

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.FOLDER,
    item: { id: data.id, type: ItemTypes.FOLDER },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.FOLDER,
    drop: async (item: { id: number; type: string }) => {
      if (item.id === data.id) return; // Don't allow dropping on itself
      try {
        setIsMoving(true);
        await moveFolder(item.id, data.id);
        toast({
          title: "Success",
          description: "Folder moved successfully",
        });
        onSelect?.(data.id, !isSelected);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to move folder",
          variant: "destructive",
        });
        console.error("Error moving folder:", error);
      } finally {
        setIsMoving(false);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const handleRename = async () => {
    try {
      await editFolder({
        id: data.id,
        title: newName,
      });
      toast({
        title: "Success",
        description: "Folder renamed successfully",
      });
      setShowRenameDialog(false);
      setNewName("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename folder",
        variant: "destructive",
      });
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/folder/${data.id}/sync`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to sync folder");
      }
      toast({
        title: "Success",
        description: "Folder synced successfully",
      });
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
      await queryClient.invalidateQueries({ queryKey: ["files"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync folder",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void handleSync();
  };

  const handleRenameClick = async () => {
    try {
      await handleRename();
    } catch (error) {
      console.error("Failed to rename folder:", error);
    }
  };

  const handleDeleteClick = async () => {
    try {
      await handleDelete();
    } catch (error) {
      console.error("Failed to delete folder:", error);
    }
  };

  const handleMove = async (targetFolderId: number) => {
    try {
      await moveFolder(data.id, targetFolderId);
      toast({
        title: "Success",
        description: "Folder moved successfully",
      });
      setShowMoveDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to move folder",
        variant: "destructive",
      });
    }
  };

  const handleMoveToRoot = async () => {
    try {
      await moveFolder(data.id, 0);
      toast({
        title: "Success",
        description: "Folder moved to root successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to move folder to root",
        variant: "destructive",
      });
    }
  };

  const handleMoveToRootClick = async () => {
    try {
      await handleMoveToRoot();
    } catch (error) {
      console.error("Failed to move to root:", error);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await toggleFolderFavorite(data.id);
      toast({
        title: "Success",
        description: `Folder ${data.isFavorite ? "removed from" : "added to"} favorites`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update folder favorite status",
        variant: "destructive",
      });
    }
  };

  const handleToggleFavoriteClick = async () => {
    try {
      await handleToggleFavorite();
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  const handleDrop = async (item: DragItem) => {
    if (item.type === "folder" && item.id !== data.id) {
      try {
        await moveFolder(item.id, data.id);
        toast({
          title: "Success",
          description: "Folder moved successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to move folder",
          variant: "destructive",
        });
      }
    }
  };

  const handleMoveClick = async (targetFolderId: number) => {
    try {
      await handleMove(targetFolderId);
    } catch (error) {
      console.error("Failed to move folder:", error);
    }
  };

  return (
    <div
      ref={(node) => {
        drag(node);
        drop(node);
      }}
      className={cn(
        "relative group cursor-pointer transition-all duration-200",
        isDragging && "opacity-50",
        isOver && "ring-2 ring-primary"
      )}
    >
      <div 
        className={cn(
          "flex items-center justify-between p-2 hover:bg-muted rounded-lg",
          isSelected && "bg-primary/10 ring-2 ring-primary"
        )}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2">
          <FolderIcon className="h-8 w-8 text-yellow-500 fill-yellow-500" />
          <span className="text-sm font-medium">{data.title}</span>
        </div>
        <div 
          className="flex items-center space-x-2"
          onClick={(e) => e.stopPropagation()}
        >
          {!isRootFolder && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onInteractOutside={(e) => {
                if (isSyncing) {
                  e.preventDefault();
                }
              }}>
                <DropdownMenuItem onClick={handleFavorite}>
                  <Star className={cn("mr-2 h-4 w-4", data.isFavorite && "text-yellow-500")} />
                  {data.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowMoveDialog(true)}>
                  <Move className="mr-2 h-4 w-4" />
                  Move
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleSyncClick}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Drag and Drop Visual Feedback */}
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Move className="h-4 w-4" />
            <span>Move to</span>
          </div>
        </div>
      )}

      {isOver && !isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/5 rounded-lg">
          <div className="flex items-center gap-2 text-primary font-medium">
            <span>Drop here</span>
          </div>
        </div>
      )}

      {isMoving && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this folder? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => startTransition(() => handleDeleteClick())}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for this folder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              defaultValue={data.title}
              className="w-full px-3 py-2 border rounded-md"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenameClick();
                  setShowRenameDialog(false);
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const input = document.querySelector("input") as HTMLInputElement;
                setNewName(input.value);
                void handleRenameClick();
              }}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Folder</DialogTitle>
            <DialogDescription>
              Select a destination folder to move this folder to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <MoveFolderForm id={data.id} onSuccess={() => setShowMoveDialog(false)} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Folder</DialogTitle>
            <DialogDescription>
              Share this folder with others.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Sharing functionality coming soon.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
