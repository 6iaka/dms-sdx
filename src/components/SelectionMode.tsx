"use client";

import { Button } from "~/components/ui/button";
import { Check, X } from "lucide-react";
import { useState } from "react";

type Props = {
  onSelect: (isSelecting: boolean) => void;
};

const SelectionMode = ({ onSelect }: Props) => {
  const [isSelecting, setIsSelecting] = useState(false);

  const toggleSelection = (value: boolean) => {
    setIsSelecting(value);
    onSelect(value);
  };

  return (
    <div className="flex items-center gap-2">
      {isSelecting ? (
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={() => toggleSelection(false)}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={() => toggleSelection(true)}
        >
          <Check className="mr-2 h-4 w-4" />
          Select
        </Button>
      )}
    </div>
  );
};

export default SelectionMode; 