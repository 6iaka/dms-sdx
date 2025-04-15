"use client";
import type { Folder, File } from "@prisma/client";
import { EllipsisVertical, Loader2, Star, Trash, MoreVertical, Folder as FolderIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { deleteFolder, toggleFolderFavorite, editFolder } from "~/server/actions/folder_action";
import EditFolderForm from "./forms/EditFolderForm";
import { Button } from "./ui/button";
import { useToast } from "~/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "~/hooks/use-role";
import { Role } from "@prisma/client";
import { usePermissions } from "~/hooks/usePermissions";
import { Card } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

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
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { role } = useRole();
  const { canEdit, canDelete } = usePermissions();

  const handleDelete = async () => {
    try {
      await deleteFolder(data.id);
      toast({
        title: "Success",
        description: "Folder deleted successfully",
      });
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
      await queryClient.invalidateQueries({ queryKey: ["files"] });
    } catch (error) {
      console.error("Failed to delete folder:", error);
      toast({
        title: "Error",
        description: "Failed to delete folder",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (newName: string) => {
    try {
      await editFolder({
        id: data.id,
        title: newName,
        description: data.description || undefined
      });
      toast({
        title: "Success",
        description: "Folder renamed successfully",
      });
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
    } catch {
      toast({
        title: "Error",
        description: "Failed to rename folder",
        variant: "destructive",
      });
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const result = await toggleFolderFavorite(data.id);
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        // Invalidate the folders query to update the UI
        await queryClient.invalidateQueries({ queryKey: ["folders"] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
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

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}
    >
      <div
        className="relative flex cursor-pointer items-center gap-2 p-2"
        onClick={handleClick}
      >
        <div className="flex size-10 items-center justify-center">
          <FolderIcon className="size-8 text-blue-500" />
        </div>
        <div className="flex-1">
          <h3 className="line-clamp-2 text-sm font-medium">{data.title}</h3>
          <p className="text-xs text-muted-foreground">
            {data.files.length} files
          </p>
        </div>
        {(canEdit || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem asChild>
                  <EditFolderForm id={data.id} />
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={handleDelete}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </Card>
  );
}
