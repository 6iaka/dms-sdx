"use client";
import { type File, type Tag } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { usePermissions } from "~/hooks/usePermissions";
import { deleteFile } from "~/server/actions/file_action";
import { cn, formatFileSize } from "~/lib/utils";
import { Card } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { EllipsisVertical, Trash } from "lucide-react";
import { Button } from "~/components/ui/button";
import EditFileForm from "./forms/EditFileForm";
import Image from "next/image";
import { useRole } from "~/hooks/use-role";
import { useRouter } from "next/navigation";

type Props = {
  data: File & {
    tags: Tag[];
  };
  isSelecting?: boolean;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
};

const FileCard = ({ data, isSelecting, isSelected, onSelect }: Props) => {
  const { canEdit, canDelete } = usePermissions();
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
    if (!canDelete) return;
    try {
      await deleteFile(data.id);
      toast.success("File deleted successfully");
    } catch (error) {
      console.error("Error deleting file:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete file";

      if (errorMessage.includes("File not found")) {
        toast.error("The file could not be found. It may have been already deleted.");
      } else if (errorMessage.includes("permissions")) {
        toast.error("You don't have permission to delete this file.");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative aspect-square cursor-pointer"
        onClick={handleClick}
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
      </div>

      <div className="p-2">
        <h3 className="line-clamp-2 text-sm font-medium">{data.title}</h3>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(data.fileSize)}
        </p>
      </div>

      {(canEdit || canDelete) && (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
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
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </Card>
  );
};

export default FileCard;
