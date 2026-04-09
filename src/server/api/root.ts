import { createTRPCRouter } from "@/server/api/trpc";
import { studentsRouter }   from "./routers/students";
import { disciplinesRouter } from "./routers/disciplines";
import { paymentsRouter }   from "./routers/payments";

/**
 * Raíz del router de tRPC.
 * Agrega aquí los nuevos routers a medida que crecen los módulos.
 */
export const appRouter = createTRPCRouter({
  students:    studentsRouter,
  disciplines: disciplinesRouter,
  payments:    paymentsRouter,
  // próximos:
  // groups:       groupsRouter,
  // instructors:  instructorsRouter,
  // attendance:   attendanceRouter,
  // announcements: announcementsRouter,
  // reports:      reportsRouter,
});

export type AppRouter = typeof appRouter;
