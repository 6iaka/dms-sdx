"use client";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "./ui/label";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllTags } from "~/server/actions/tag_action";

const SearchInput = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("query") || "";
  const type = searchParams.get("type") || "";
  const tag = searchParams.get("tag") || "";
  const name = searchParams.get("name") || "";

  const [open, setOpen] = useState(false);
  const [advancedSearch, setAdvancedSearch] = useState({
    type: type || "any",
    name: name,
    tag: tag || "any",
  });

  // Fetch all tags for the dropdown
  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => await getAllTags(),
  });

  const handleBasicSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("query") as string;
    router.push(`/search?query=${encodeURIComponent(query)}`);
  };

  const handleAdvancedSearch = () => {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (advancedSearch.type !== "any") params.append("type", advancedSearch.type);
    if (advancedSearch.name) params.append("name", advancedSearch.name);
    if (advancedSearch.tag !== "any") params.append("tag", advancedSearch.tag);
    router.push(`/search?${params.toString()}`);
    setOpen(false);
  };

  const handleReset = () => {
    setAdvancedSearch({
      type: "any",
      name: "",
      tag: "any",
    });
    router.push(`/search?query=${encodeURIComponent(query)}`);
    setOpen(false);
  };

  return (
    <form onSubmit={handleBasicSearch} className="relative">
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
              <Label>File type</Label>
              <Select
                value={advancedSearch.type}
                onValueChange={(value) =>
                  setAdvancedSearch({ ...advancedSearch, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select the type of the file" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="documents">Documents</SelectItem>
                  <SelectItem value="spreadsheets">Spreadsheets</SelectItem>
                  <SelectItem value="presentations">Presentations</SelectItem>
                  <SelectItem value="images">Photos & Images</SelectItem>
                  <SelectItem value="pdfs">PDFs</SelectItem>
                  <SelectItem value="videos">Videos</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Item name</Label>
              <Input
                placeholder="Enter a term that matches part of the file name"
                value={advancedSearch.name}
                onChange={(e) =>
                  setAdvancedSearch({ ...advancedSearch, name: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>File tag</Label>
              <Select
                value={advancedSearch.tag}
                onValueChange={(value) =>
                  setAdvancedSearch({ ...advancedSearch, tag: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select the tag that the file should contain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {tags?.map((tag) => (
                    <SelectItem key={tag.id} value={tag.name}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button className="rounded-full" onClick={handleAdvancedSearch}>
              Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
};

export default SearchInput;
