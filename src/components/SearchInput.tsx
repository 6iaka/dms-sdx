"use client";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { getAllTags } from "~/server/actions/tag_action";
import { Label } from "./ui/label";
import { MultiSelect } from "./ui/multi-select";
import { type Category } from "@prisma/client";

const SearchInput = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Fetch all tags for the dropdown
  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => await getAllTags(),
  });

  // Get default values from the params
  const defaultQuery = searchParams.get("query") || "";
  const defaultCategory = (searchParams.get("category") as Category) || "ANY";
  const defaultTags = searchParams.get("tags")?.split(",") || [];

  // States to manage the search
  const [query, setQuery] = useState<string>(defaultQuery);
  const [selectedTags, setSelectedTags] = useState<string[]>(defaultTags);
  const [category, setCategory] = useState<Category | "ANY">(defaultCategory);

  const [open, setOpen] = useState(false);

  // const handleBasicSearch = (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
  //   const formData = new FormData(e.currentTarget);
  //   const query = formData.get("query") as string;
  //   router.push(`/search?query=${encodeURIComponent(query)}`);
  // };

  const handleAdvancedSearch = () => {
    const params = new URLSearchParams();

    if (category !== "ANY") params.append("category", category);
    if (query) params.append("query", query);
    if (selectedTags.length > 0) params.append("tags", selectedTags.join(","));

    router.push(`/search?${params.toString()}`);

    setOpen(false);
  };

  const handleReset = () => {
    setCategory("ANY");
    setSelectedTags([]);
    setQuery("");
  };

  // const handleTagSelect = (tagName: string) => {
  //   setAdvancedSearch((prev) => ({
  //     ...prev,
  //     tags: new Set(prev.tags).add(tagName),
  //   }));
  // };

  // const handleTagRemove = (tagName: string) => {
  //   setAdvancedSearch((prev) => {
  //     const newTags = new Set(prev.tags);
  //     newTags.delete(tagName);
  //     return {
  //       ...prev,
  //       tags: newTags,
  //     };
  //   });
  // };

  return (
    <form action={"/search"} className="relative">
      <Button
        type="submit"
        size={"icon"}
        variant={"ghost"}
        className="absolute left-2 top-1/2 size-8 -translate-y-1/2 rounded-full [&_svg]:size-4"
      >
        <Search />
      </Button>

      <Input
        name="query"
        defaultValue={query}
        placeholder="Search in Drive"
        className="h-11 rounded-full px-12"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size={"icon"}
            variant={"ghost"}
            className="absolute right-2 top-1/2 size-8 -translate-y-1/2 rounded-full [&_svg]:size-4"
          >
            <SlidersHorizontal />
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Advanced Search</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Query</Label>
              <Input
                placeholder="Enter a term that matches part of the file name"
                onChange={(e) => setQuery(e.target.value)}
                value={query}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>File type</Label>
              <Select
                onValueChange={(value: Category | "ANY") => setCategory(value)}
                value={category}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select the type of the file" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="ANY">Any</SelectItem>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="DOCUMENT">Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>File tag</Label>

              <MultiSelect
                value={selectedTags}
                defaultValue={selectedTags}
                options={
                  tags?.map((item) => ({
                    label: item.name,
                    value: item.name,
                  })) || []
                }
                onValueChange={setSelectedTags}
                placeholder="Select Tags"
                variant="inverted"
                animation={2}
                maxCount={3}
              />
              {/* <div className="flex flex-col gap-2">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tags to filter by" />
                  </SelectTrigger>
                  <SelectContent>
                    {tags?.map((tag) => (
                      <SelectItem
                        key={tag.id}
                        value={tag.name}
                        disabled={advancedSearch.tags.has(tag.name)}
                      >
                        {tag.name}{" "}
                        {advancedSearch.tags.has(tag.name) && "(selected)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {advancedSearch.tags.size > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Array.from(advancedSearch.tags).map((tagName) => (
                      <Badge
                        key={tagName}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tagName}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-4 rounded-full p-0 hover:bg-destructive/20"
                          onClick={() => handleTagRemove(tagName)}
                        >
                          <X className="size-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div> */}
            </div>
          </div>

          <DialogFooter className="ml-auto flex">
            <Button
              className="rounded-full"
              variant={"ghost"}
              onClick={handleReset}
            >
              Reset
            </Button>
            <Button
              type="button"
              className="rounded-full"
              onClick={handleAdvancedSearch}
            >
              Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
};

export default SearchInput;
