import { createTRPCRouter } from "@/server/api/trpc";
import { studentsRouter }       from "./routers/students";
import { disciplinesRouter }    from "./routers/disciplines";
import { paymentsRouter }       from "./routers/payments";
import { groupsRouter }         from "./routers/groups";
import { instructorsRouter }    from "./routers/instructors";
import { attendanceRouter }     from "./routers/attendance";
import { enrollmentsRouter }    from "./routers/enrollments";
import { tenantsRouter }        from "./routers/tenants";
import { teamRouter }           from "./routers/team";
import { announcementsRouter }  from "./routers/announcements";
import { reportsRouter }        from "./routers/reports";
import { notificationsRouter }  from "./routers/notifications";
import { portalRouter }         from "./routers/portal";

export const appRouter = createTRPCRouter({
  students:      studentsRouter,
  disciplines:   disciplinesRouter,
  payments:      paymentsRouter,
  groups:        groupsRouter,
  instructors:   instructorsRouter,
  attendance:    attendanceRouter,
  enrollments:   enrollmentsRouter,
  tenants:       tenantsRouter,
  team:          teamRouter,
  announcements: announcementsRouter,
  reports:       reportsRouter,
  notifications: notificationsRouter,
  portal:        portalRouter,
});

export type AppRouter = typeof appRouter;
