"use client";
import type { Folder, File } from "@prisma/client";
import { EllipsisVertical, Loader2, Star, Trash } from "lucide-react";
import { cn } from "~/lib/utils";
import { deleteFolder, toggleFolderFavorite, editFolder } from "~/server/actions/folder_action";
import EditFolderForm from "./forms/EditFolderForm";
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

  const handleClick = (e: React.MouseEvent) => {
    if (isSelecting && onSelect) {
      e.stopPropagation();
      onSelect(data.id, !isSelected);
    } else {
      router.push(`/folder/${data.id}`);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 rounded-lg bg-card p-2 transition-all hover:bg-secondary/25",
        isSelecting && "cursor-pointer",
        isSelected && "bg-primary/10 hover:bg-primary/20"
      )}
      onClick={handleClick}
    >
      {isSelecting && (
        <div
          className="absolute left-2 top-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect?.(data.id, e.target.checked);
            }}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>
      )}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        x="0px"
        y="0px"
        width="100"
        height="100"
        viewBox="0 0 48 48"
        className="size-10 flex-shrink-0 transition-all group-hover:-translate-y-1"
      >
        <path
          fill="#FFA000"
          d="M38,12H22l-4-4H8c-2.2,0-4,1.8-4,4v24c0,2.2,1.8,4,4,4h31c1.7,0,3-1.3,3-3V16C42,13.8,40.2,12,38,12z"
        ></path>
        <path
          fill="#FFCA28"
          d="M42.2,18H15.3c-1.9,0-3.6,1.4-3.9,3.3L8,40h31.7c1.9,0,3.6-1.4,3.9-3.3l2.5-14C46.6,20.3,44.7,18,42.2,18z"
        ></path>
      </svg>

      <div className="flex flex-1 items-center gap-2">
        <div className="flex flex-1 items-center gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold capitalize">
            {data.title}
          </h3>
          {data.isFavorite && (
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          )}
        </div>
        {!data.isRoot && (canEdit || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size={"icon"}
                variant={"ghost"}
                disabled={isPending}
                className="size-5 shrink-0 rounded-full"
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <EllipsisVertical className="h-3 w-3" />
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              className="w-44"
              onClick={(e) => e.stopPropagation()}
            >
              {canEdit && <EditFolderForm id={data.id} />}
              {canDelete && (
                <DropdownMenuItem
                  onSelect={() => startTransition(handleDelete)}
                  className="flex items-center gap-2"
                >
                  <Trash className="h-4 w-4" />
                  <span className="flex-1">Delete</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
