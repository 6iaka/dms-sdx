import { RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";
import { useTransition } from "react";
import { syncDrive } from "~/server/actions/admin_action";
import { useToast } from "~/hooks/use-toast";

const SyncDriveButton = () => {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <Button
      variant={"ghost"}
      className="rounded-full"
      size={"sm"}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await syncDrive();
          toast({
            title: result.success ? "Success" : "Error",
            description: result.message,
            variant: result.success ? "default" : "destructive",
          });
        })
      }
    >
      <RefreshCcw className={isPending ? "animate-spin" : ""} />
      Sync Drive
    </Button>
  );
};

export default SyncDriveButton;
