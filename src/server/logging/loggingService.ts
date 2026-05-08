import { db } from "@/server/db";
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
  async logAudit(input: AuditLogInput) {
    try {
      const result = await db.auditLog.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId || null,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          oldValues: input.oldValues || null,
          newValues: input.newValues || null,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
      console.log("[AUDIT LOG] Created:", { action: input.action, entity: input.entity, entityId: input.entityId, userId: input.userId });
      return result;
    } catch (error) {
      console.error("[AUDIT LOG ERROR]:", error);
      throw error;
    }
  },

  async logError(input: ErrorLogInput) {
    try {
      await db.errorLog.create({
        data: {
          tenantId: input.tenantId,
          errorType: input.errorType,
          message: input.message,
          stack: input.stack,
          context: input.context,
          severity: input.severity || "MEDIUM",
        },
      });
    } catch (error) {
      console.error("Error logging error:", error);
    }
  },

  async logBusinessEvent(input: BusinessEventInput) {
    try {
      const result = await db.businessEvent.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId || null,
          eventType: input.eventType,
          entityType: input.entityType,
          entityId: input.entityId,
          metadata: input.metadata || null,
        },
      });
      console.log("[BUSINESS EVENT]", input.eventType, "for", input.entityType, input.entityId, "by", input.userId || "system");
      return result;
    } catch (error) {
      console.error("[BUSINESS EVENT ERROR]:", error);
    }
  },

  async getAuditLogs(
    tenantId: string,
    filters?: {
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
        include: { user: { select: { name: true, email: true } } },
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
      },
    });
  },
};
