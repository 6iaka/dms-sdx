"use client";
import { Download, Loader2, Move, Trash, X } from "lucide-react";
import { useSelection } from "~/hooks/use-selection";
import { Button } from "./ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteFiles } from "~/server/actions/file_action";
import { useToast } from "~/hooks/use-toast";
import { useEffect } from "react";
import type { File as FileData } from "@prisma/client";

const SelectionActionBar = ({ folderId }: { folderId?: number }) => {
  const { toast } = useToast();
  const { items, resetItems } = useSelection((state) => state);
  const queryClient = useQueryClient();

  const { mutate, isSuccess, isPending } = useMutation({
    mutationKey: ["deleteFiles"],

    mutationFn: async (payload: number[]) => {
      await deleteFiles(payload);
      resetItems();
    },

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["getFiles", folderId] });
      const snapshot = await queryClient.getQueryData(["getFiles", folderId]);
      queryClient.setQueryData(
        ["getFiles", folderId],
        (old: ApiResponse<FileData[]>) => {
          if (old.success) {
            return {
              success: old.success,
              data: old.data.filter(
                (item) =>
                  !items.map((item) => item.googleId).includes(item.googleId),
              ),
            };
          }
        },
      );

      return { snapshot };
    },

    onError: (_, __, context) => {
      queryClient.setQueryData(["getFiles", folderId], context?.snapshot);
    },

    onSettled: async () =>
      await queryClient.invalidateQueries({ queryKey: ["getFiles", folderId] }),
  });

  useEffect(() => {
    if (!isPending && isSuccess) {
      toast({
        title: "Success",
        description: "Files deleted",
      });
    }
  }, [isSuccess, isPending, toast]);

  if (items.length > 0) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-4 rounded-full bg-secondary/50 p-1 text-sm"
      >
        <Button
          variant={"ghost"}
          size={"icon"}
          className="size-7 rounded-full"
          onClick={resetItems}
        >
          <X />
        </Button>

        <p>{items.length} selected</p>

        <div className="flex gap-1">
          <Button
            className="size-7 rounded-full"
            variant={"ghost"}
            size={"icon"}
          >
            <Download />
          </Button>

          <Button
            className="size-7 rounded-full"
            variant={"ghost"}
            size={"icon"}
          >
            <Move />
          </Button>

          <Button
            className="size-7 rounded-full"
            variant={"ghost"}
            size={"icon"}
            disabled={isPending}
            onClick={() => mutate(items.map((item) => item.id))}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Trash />}
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default SelectionActionBar;
