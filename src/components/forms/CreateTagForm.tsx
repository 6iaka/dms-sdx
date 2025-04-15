"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { upsertTag } from "~/server/actions/tag_action";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  name: z.string().trim().min(1, "Tag name cannot be empty").toLowerCase(),
});

const CreateTagForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await upsertTag(values.name);
    form.reset();
    setIsOpen(false);
    await queryClient.invalidateQueries({ queryKey: ["tags"] });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} defaultOpen={isOpen}>
      <PopoverTrigger asChild>
        <Button size={"sm"} variant={"ghost"} className="rounded-full">
          <Plus /> New Tag
        </Button>
      </PopoverTrigger>

      <PopoverContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Tag name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="animate-spin" />
              )}
              Create
            </Button>
          </form>
        </Form>
      </PopoverContent>
    </Popover>
  );
};

export default CreateTagForm;
