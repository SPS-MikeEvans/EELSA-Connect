
"use client";

import { RegisterForm } from "@/components/auth/register-form";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
