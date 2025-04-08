import FileCard from "~/components/FileCard";
import FolderCard from "~/components/FolderCard";
import fileService from "~/server/services/file_service";
import folderService from "~/server/services/folder_service";

type Props = {
  searchParams: Promise<{
    query?: string;
    type?: string;
    name?: string;
    tag?: string | string[];
  }>;
};

const SearchPage = async ({ searchParams }: Props) => {
  const params = await searchParams;
  const { query, type, name, tag } = params;

  // Build search query
  const searchQuery = {
    text: query || "",
    type: type || "",
    name: name || "",
    tag: tag || "",
  };

  const files = await fileService.search(searchQuery);
  const folders = await folderService.search(query || "");

  return (
    <main className="flex flex-col gap-4 p-4">
      <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
        {query ? `"${query}" results` : "Search"}
      </h2>

      <section className="flex flex-col gap-2 rounded-lg">
        <h3 className="text-balance font-medium">Folders</h3>
        <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2">
          {folders.length > 0 ? (
            folders.map((item) => <FolderCard data={item} key={item.id} />)
          ) : (
            <p className="text-sm text-muted-foreground">No Folders Here</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-lg">
        <h3 className="text-balance font-medium">Files</h3>

        <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
          {files.length > 0 ? (
            files.map((item) => <FileCard data={item} key={item.id} />)
          ) : (
            <p className="text-sm text-muted-foreground">No Files Here</p>
          )}
        </div>
      </section>
    </main>
  );
};

export default SearchPage;
