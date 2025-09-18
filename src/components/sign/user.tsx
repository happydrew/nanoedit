"use client";

import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Link } from "@/i18n/navigation";
import { User } from "@/types/user";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { NavItem } from "@/types/blocks/base";

export default function SignUser({ user }: { user: User }) {
  const t = useTranslations();
  console.log(JSON.stringify(user));

  const initial = React.useMemo(() => {
    const source = user?.nickname || user?.email || "";
    const char = source.trim().charAt(0);
    return char ? char.toUpperCase() : "?";
  }, [user?.nickname, user?.email]);

  const dropdownItems: NavItem[] = [
    {
      title: user.nickname,
    },
    {
      title: t("user.user_center"),
      url: "/my-orders",
    },
    {
      title: t("user.admin_system"),
      url: "/admin/users",
    },
    {
      title: t("user.sign_out"),
      onClick: () => signOut(),
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer">
          <AvatarImage src={user.avatar_url} alt={user.nickname} />
          <AvatarFallback className="bg-blue-600 text-white font-medium">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mx-4 bg-background">
        {dropdownItems.map((item, index) => (
          <React.Fragment key={index}>
            <DropdownMenuItem
              key={index}
              className="flex justify-center cursor-pointer"
            >
              {item.url ? (
                <Link href={item.url as any} target={item.target}>
                  {item.title}
                </Link>
              ) : (
                <button onClick={item.onClick}>{item.title}</button>
              )}
            </DropdownMenuItem>
            {index !== dropdownItems.length - 1 && <DropdownMenuSeparator />}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
