"use client";
import type { Folder } from "@prisma/client";
import { EllipsisVertical, Loader2, Star, Trash } from "lucide-react";
import Link from "next/link";
import { cn } from "~/lib/utils";
import { deleteFolder, toggleFolderFavorite, editFolder } from "~/server/actions/folder_action";
import EditFolderForm from "./forms/EditFolderForm";
import { Button } from "./ui/button";
import { useToast } from "~/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type Props = { data: Folder };

const FolderCard = ({ data }: Props) => {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    try {
      await deleteFolder(data.id);
      toast({
        title: "Success",
        description: "Folder deleted successfully",
      });
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
      await queryClient.invalidateQueries({ queryKey: ["files"] });
    } catch {
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

  return (
    <Link
      href={`/folder/${data.id}`}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg bg-card p-2 transition-all hover:bg-secondary/25",
        isPending && "pointer-events-none opacity-20",
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        x="0px"
        y="0px"
        width="100"
        height="100"
        viewBox="0 0 48 48"
        className="size-12 flex-shrink-0 transition-all group-hover:-translate-y-1"
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

      <div className="pointer-events-none flex flex-1 select-none flex-col">
        <div className="flex items-center gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold capitalize">
            {data.title}
          </h3>
          {data.isFavorite && (
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          )}
        </div>
        <p className="line-clamp-1 text-xs font-light">{data.description}</p>
      </div>

      {!data.isRoot && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size={"icon"}
              variant={"ghost"}
              disabled={isPending}
              className="size-6 shrink-0 rounded-full"
            >
              {isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <EllipsisVertical />
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-44"
            onClick={(e) => e.stopPropagation()}
          >
            <EditFolderForm id={data.id} />

            <DropdownMenuItem onSelect={handleToggleFavorite} className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span className="flex-1">{data.isFavorite ? "Remove from Favorites" : "Add to Favorites"}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => startTransition(handleDelete)}
              className="flex items-center gap-2"
            >
              <Trash className="h-4 w-4" />
              <span className="flex-1">Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </Link>
  );
};

export default FolderCard;
