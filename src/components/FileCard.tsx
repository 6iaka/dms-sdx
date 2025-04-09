"use client";
import type { File as FileData, Tag } from "@prisma/client";
import { EllipsisVertical, Trash } from "lucide-react";
import Image from "next/image";
import { useState, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn, formatFileSize } from "~/lib/utils";
import { deleteFile } from "~/server/actions/file_action";
import { Button } from "~/components/ui/button";
import EditFileForm from "./forms/EditFileForm";
import { useToast } from "~/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

type Props = { 
  data: FileData & {
    tags: Tag[];
  };
  isSelecting?: boolean;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
};

const FileCard = ({ data, isSelecting, isSelected, onSelect }: Props) => {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleClick = (e: React.MouseEvent) => {
    if (isSelecting && onSelect) {
      e.preventDefault();
      e.stopPropagation();
      onSelect(!isSelected);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteFile(data.id);
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      await queryClient.invalidateQueries({ queryKey: ["files"] });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  return (
    <a
      href={data.webViewLink}
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col gap-2 rounded-lg bg-card p-2 transition-all hover:bg-secondary/25",
        isPending && "pointer-events-none opacity-20",
        isSelecting && "cursor-pointer",
        isSelected && "bg-primary/10 hover:bg-primary/20"
      )}
      onDoubleClick={() => (window.location.href = data.webViewLink)}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
        {data.mimeType?.startsWith('image/') ? (
          <img
            src={data.thumbnailLink || data.webContentLink}
            alt={data.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.className = 'flex h-full items-center justify-center';
              fallback.innerHTML = '<span class="text-4xl">🖼️</span>';
              target.parentNode?.appendChild(fallback);
            }}
          />
        ) : data.mimeType?.startsWith('video/') ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl">🎬</span>
          </div>
        ) : data.mimeType?.startsWith('audio/') ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl">🎵</span>
          </div>
        ) : data.mimeType?.includes('pdf') ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl">📄</span>
          </div>
        ) : data.mimeType?.includes('word') || data.mimeType?.includes('document') ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl">📝</span>
          </div>
        ) : data.mimeType?.includes('spreadsheet') || data.mimeType?.includes('excel') ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl">📊</span>
          </div>
        ) : data.mimeType?.includes('presentation') || data.mimeType?.includes('powerpoint') ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl">📑</span>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl">📁</span>
          </div>
        )}
        {isSelecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className={cn(
              "size-6 rounded-full border-2",
              isSelected ? "border-primary bg-primary" : "border-white"
            )} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="line-clamp-1 text-sm font-medium">{data.title}</h3>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(data.fileSize)}
        </p>
      </div>

      {!isSelecting && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 size-6 rounded-full"
              onClick={(e) => e.stopPropagation()}
            >
              <EllipsisVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <EditFileForm data={data} />
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                startTransition(handleDelete);
              }}
            >
              <Trash className="h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </a>
  );
};

export default FileCard;
