"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Tenant } from "@prisma/client";
import { SetupWizard } from "./setup-wizard";

export function SetupWizardWrapper({
  tenant,
  isAdmin,
}: {
  tenant: Tenant;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(
    !tenant.setupCompleted && isAdmin
  );

  if (!isOpen) return null;

  return (
    <SetupWizard
      tenant={tenant}
      onComplete={() => {
        setIsOpen(false);
        router.refresh();
      }}
    />
  );
}
