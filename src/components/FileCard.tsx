"use client";
import { type File as PrismaFile, type Tag } from "@prisma/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { FileText, File as FileIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { useToast } from "~/hooks/use-toast";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  data: PrismaFile & {
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

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
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      await queryClient.invalidateQueries({ queryKey: ["files"] });
    } catch (error) {
      console.error("Failed to delete file:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const renderThumbnail = () => {
    if (data.mimeType?.startsWith('video/')) {
      return (
        <div className="relative w-full h-full">
          {data.thumbnailLink ? (
            <Image
              src={data.thumbnailLink}
              alt={data.title}
              width={500}
              height={500}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <FileText className="w-12 h-12 text-gray-500 dark:text-gray-400" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-white/90 p-3 shadow-lg z-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-8 w-8 text-black"
              >
                <path
                  fillRule="evenodd"
                  d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      );
    }

    if (data.thumbnailLink) {
      return (
        <Image
          src={data.thumbnailLink}
          alt={data.title}
          width={500}
          height={500}
          className="w-full h-full object-cover"
          unoptimized
        />
      );
    }

    if (data.mimeType?.startsWith('image/')) {
      return (
        <Image
          src={data.webContentLink}
          alt={data.title}
          width={500}
          height={500}
          className="w-full h-full object-cover"
          unoptimized
        />
      );
    }

    // For PDFs, show a PDF icon with a background
    if (data.mimeType === 'application/pdf') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <FileText className="w-12 h-12 text-gray-500 dark:text-gray-400" />
        </div>
      );
    }

    // Default icon for other file types
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <FileIcon className="w-12 h-12 text-gray-500 dark:text-gray-400" />
      </div>
    );
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
          {renderThumbnail()}
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
                  onSelect={(e) => {
                    e.preventDefault();
                    setShowDeleteDialog(true);
                  }}
                  className="flex items-center gap-2 text-destructive"
                >
                  <Trash className="h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => startTransition(handleDelete)}
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
    </Card>
  );
};

export default FileCard;
