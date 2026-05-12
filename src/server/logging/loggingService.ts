import { db } from "@/server/db";
import { createAuditDescription } from "./auditDescriptions";
import { getUserByClerkId } from "@/server/cache/userAuthCache";
import { batchLoggingQueue } from "./batchLogger";
import type { AuditAction, LogSeverity, BusinessEventType } from "@prisma/client";

interface AuditLogInput {
  tenantId: string | null;
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

interface ErrorLogInput {
  tenantId?: string | null;
  errorType: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  severity?: LogSeverity;
}

interface BusinessEventInput {
  tenantId: string;
  userId?: string | null;
  eventType: BusinessEventType;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
}

export const loggingService = {
  async logAudit(input: AuditLogInput, opts?: { batch?: boolean }) {
    try {
      const description = createAuditDescription(
        input.action,
        input.entity,
        input.oldValues,
        input.newValues
      );

      let validUserId: string | null = null;
      if (input.userId) {
        const userExists = await getUserByClerkId(input.userId, db);
        if (userExists) {
          validUserId = userExists.id;
        }
      }

      const auditData = {
        tenantId: input.tenantId,
        userId: validUserId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        oldValues: (input.oldValues || null) as any,
        newValues: (input.newValues || null) as any,
        description,
        ipAddress: input.ipAddress || undefined,
        userAgent: input.userAgent || undefined,
      };

      // Use batch mode if specified
      if (opts?.batch) {
        await batchLoggingQueue.enqueue({ type: "audit", data: auditData });
        console.log("[AUDIT LOG] (batched)", description, `by ${validUserId || "system"}`);
        return { id: "", createdAt: new Date(), updatedAt: new Date(), ...auditData };
      }

      // Synchronous mode (default for backwards compatibility)
      const result = await db.auditLog.create({ data: auditData as any });
      console.log("[AUDIT LOG]", description, `by ${validUserId || "system"}`);
      return result;
    } catch (error) {
      console.error("[AUDIT LOG ERROR]:", error);
      throw error;
    }
  },

  async logError(input: ErrorLogInput, opts?: { batch?: boolean }) {
    try {
      const errorData = {
        tenantId: input.tenantId || null,
        errorType: input.errorType,
        message: input.message,
        stack: input.stack,
        context: input.context,
        severity: input.severity || "MEDIUM" as LogSeverity,
      };

      // Use batch mode if specified (but keep errors mostly synchronous for debugging)
      if (opts?.batch) {
        await batchLoggingQueue.enqueue({ type: "error", data: errorData });
        console.error("[ERROR LOG] (batched)", {
          type: input.errorType,
          message: input.message,
          severity: input.severity,
        });
        return { id: "", createdAt: new Date(), updatedAt: new Date(), resolved: false, resolvedAt: null, resolvedBy: null, ...errorData };
      }

      // Synchronous mode (default - errors should be logged immediately)
      const result = await db.errorLog.create({ data: errorData });
      console.error("[ERROR LOG]", {
        type: input.errorType,
        message: input.message,
        severity: input.severity,
        context: input.context,
      });
      return result;
    } catch (error) {
      console.error("[ERROR LOGGING FAILED]:", error);
    }
  },

  async logBusinessEvent(input: BusinessEventInput, opts?: { batch?: boolean }) {
    try {
      let validUserId: string | null = null;
      let userName = "Sistema";

      if (input.userId) {
        const userExists = await getUserByClerkId(input.userId, db);
        if (userExists) {
          validUserId = userExists.id;
          userName = userExists.name || userExists.email || "Sistema";
        }
      }

      const eventData = {
        tenantId: input.tenantId,
        userId: validUserId,
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: {
          ...input.metadata,
          userName,
        },
      };

      // Use batch mode if specified
      if (opts?.batch) {
        await batchLoggingQueue.enqueue({ type: "business", data: eventData });
        console.log("[BUSINESS EVENT] (batched)", input.eventType, "for", input.entityType, input.entityId, "by", userName);
        return { id: "", createdAt: new Date(), updatedAt: new Date(), ...eventData };
      }

      // Synchronous mode (default for backwards compatibility)
      const result = await db.businessEvent.create({ data: eventData });
      console.log("[BUSINESS EVENT]", input.eventType, "for", input.entityType, input.entityId, "by", userName);
      return result;
    } catch (error) {
      console.error("[BUSINESS EVENT ERROR]:", error);
    }
  },

  async getAuditLogs(
    tenantId: string,
    filters?: {
      userId?: string;
      entity?: string;
      action?: AuditAction;
      from?: Date;
      to?: Date;
      page?: number;
      pageSize?: number;
    }
  ) {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const where = {
      tenantId,
      ...(filters?.userId && { userId: filters.userId }),
      ...(filters?.entity && { entity: filters.entity }),
      ...(filters?.action && { action: filters.action }),
      ...(filters?.from || filters?.to
        ? {
            createdAt: {
              ...(filters?.from && { gte: filters.from }),
              ...(filters?.to && { lte: filters.to }),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      db.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      pages: Math.ceil(total / pageSize),
    };
  },

  async getErrorLogs(
    tenantId: string | null,
    filters?: {
      severity?: LogSeverity;
      resolved?: boolean;
      from?: Date;
      to?: Date;
      page?: number;
      pageSize?: number;
    }
  ) {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const where = {
      ...(tenantId && { tenantId }),
      ...(filters?.severity && { severity: filters.severity }),
      ...(filters?.resolved !== undefined && { resolved: filters.resolved }),
      ...(filters?.from || filters?.to
        ? {
            createdAt: {
              ...(filters?.from && { gte: filters.from }),
              ...(filters?.to && { lte: filters.to }),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      db.errorLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      db.errorLog.count({ where }),
    ]);

    return {
      logs,
      total,
      pages: Math.ceil(total / pageSize),
    };
  },

  async getBusinessEvents(
    tenantId: string,
    filters?: {
      eventType?: BusinessEventType;
      entityType?: string;
      from?: Date;
      to?: Date;
      page?: number;
      pageSize?: number;
    }
  ) {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const where = {
      tenantId,
      ...(filters?.eventType && { eventType: filters.eventType }),
      ...(filters?.entityType && { entityType: filters.entityType }),
      ...(filters?.from || filters?.to
        ? {
            createdAt: {
              ...(filters?.from && { gte: filters.from }),
              ...(filters?.to && { lte: filters.to }),
            },
          }
        : {}),
    };

    const [events, total] = await Promise.all([
      db.businessEvent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      db.businessEvent.count({ where }),
    ]);

    return {
      events,
      total,
      pages: Math.ceil(total / pageSize),
    };
  },

  async resolveErrorLog(errorId: string, resolvedBy: string) {
    return db.errorLog.update({
      where: { id: errorId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      } as any,
    });
  },
};
