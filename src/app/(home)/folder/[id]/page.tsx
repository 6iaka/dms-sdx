import { notFound } from "next/navigation";
import { findFolderById } from "~/server/actions/folder_action";
import FolderPageClient from "./FolderPageClient";

type Props = { params: Promise<{ id: string }> };

const FolderPage = async ({ params }: Props) => {
  const id = Number((await params).id);
  if (isNaN(id)) notFound();

  const data = await findFolderById(id);
  if (!data) notFound();

  return <FolderPageClient data={data} />;
};

export default FolderPage;
