"use client";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useDropzone } from "react-dropzone";
import { useToast } from "~/hooks/use-toast";
import { cn } from "~/lib/utils";
import { uploadFiles } from "~/server/actions/file_action";

const DropzoneProvider = ({
  children,
  className,
  folderId,
}: {
  children: ReactNode;
  className?: string;
  folderId: number;
}) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);

  const { mutate, isSuccess, isPending } = useMutation({
    mutationKey: ["uploadFiles"],
    mutationFn: async (payload: File[]) =>
      await uploadFiles({
        files: payload,
        folderId,
      }),
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setFiles(acceptedFiles);
      mutate(acceptedFiles);
    },
    [mutate],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  useEffect(() => {
    if (!isPending && isSuccess) {
      toast({
        title: "Success",
        description: "Files uploaded",
      });
      setFiles([]);
    }
  }, [isSuccess, isPending, toast]);

  if (isDragActive)
    return (
      <div {...getRootProps()} className={cn(className)}>
        <div className="flex h-full flex-1 items-center justify-center rounded-md border-2 border-primary bg-secondary">
          <input {...getInputProps()} />

          <div className="flex flex-col items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="#ffff"
              viewBox="0 0 24 24"
              className="size-24"
            >
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"></path>
              </g>
            </svg>

            <p>Drop files here to upload</p>
          </div>
        </div>
      </div>
    );

  return (
    <div {...getRootProps()} className={cn(className)}>
      {files.length > 0 ? (
        <div
          className={cn(
            "flex h-full flex-1 items-center justify-center rounded-md border-2 border-primary",
            className,
          )}
        >
          <div className="flex max-w-[200px] flex-col items-center justify-center gap-2 text-balance text-center">
            <Loader2 className="animate-spin" />
            <p className="text-sm">
              Your files are being uploaded. Please do not leave this page.
            </p>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export default DropzoneProvider;
