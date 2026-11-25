"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import {
  RiArrowUpDownLine,
  RiSparklingLine,
  RiCheckboxCircleLine,
  RiBankCardLine,
  RiNotificationLine,
  RiLogoutBoxLine,
  RiLoader4Line,
  RiSunLine,
  RiMoonLine,
  RiUserLine,
} from "@remixicon/react"
import { logoutAction } from "@/features/auth"

export interface NavUserProps {
  user: {
    name: string
    email: string
    avatar?: string
    role?: string
  }
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar()
  const [isPending, startTransition] = useTransition()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === "dark" : true

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction()
    })
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email
    ? user.email.slice(0, 2).toUpperCase()
    : "AG"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="aria-expanded:bg-muted aria-expanded:text-foreground"
              />
            }
          >
            <Avatar>
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : null}
              <AvatarFallback className="font-mono text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground font-mono">{user.email}</span>
            </div>
            <RiArrowUpDownLine className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    {user.avatar ? (
                      <AvatarImage src={user.avatar} alt={user.name} />
                    ) : null}
                    <AvatarFallback className="font-mono text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground font-mono">{user.email}</span>
                    {user.role && (
                      <span className="mt-0.5 inline-block text-[10px] font-mono font-medium uppercase text-primary">
                        {user.role}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <RiSparklingLine />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/account" />} className="cursor-pointer">
                <RiUserLine className="size-4 text-primary" />
                <span>My Account & Security</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="flex items-center justify-between cursor-pointer py-1.5"
                onClick={() => setTheme(isDark ? "light" : "dark")}
              >
                <div className="flex items-center gap-2">
                  {isDark ? (
                    <RiMoonLine className="size-4 text-primary" />
                  ) : (
                    <RiSunLine className="size-4 text-amber-500" />
                  )}
                  <span className="font-mono text-xs">
                    {isDark ? "Dark Mode" : "Light Mode"}
                  </span>
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  className="pointer-events-none scale-75"
                />
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                disabled={isPending}
                onClick={handleLogout}
              >
                {isPending ? (
                  <>
                    <RiLoader4Line className="size-4 animate-spin" />
                    Signing out...
                  </>
                ) : (
                  <>
                    <RiLogoutBoxLine className="size-4" />
                    Log out
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
