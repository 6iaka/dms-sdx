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
import { Button } from "./ui/button";
import EditFileForm from "./forms/EditFileForm";
import { useToast } from "~/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    if (isSelecting && onSelect) {
      e.preventDefault();
      e.stopPropagation();
      onSelect(!isSelected);
    }
  };

  const handleDelete = async () => {
    try {
      const result = await deleteFile(data.id);
      if (result) {
        toast({
          title: "Success",
          description: "File deleted successfully",
        });
        await queryClient.invalidateQueries({ queryKey: ["files"] });
      } else {
        throw new Error("Failed to delete file");
      }
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
      <div className="relative aspect-square w-full overflow-hidden rounded-lg">
        {data.mimeType?.startsWith('image/') && data.thumbnailLink ? (
          <div className="relative w-full h-48">
            <Image
              src={data.thumbnailLink}
              alt={data.title}
              fill
              className="object-cover rounded-t-lg"
            />
          </div>
        ) : data.iconLink ? (
          <div className="flex items-center justify-center h-48 bg-gray-100 rounded-t-lg">
            <Image
              src={data.iconLink.replace("16", "64")}
              alt={data.title}
              width={64}
              height={64}
              className="object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 bg-gray-100 rounded-t-lg">
            <span className="text-2xl font-bold text-gray-500">
              {data.title.split('.').pop()?.toUpperCase()}
            </span>
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
