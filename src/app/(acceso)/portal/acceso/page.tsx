"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useSignIn } from "@clerk/nextjs";

// Destino del enlace mágico generado en la ficha del alumno
// (parent-access.service): el ticket de Clerk autentica al tutor
// sin registro ni contraseña y lo deja dentro del portal.

export default function AccesoPage() {
  return (
    <Suspense fallback={null}>
      <AccesoContent />
    </Suspense>
  );
}

function AccesoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  const ticket = searchParams.get("ticket");

  useEffect(() => {
    if (!authLoaded || !signInLoaded || attempted.current) return;

    if (isSignedIn) {
      router.replace("/portal");
      return;
    }
    if (!ticket) {
      setError("El enlace no es válido. Pide a tu escuela que te genere uno nuevo.");
      return;
    }

    attempted.current = true;
    signIn
      .create({ strategy: "ticket", ticket })
      .then(async (result) => {
        if (result.status === "complete" && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          router.replace("/portal");
        } else {
          setError("No se pudo completar el acceso. Pide a tu escuela un enlace nuevo.");
        }
      })
      .catch(() => {
        setError("Este enlace ya fue usado o expiró. Pide a tu escuela que te genere uno nuevo.");
      });
  }, [authLoaded, signInLoaded, isSignedIn, ticket, signIn, setActive, router]);

  return (
    <div style={{ minHeight: "60dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center", padding: "0 24px" }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "#1D3557", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800 }}>
        K
      </div>
      {error ? (
        <>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>No pudimos abrir tu acceso</p>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, maxWidth: 320, lineHeight: 1.5 }}>{error}</p>
        </>
      ) : (
        <>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Abriendo tu portal…</p>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Un momento, estamos preparando todo.</p>
        </>
      )}
    </div>
  );
}
