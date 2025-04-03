import { SignOutButton } from "@clerk/nextjs";
import { LayoutDashboard, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";

const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
];

const Sidebar = () => {
  return (
    <div className="flex min-w-[250px] flex-col gap-2 overflow-y-auto">
      {items.map((item) => (
        <Button
          asChild
          size={"sm"}
          key={item.title}
          variant={"ghost"}
          className="justify-start rounded-full"
        >
          <Link href={item.url}>
            <item.icon />
            <span>{item.title}</span>
          </Link>
        </Button>
      ))}

      <SignOutButton>
        <Button
          size={"sm"}
          variant={"ghost"}
          className="justify-start rounded-full"
        >
          <LogOut />
          <span>Logout</span>
        </Button>
      </SignOutButton>
    </div>
  );
};

export default Sidebar;
