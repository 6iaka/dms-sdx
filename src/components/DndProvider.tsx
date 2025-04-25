"use client";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

const DndProviderWrapper = ({ children }: Props) => {
  return <DndProvider backend={HTML5Backend}>{children}</DndProvider>;
};

export default DndProviderWrapper; 