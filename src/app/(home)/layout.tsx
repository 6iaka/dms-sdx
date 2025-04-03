"use client";

import Navbar from "~/components/Navbar";
import Sidebar from "~/components/Sidebar";
import { useSelection } from "~/hooks/use-selection";

const HomeLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const { resetItems } = useSelection((state) => state);

  return (
    <main className="flex h-screen w-screen flex-col" onClick={resetItems}>
      <Navbar />

      <section className="flex min-h-0 flex-1 gap-2 p-4">
        <Sidebar />

        <div className="flex flex-1 flex-col rounded-2xl bg-secondary/20">
          {children}
        </div>
      </section>
    </main>
  );
};

export default HomeLayout;
