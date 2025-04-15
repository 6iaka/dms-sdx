import { notFound } from "next/navigation";
import fileService from "~/server/services/file_service";

type Props = { params: Promise<{ id: string }> };

const FilePage = async ({ params }: Props) => {
  const id = Number((await params).id);
  if (isNaN(id)) notFound();

  const file = await fileService.findById(id);
  if (!file) notFound();

  // Redirect to the file's web view link
  return <meta httpEquiv="refresh" content={`0;url=${file.webViewLink}`} />;
};

export default FilePage; 