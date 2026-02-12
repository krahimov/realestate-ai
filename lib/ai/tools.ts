import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { developmentApplications } from "@/lib/db/schema";
import { and, eq, ilike, gte, lte, sql, count } from "drizzle-orm";

export const searchApplications = tool({
  description:
    "Search development applications by street name, street number, application type, status, ward number, or date range. Returns up to 50 matching results. Use this for location-based or filtered searches.",
  inputSchema: z.object({
    streetName: z
      .string()
      .optional()
      .describe("Street name to search (case-insensitive partial match)"),
    streetNum: z.string().optional().describe("Street number"),
    applicationType: z
      .enum(["OZ", "SA", "CD", "SB", "PL"])
      .optional()
      .describe(
        "Application type: OZ=Zoning, SA=Site Plan, CD=Condominium, SB=Subdivision, PL=Planning"
      ),
    status: z
      .string()
      .optional()
      .describe(
        "Application status (e.g. Under Review, Closed, OMB Appeal, NOAC Issued, Council Approved)"
      ),
    wardNumber: z.number().optional().describe("Ward number (integer)"),
    dateFrom: z
      .string()
      .optional()
      .describe("Start date for date_submitted filter (ISO format)"),
    dateTo: z
      .string()
      .optional()
      .describe("End date for date_submitted filter (ISO format)"),
  }),
  execute: async ({
    streetName,
    streetNum,
    applicationType,
    status,
    wardNumber,
    dateFrom,
    dateTo,
  }) => {
    const conditions = [];

    if (streetName) {
      conditions.push(
        ilike(developmentApplications.streetName, `%${streetName}%`)
      );
    }
    if (streetNum) {
      conditions.push(eq(developmentApplications.streetNum, streetNum));
    }
    if (applicationType) {
      conditions.push(
        eq(developmentApplications.applicationType, applicationType)
      );
    }
    if (status) {
      conditions.push(ilike(developmentApplications.status, `%${status}%`));
    }
    if (wardNumber) {
      conditions.push(eq(developmentApplications.wardNumber, wardNumber));
    }
    if (dateFrom) {
      conditions.push(
        gte(developmentApplications.dateSubmitted, dateFrom)
      );
    }
    if (dateTo) {
      conditions.push(
        lte(developmentApplications.dateSubmitted, dateTo)
      );
    }

    const results = await db
      .select({
        id: developmentApplications.id,
        applicationType: developmentApplications.applicationType,
        applicationNumber: developmentApplications.applicationNumber,
        streetNum: developmentApplications.streetNum,
        streetName: developmentApplications.streetName,
        streetType: developmentApplications.streetType,
        streetDirection: developmentApplications.streetDirection,
        dateSubmitted: developmentApplications.dateSubmitted,
        status: developmentApplications.status,
        description: developmentApplications.description,
        wardNumber: developmentApplications.wardNumber,
        wardName: developmentApplications.wardName,
      })
      .from(developmentApplications)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(50);

    return { count: results.length, results };
  },
});

export const getApplicationDetails = tool({
  description:
    "Get full details of a specific development application by its database ID or application number. Returns all fields including contact info, meeting details, and URLs.",
  inputSchema: z.object({
    id: z.number().optional().describe("Database ID (_id) of the application"),
    applicationNumber: z
      .string()
      .optional()
      .describe("Application number (e.g. '25 138110')"),
  }),
  execute: async ({ id, applicationNumber }) => {
    const conditions = [];
    if (id) {
      conditions.push(eq(developmentApplications.id, id));
    }
    if (applicationNumber) {
      conditions.push(
        eq(developmentApplications.applicationNumber, applicationNumber)
      );
    }

    if (conditions.length === 0) {
      return { error: "Please provide either an id or applicationNumber" };
    }

    const results = await db
      .select()
      .from(developmentApplications)
      .where(and(...conditions))
      .limit(1);

    if (results.length === 0) {
      return { error: "Application not found" };
    }

    return results[0];
  },
});

export const getApplicationStats = tool({
  description:
    "Get aggregate statistics about development applications. Groups and counts applications by type, status, or ward. Use this for 'how many?' questions or summary/overview requests.",
  inputSchema: z.object({
    groupBy: z
      .enum(["type", "status", "ward"])
      .describe("Field to group by: type, status, or ward"),
    applicationType: z
      .enum(["OZ", "SA", "CD", "SB", "PL"])
      .optional()
      .describe("Filter by application type before grouping"),
    status: z
      .string()
      .optional()
      .describe("Filter by status before grouping"),
    wardNumber: z
      .number()
      .optional()
      .describe("Filter by ward number before grouping"),
  }),
  execute: async ({ groupBy, applicationType, status, wardNumber }) => {
    const conditions = [];
    if (applicationType) {
      conditions.push(
        eq(developmentApplications.applicationType, applicationType)
      );
    }
    if (status) {
      conditions.push(ilike(developmentApplications.status, `%${status}%`));
    }
    if (wardNumber) {
      conditions.push(eq(developmentApplications.wardNumber, wardNumber));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const groupColumnMap = {
      type: developmentApplications.applicationType,
      status: developmentApplications.status,
      ward: developmentApplications.wardNumber,
    } as const;

    const groupColumn = groupColumnMap[groupBy];

    const results = await db
      .select({
        group: groupColumn,
        count: count(),
      })
      .from(developmentApplications)
      .where(whereClause)
      .groupBy(groupColumn)
      .orderBy(sql`count(*) desc`);

    const total = results.reduce((sum, r) => sum + r.count, 0);
    return { total, breakdown: results };
  },
});

export const searchByDescription = tool({
  description:
    "Search development applications by keywords in their description text. Use for queries like 'find residential towers', 'condo projects', 'mixed-use developments', etc.",
  inputSchema: z.object({
    keyword: z
      .string()
      .describe("Keyword or phrase to search in application descriptions"),
    applicationType: z
      .enum(["OZ", "SA", "CD", "SB", "PL"])
      .optional()
      .describe("Optionally filter by application type"),
    status: z
      .string()
      .optional()
      .describe("Optionally filter by status"),
  }),
  execute: async ({ keyword, applicationType, status }) => {
    const conditions = [
      ilike(developmentApplications.description, `%${keyword}%`),
    ];

    if (applicationType) {
      conditions.push(
        eq(developmentApplications.applicationType, applicationType)
      );
    }
    if (status) {
      conditions.push(ilike(developmentApplications.status, `%${status}%`));
    }

    const results = await db
      .select({
        id: developmentApplications.id,
        applicationType: developmentApplications.applicationType,
        applicationNumber: developmentApplications.applicationNumber,
        streetNum: developmentApplications.streetNum,
        streetName: developmentApplications.streetName,
        streetType: developmentApplications.streetType,
        dateSubmitted: developmentApplications.dateSubmitted,
        status: developmentApplications.status,
        description: developmentApplications.description,
        wardNumber: developmentApplications.wardNumber,
        wardName: developmentApplications.wardName,
      })
      .from(developmentApplications)
      .where(and(...conditions))
      .limit(50);

    return { count: results.length, results };
  },
});

export const tools = {
  searchApplications,
  getApplicationDetails,
  getApplicationStats,
  searchByDescription,
};
