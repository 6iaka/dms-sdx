import { Bot, CornerDownRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "./ui/input";
import TooltipWrapper from "./TooltipWrapper";

const AIModal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <TooltipWrapper label="Ask AI">
          <Button
            size={"icon"}
            variant={"secondary"}
            className="group fixed bottom-2 right-2 z-20 animate-bounce"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="smoothie size-6 fill-muted-foreground transition-all group-hover:scale-105 group-hover:fill-primary"
              viewBox="0 0 24 24"
            >
              <path d="M22.078 8.347a1.4 1.4 0 0 0-.488-.325V4.647a.717.717 0 1 0-1.434 0V7.85h-.21a5.48 5.48 0 0 0-5.25-3.92H9.427a5.48 5.48 0 0 0-5.25 3.92H3.9V4.647a.717.717 0 1 0-1.434 0v3.385a1.5 1.5 0 0 0-.469.315A1.72 1.72 0 0 0 1.5 9.552v4.896a1.7 1.7 0 0 0 1.702 1.702h.956a5.48 5.48 0 0 0 5.25 3.92h5.183a5.48 5.48 0 0 0 5.25-3.92h.955a1.7 1.7 0 0 0 1.702-1.702V9.552c.02-.44-.131-.872-.42-1.205M3.996 14.716H3.24a.27.27 0 0 1-.191-.077a.3.3 0 0 1-.076-.191V9.552a.26.26 0 0 1 .248-.268h.775a.6.6 0 0 0 0 .125v5.182a.6.6 0 0 0 0 .125m4.312-2.869v-1.96a.813.813 0 1 1 1.616 0v1.96a.813.813 0 1 1-1.616 0m6.283 3.662a3.605 3.605 0 0 1-5.068 0a.813.813 0 0 1 .885-1.326a.8.8 0 0 1 .262.179a2.017 2.017 0 0 0 2.773 0a.804.804 0 0 1 1.148 0a.813.813 0 0 1 0 1.157zm1.367-3.69h-1.913a.812.812 0 0 1-.574-1.385a.8.8 0 0 1 .574-.232h1.913a.805.805 0 0 1 .754 1.117a.81.81 0 0 1-.754.509zm5.182 2.62a.3.3 0 0 1-.076.19a.27.27 0 0 1-.191.077h-.756a.6.6 0 0 0 0-.124V9.37a.6.6 0 0 0 0-.124h.765a.25.25 0 0 1 .182.077c.048.052.076.12.076.19z"></path>
            </svg>
          </Button>
        </TooltipWrapper>
      </DialogTrigger>

      <DialogContent className="p-4">
        <DialogHeader>
          <DialogTitle>Search With AI</DialogTitle>
          <DialogDescription></DialogDescription>

          <div className="flex gap-2">
            <div className="group relative flex-1">
              <Bot className="absolute left-2 top-1/2 size-6 -translate-y-1/2 stroke-muted-foreground transition-all group-focus-within:stroke-primary" />

              <Input placeholder="Describe the file..." className="pl-10" />
            </div>

            <Button size={"icon"} className="shrink-0">
              <CornerDownRight />
            </Button>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default AIModal;
