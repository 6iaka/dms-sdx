import type {} from "@redux-devtools/extension";
import { create } from "zustand";

type Item = {
  type: "file" | "folder";
  googleId: string;
  id: number;
};

interface SelectionState {
  items: Item[];
  isOpen: boolean;
  resetItems: () => void;
  removeItem: (googleId: string) => void;
  toggleSelect: (item: Item) => void;
  setIsOpen: (value: boolean) => void;
}

export const useSelection = create<SelectionState>()((set) => ({
  items: [],
  isOpen: true,
  resetItems: () => set(() => ({ items: [] })),
  setIsOpen: (value) => set(() => ({ isOpen: value })),
  toggleSelect: (item) =>
    set((state) => {
      const exists = state.items.find((i) => i.googleId === item.googleId);
      if (exists) return { items: state.items.filter((i) => i.id !== item.id) };
      return { items: [...state.items, item] };
    }),
  removeItem: (googleId) =>
    set((state) => {
      const alreadyExists = state.items.find(
        (item) => item.googleId === googleId,
      );
      if (!alreadyExists) return state;
      return {
        items: state.items.filter((item) => item.googleId !== googleId),
      };
    }),
}));
