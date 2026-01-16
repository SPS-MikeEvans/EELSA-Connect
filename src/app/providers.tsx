
"use client";

import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/providers/user-provider";
import type { ReactNode } from "react";
import { FirebaseErrorListener } from "@/components/layout/firebase-error-listener";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <FirebaseErrorListener />
      {children}
      <Toaster />
    </UserProvider>
  );
}
