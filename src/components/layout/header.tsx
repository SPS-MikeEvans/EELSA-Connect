
"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "@/components/layout/user-nav";
import { Search, Folder, Upload } from "lucide-react";
import { useUser } from "@/providers/user-provider";
import { CreateDirectoryDialog } from "../resources/create-directory-dialog";
import { Button } from "../ui/button";
import { UploadResourceDialog } from "../resources/upload-resource-dialog";

export function Header() {
  const pathname = usePathname();
  const { userRole, isLoading: isUserLoading } = useUser();

  const isResourcesPage = pathname.startsWith('/resources');
  const canManage = userRole === 'Admin' || userRole === 'Trainer';

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <SidebarTrigger className="sm:hidden" />
      <div className="flex items-center gap-4">
        <Image src="/EEConnect_Logo.png" alt="EEConnect Logo" width={160} height={40} className="hidden sm:block h-10 w-auto" />
      </div>
      <div className="relative ml-auto flex-1 md:grow-0">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="w-full rounded-lg bg-card pl-8 md:w-[200px] lg:w-[320px]"
        />
      </div>

      <div className="flex items-center gap-2">
        {isResourcesPage && !isUserLoading && canManage && (
            <UploadResourceDialog>
                <Button size="sm" className="bg-accent hover:bg-accent/90">
                    <Upload className="mr-2 size-4" />
                    Upload Resource
                </Button>
            </UploadResourceDialog>
        )}
        <UserNav />
      </div>
    </header>
  );
}
