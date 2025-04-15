"use client";
import type { File as FileData, Tag } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { EllipsisVertical, Trash } from "lucide-react";
import { useTransition } from "react";
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
import { Role } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileIcon } from "lucide-react";

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
  const { role } = useRole();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
      toast({ title: "File deleted successfully" });
      await queryClient.invalidateQueries({ queryKey: ["files"] });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error deleting file",
        variant: "destructive",
      });
    }
  };

  const canEdit = role === Role.EDITOR || role === Role.ADMINISTRATOR;
  const canDelete = role === Role.ADMINISTRATOR;

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
          isPending && "pointer-events-none opacity-20",
          isSelecting && "cursor-pointer",
          isSelected && "bg-primary/10 hover:bg-primary/20",
        )}
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
          {data.thumbnailUrl ? (
            <Image
              src={data.thumbnailUrl}
              alt={data.title}
              width={200}
              height={200}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <FileIcon className="h-12 w-12 text-muted-foreground" />
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
