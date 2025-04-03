"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Tag, Trash2, Pencil, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { getAllTags } from "~/server/actions/tag_action";
import { getFilesByTag } from "~/server/actions/file_action";
import { Badge } from "./ui/badge";
import FileCard from "./FileCard";
import { deleteTag, upsertTag } from "~/server/actions/tag_action";
import { useToast } from "~/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

const TagsSection = () => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [tagToEdit, setTagToEdit] = useState<{ id: number; name: string } | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for all tags
  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => await getAllTags(),
  });

  // Sort tags by file count and filter by search query
  const sortedAndFilteredTags = tags
    ?.sort((a, b) => b._count.files - a._count.files)
    .filter((tag) =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Query for files of selected tag
  const { data: files, isLoading, error } = useQuery({
    queryKey: ["files", selectedTag],
    queryFn: async () => {
      if (!selectedTag) return [];
      try {
        const result = await getFilesByTag(selectedTag);
        return result || [];
      } catch {
        return [];
      }
    },
    enabled: !!selectedTag,
  });

  // Handle tag selection
  const handleTagSelect = (tagName: string) => {
    setSelectedTag(tagName);
  };

  // Handle tag deletion
  const handleDelete = async () => {
    if (!tagToDelete) return;
    try {
      const response = await deleteTag(tagToDelete);
      if (response) {
        toast({ title: "Tag deleted successfully" });
        setTagToDelete(null);
        if (selectedTag === tagToDelete) {
          setSelectedTag(null);
        }
        await queryClient.invalidateQueries({ queryKey: ["tags"] });
        await queryClient.invalidateQueries({ queryKey: ["files"] });
      } else {
        toast({
          title: "Error deleting tag",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error deleting tag",
        variant: "destructive",
      });
    }
  };

  // Handle tag edit
  const handleEdit = async () => {
    if (!tagToEdit || !newTagName) return;
    try {
      const response = await upsertTag(newTagName);
      if (response) {
        toast({ title: "Tag updated successfully" });
        setTagToEdit(null);
        setNewTagName("");
        if (selectedTag === tagToEdit.name) {
          setSelectedTag(newTagName);
        }
        await queryClient.invalidateQueries({ queryKey: ["tags"] });
        await queryClient.invalidateQueries({ queryKey: ["files"] });
      } else {
        toast({
          title: "Error updating tag",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error updating tag",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Tag className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Tags</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {/* Search Input */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Tags Grid */}
          <div className="grid grid-cols-2 gap-2">
            {sortedAndFilteredTags?.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTag === tag.name ? "default" : "secondary"}
                className="flex cursor-pointer items-center justify-between rounded-full px-3 py-1"
              >
                <span 
                  className="flex-1 cursor-pointer"
                  onClick={() => handleTagSelect(tag.name)}
                >
                  {tag.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    ({tag._count.files})
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 rounded-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setTagToEdit(tag);
                          setNewTagName(tag.name);
                        }}
                      >
                        <Pencil className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTagToDelete(tag.name);
                        }}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Badge>
            ))}
          </div>

          {/* Files Section */}
          {selectedTag && (
            <div className="flex flex-col gap-2">
              <h3 className="text-balance font-medium">Files with tag &quot;{selectedTag}&quot;</h3>
              <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
                {isLoading ? (
                  <div className="col-span-full flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : error ? (
                  <p className="text-sm text-destructive">Error loading files</p>
                ) : files && files.length > 0 ? (
                  files.map((file) => <FileCard data={file} key={file.id} />)
                ) : (
                  <p className="text-sm text-muted-foreground">No files with this tag</p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!tagToDelete} onOpenChange={() => setTagToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the tag &quot;{tagToDelete}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tag Dialog */}
      <Dialog open={!!tagToEdit} onOpenChange={() => setTagToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>
              Enter a new name for the tag.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Enter tag name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagToEdit(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default TagsSection; 