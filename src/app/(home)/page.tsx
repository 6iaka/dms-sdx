export const dynamic = "force-dynamic";
import FolderCard from "~/components/FolderCard";
import SelectionActionBar from "~/components/SelectionActionBar";

import {
  createRootFolder,
  getAllFolders,
} from "~/server/actions/folder_action";

const HomePage = async () => {
  await createRootFolder();
  const folders = await getAllFolders();
  // Filter folders to show only favorites or root-level folders

  const filteredFolders = folders?.filter(folder => 
    folder.isFavorite === true || folder.parentId === null
  );

  return (
    <>

      <header className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight first:mt-0">
            Dashboard
          </h2>
        </div>
        <SelectionActionBar />
      </header>

      <section className="flex h-full flex-col gap-2 overflow-y-auto rounded-lg px-4">
        <h3 className="text-balance font-medium">Folders</h3>
        <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2">
          {filteredFolders && filteredFolders.length > 0 ? (
            filteredFolders.map((item) => <FolderCard data={item} key={item.id} />)
          ) : (
            <p className="text-sm text-muted-foreground">No Folders Here</p>
          )}
        </div>
      </section>
    </>
  );
};

export default HomePage;
