"use client";
import type { File as FileData, Tag, Role } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { EllipsisVertical, Trash } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useToast } from "~/hooks/use-toast";
import { cn, formatFileSize } from "~/lib/utils";
import { deleteFile } from "~/server/actions/file_action";
import EditFileForm from "./forms/EditFileForm";
import Image from "next/image";
import { useRole } from "~/hooks/use-role";
import { useState } from "react";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role } = useRole();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (isSelecting && onSelect) {
      e.preventDefault();
      e.stopPropagation();
      onSelect(!isSelected);
    } else {
      router.push(`/file/${data.id}`);
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
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete file";

      // Handle specific error cases
      if (errorMessage.includes("File not found")) {
        toast({
          title: "Error",
          description:
            "The file could not be found. It may have been already deleted.",
          variant: "destructive",
        });
      } else if (errorMessage.includes("permissions")) {
        toast({
          title: "Error",
          description: "You don't have permission to delete this file.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  const canEdit = role === "EDITOR" || role === "ADMINISTRATOR";
  const canDelete = role === "EDITOR" || role === "ADMINISTRATOR";

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        onClick={handleClick}
        className={cn(
          "group relative flex flex-col gap-2 rounded-lg bg-card p-2 transition-all hover:bg-secondary/25",
          isSelecting && "cursor-pointer",
          isSelected && "bg-primary/10 hover:bg-primary/20"
        )}
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
          {data.mimeType?.startsWith("image/") ? (
            <Image
              src={data.thumbnailLink || data.webContentLink}
              alt={data.title}
              width={500}
              height={500}
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Image
                src={data.iconLink}
                alt={data.title}
                width={48}
                height={48}
                className="h-12 w-12"
              />
            </div>
          )}
          {isSelecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div
                className={cn(
                  "size-6 rounded-full border-2",
                  isSelected ? "border-primary bg-primary" : "border-white",
                )}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="line-clamp-2 text-sm font-medium">{data.title}</h3>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(data.fileSize)}
          </p>
        </div>

        {(canEdit || canDelete) && (
          <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                >
                  <EllipsisVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem asChild>
                    <EditFileForm data={data} />
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
          </div>
        )}
      </div>
    </div>
  );
};

export default FileCard;
