"use client";

import { ClerkProvider as ClerkProviderBase } from "@clerk/nextjs";
import { ReactNode } from "react";

let localization: any = undefined;

try {
  const mod = require("@clerk/localizations");
  if (mod && mod.esES) {
    localization = mod.esES;
  }
} catch (e) {
  // @clerk/localizations not available, continue without it
}

export function ClerkProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProviderBase localization={localization}>
      {children}
    </ClerkProviderBase>
  );
}
