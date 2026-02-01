
"use client";

import { useUser } from "@/providers/user-provider";
import { Loader2 } from "lucide-react";
import ELSADashboard from "./elsa-dashboard";
import TraineeDashboard from "./trainee-dashboard";
import TrainerDashboard from "./trainer-dashboard";
import AdminDashboard from "./admin-dashboard";
import DefaultDashboard from "./default-dashboard";
import LineManagerDashboard from "./line-manager-dashboard";

export default function DashboardRouterPage() {
  const { userRole, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  switch (userRole) {
    case "ELSA":
      return <ELSADashboard />;
    case "Trainee":
      return <TraineeDashboard />;
    case "Trainer":
      return <TrainerDashboard />;
    case "Admin":
      return <AdminDashboard />;
    case "LineManager":
      return <LineManagerDashboard />;
    default:
      // Includes 'User' and null/undefined roles
      return <DefaultDashboard />;
  }
}
