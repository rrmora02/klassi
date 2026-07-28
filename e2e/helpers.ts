import { clerk } from "@clerk/testing/playwright";
import type { Page } from "@playwright/test";

// Usuarios de prueba (instancia de DESARROLLO de Clerk, ver e2e/README.md):
// - staff:      ADMIN o RECEPTIONIST de una escuela de prueba
// - parent:     tutor con al menos un alumno vinculado y SIN membresía de escuela
// - instructor: rol INSTRUCTOR con al menos un grupo asignado

export const creds = {
  staff: {
    email:    process.env.E2E_STAFF_EMAIL,
    password: process.env.E2E_STAFF_PASSWORD,
  },
  parent: {
    email:    process.env.E2E_PARENT_EMAIL,
    password: process.env.E2E_PARENT_PASSWORD,
  },
  instructor: {
    email:    process.env.E2E_INSTRUCTOR_EMAIL,
    password: process.env.E2E_INSTRUCTOR_PASSWORD,
  },
} as const;

export type Role = keyof typeof creds;

export function hasCreds(role: Role): boolean {
  return Boolean(creds[role].email && creds[role].password && process.env.CLERK_SECRET_KEY);
}

/** Inicia sesión con el helper oficial de Clerk (sin depender del DOM del widget). */
export async function signIn(page: Page, role: Role) {
  const { email, password } = creds[role];
  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: { strategy: "password", identifier: email!, password: password! },
  });
}

export async function signOut(page: Page) {
  await clerk.signOut({ page });
}
