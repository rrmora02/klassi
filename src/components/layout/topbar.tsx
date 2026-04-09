"use client";

import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";

export function TopBar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <OrganizationSwitcher
          hidePersonal
          afterSelectOrganizationUrl="/dashboard"
          afterCreateOrganizationUrl="/onboarding"
          appearance={{
            elements: {
              rootBox:             "flex items-center",
              organizationSwitcherTrigger: "rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50",
            },
          }}
        />
      </div>
      <UserButton afterSignOutUrl="/" />
    </header>
  );
}
