import { RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";
import { useTransition } from "react";
import { syncDrive } from "~/server/actions/admin_action";

const SyncDriveButton = () => {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant={"ghost"}
      className="rounded-full"
      size={"sm"}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await syncDrive();
        })
      }
    >
      <RefreshCcw className={isPending ? "animate-spin" : ""} />
      Sync Drive
    </Button>
  );
};

export default SyncDriveButton;
