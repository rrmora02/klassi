import type { Prisma } from "@prisma/client";

// ─── Tipos de disciplina ──────────────────────────────────────────

export type ExtraFieldType = "text" | "number" | "select" | "date" | "boolean";

export interface ExtraFieldDef {
  key:      string;
  label:    string;
  type:     ExtraFieldType;
  required: boolean;
  options?: string[]; // solo para type = "select"
}

export type ExtraFieldValues = Record<string, string | number | boolean | null>;

// ─── Tipos extendidos de Prisma ───────────────────────────────────

export type StudentWithEnrollments = Prisma.StudentGetPayload<{
  include: {
    enrollments: {
      include: { group: { include: { discipline: true } } }
    }
  }
}>;

export type GroupWithDetails = Prisma.GroupGetPayload<{
  include: {
    discipline: true;
    instructor: { include: { user: true } };
    _count: { select: { enrollments: true } }
  }
}>;

export type PaymentWithStudent = Prisma.PaymentGetPayload<{
  include: { student: { select: { firstName: true; lastName: true } } }
}>;

// ─── Tipos de UI ──────────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  pages: number;
  page:  number;
}

export type ApiStatus = "idle" | "loading" | "success" | "error";
