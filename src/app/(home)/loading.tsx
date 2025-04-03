import { Loader2 } from "lucide-react";

const Loading = () => {
  return (
    <main className="flex flex-1 items-center justify-center">
      <Loader2 className="animate-spin" />
    </main>
  );
};

export default Loading;
