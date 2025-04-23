import { RefreshCcw, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { useTransition } from "react";
import { quickSync } from "~/server/actions/admin_action";
import { useToast } from "~/hooks/use-toast";
import { useState } from "react";

export default function SyncDriveButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await quickSync();
      if (result.success) {
        toast({
          title: "Drive Sync",
          description: result.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Sync Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "An unexpected error occurred while syncing",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={isSyncing}
    >
      {isSyncing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Quick Sync
        </>
      )}
    </Button>
  );
}
