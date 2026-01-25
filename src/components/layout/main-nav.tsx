
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useUser } from "@/providers/user-provider";
import { auth } from "@/lib/firebase";

import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarContent
} from "@/components/ui/sidebar";
import { Icon } from "@/components/icons/icon";
import {
  BookOpen,
  Award,
  MessageSquare,
  Shield,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  GraduationCap,
  Users,
  Building,
  BookMarked,
} from "lucide-react";
import { Separator } from "../ui/separator";
import type { UserRole } from "@/providers/user-provider";


const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resources", label: "Resource Center", icon: BookOpen },
  { href: "/trainings", label: "Training Courses", icon: GraduationCap },
  { href: "/supervision-groups", label: "Supervision Groups", icon: Users },
];

// Updated 'Certificates' roles to include Trainer and LineManager
const elsaMenuItems: { href: string, label: string, icon: any, roles: UserRole[] }[] = [
    { href: "/journal", label: "My Journal", icon: BookMarked, roles: ['ELSA'] },
    { href: "/certificates", label: "Certificates", icon: Award, roles: ['ELSA', 'Trainee', 'Trainer', 'LineManager'] },
    { href: "/messages", label: "Messaging", icon: MessageSquare, roles: ['ELSA', 'Trainee', 'Trainer', 'Admin', 'LineManager'] },
]

const adminMenuItem = { href: "/admin", label: "Admin", icon: Shield, role: "Admin" };
const managerMenuItem = { href: "/manager/dashboard", label: "Manager", icon: Building, role: "LineManager" };


export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userRole, userDetails, isLoading: isUserLoading } = useUser();

  const handleLogout = () => {
    auth.signOut();
    router.push("/login");
  };

  const hasRole = (role: UserRole) => {
      if (!userRole || !userDetails) return false;
      if (userRole === 'Admin') return true; // Admins can see everything
      return userRole === role || userDetails.additionalRoles?.includes(role);
  }

  const canSee = (roles: UserRole[]) => {
      if (!roles || roles.length === 0) return true; // No specific role required
      if (hasRole('Admin')) return true;
      return roles.some(role => hasRole(role));
  }


  return (
    <>
      <SidebarHeader>
        <div className="p-2 flex justify-center group-data-[collapsible=icon]:p-0">
          <Icon className="size-full max-w-24 transition-all group-data-[collapsible=icon]:size-10" src="/EEConnect_Logo.png" alt="EEConnect Logo" />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} tooltip={item.label} className="font-headline">
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          {!isUserLoading && (
              <>
                <Separator className="my-2" />
                {elsaMenuItems.filter(item => canSee(item.roles)).map((item) => (
                    <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} tooltip={item.label} className="font-headline">
                            <Link href={item.href}>
                                <item.icon />
                                <span>{item.label}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
              </>
          )}

          {!isUserLoading && hasRole('Admin') && (
             <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith(adminMenuItem.href)} tooltip={adminMenuItem.label} className="font-headline">
                  <Link href={adminMenuItem.href}>
                    <adminMenuItem.icon />
                    <span>{adminMenuItem.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
          )}
           {!isUserLoading && hasRole('LineManager') && (
             <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith(managerMenuItem.href)} tooltip={managerMenuItem.label} className="font-headline">
                  <Link href={managerMenuItem.href}>
                    <managerMenuItem.icon />
                    <span>{managerMenuItem.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <Separator className="my-2 bg-sidebar-border" />
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Support" className="font-headline">
                    <Link href="/support">
                        <LifeBuoy />
                        <span>Support</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton tooltip="Logout" onClick={handleLogout} className="font-headline">
                    <LogOut />
                    <span>Logout</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
