import { ReactNode } from "react";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  userRole: UserRole;
}

export function RoleGuard({ children, allowedRoles, userRole }: RoleGuardProps) {
  if (!allowedRoles.includes(userRole)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
