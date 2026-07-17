"use client";

import { ClerkProvider as ClerkProviderBase } from "@clerk/nextjs";
// Import por subpath: solo el locale español entra al bundle. Un require del
// paquete raíz arrastra los ~30 idiomas (cientos de KB) a cada página.
import { esES } from "@clerk/localizations/es-ES";
import { ReactNode, ComponentProps } from "react";

// Los tipos de @clerk/localizations 4.x y @clerk/nextjs 5.x difieren en
// las cadenas parametrizadas; el shape en runtime es compatible.
const localization = esES as ComponentProps<typeof ClerkProviderBase>["localization"];

export function ClerkProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProviderBase localization={localization}>
      {children}
    </ClerkProviderBase>
  );
}
