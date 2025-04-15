import { SignOutButton } from "@clerk/nextjs";
import { LayoutDashboard, LogOut, Users, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";
import { useRole } from "~/hooks/use-role";
import { Role } from "@prisma/client";

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: [Role.VIEWER, Role.EDITOR, Role.ADMINISTRATOR],
  },
  {
    title: "Users",
    href: "/users",
    icon: Users,
    roles: [Role.ADMINISTRATOR],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: [Role.EDITOR, Role.ADMINISTRATOR],
  },
];

const Sidebar = () => {
  const { role } = useRole();

  return (
    <div className="flex min-w-[250px] flex-col gap-2 overflow-y-auto">
      {sidebarItems
        .filter((item) => item.roles.includes(role))
        .map((item) => (
          <Button
            asChild
            size={"sm"}
            key={item.title}
            variant={"ghost"}
            className="justify-start rounded-full"
          >
            <Link href={item.href}>
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
