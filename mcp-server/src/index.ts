#!/usr/bin/env node

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env.local") });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { and, eq, ilike, gte, lte, sql, count } from "drizzle-orm";
import { db, developmentApplications } from "./db.js";

const server = new McpServer({
  name: "toronto-dev-apps",
  version: "1.0.0",
});

// Tool 1: Search applications
server.tool(
  "search_applications",
  "Search Toronto development applications by street name, street number, application type, status, ward number, or date range. Returns up to 50 matching results.",
  {
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
    wardNumber: z.number().optional().describe("Ward number (integer 1-25)"),
    dateFrom: z
      .string()
      .optional()
      .describe("Start date for date_submitted filter (ISO format)"),
    dateTo: z
      .string()
      .optional()
      .describe("End date for date_submitted filter (ISO format)"),
  },
  async ({
    streetName,
    streetNum,
    applicationType,
    status,
    wardNumber,
    dateFrom,
    dateTo,
  }) => {
    const conditions = [];

    if (streetName)
      conditions.push(
        ilike(developmentApplications.streetName, `%${streetName}%`)
      );
    if (streetNum)
      conditions.push(eq(developmentApplications.streetNum, streetNum));
    if (applicationType)
      conditions.push(
        eq(developmentApplications.applicationType, applicationType)
      );
    if (status)
      conditions.push(ilike(developmentApplications.status, `%${status}%`));
    if (wardNumber)
      conditions.push(eq(developmentApplications.wardNumber, wardNumber));
    if (dateFrom)
      conditions.push(gte(developmentApplications.dateSubmitted, dateFrom));
    if (dateTo)
      conditions.push(lte(developmentApplications.dateSubmitted, dateTo));

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

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ count: results.length, results }, null, 2),
        },
      ],
    };
  }
);

// Tool 2: Get application details
server.tool(
  "get_application_details",
  "Get full details of a specific Toronto development application by its database ID or application number. Returns all fields including contact info, meeting details, and URLs.",
  {
    id: z.number().optional().describe("Database ID (_id) of the application"),
    applicationNumber: z
      .string()
      .optional()
      .describe("Application number (e.g. '25 138110')"),
  },
  async ({ id, applicationNumber }) => {
    const conditions = [];
    if (id) conditions.push(eq(developmentApplications.id, id));
    if (applicationNumber)
      conditions.push(
        eq(developmentApplications.applicationNumber, applicationNumber)
      );

    if (conditions.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: Please provide either an id or applicationNumber",
          },
        ],
      };
    }

    const results = await db
      .select()
      .from(developmentApplications)
      .where(and(...conditions))
      .limit(1);

    if (results.length === 0) {
      return {
        content: [
          { type: "text" as const, text: "Application not found" },
        ],
      };
    }

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(results[0], null, 2) },
      ],
    };
  }
);

// Tool 3: Get application stats
server.tool(
  "get_application_stats",
  "Get aggregate statistics about Toronto development applications. Groups and counts applications by type, status, or ward. Use for 'how many?' questions or summary requests.",
  {
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
  },
  async ({ groupBy, applicationType, status, wardNumber }) => {
    const conditions = [];
    if (applicationType)
      conditions.push(
        eq(developmentApplications.applicationType, applicationType)
      );
    if (status)
      conditions.push(ilike(developmentApplications.status, `%${status}%`));
    if (wardNumber)
      conditions.push(eq(developmentApplications.wardNumber, wardNumber));

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

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ total, breakdown: results }, null, 2),
        },
      ],
    };
  }
);

// Tool 4: Search by description
server.tool(
  "search_by_description",
  "Search Toronto development applications by keywords in their description text. Use for queries like 'find residential towers', 'condo projects', 'mixed-use developments'.",
  {
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
  },
  async ({ keyword, applicationType, status }) => {
    const conditions = [
      ilike(developmentApplications.description, `%${keyword}%`),
    ];

    if (applicationType)
      conditions.push(
        eq(developmentApplications.applicationType, applicationType)
      );
    if (status)
      conditions.push(ilike(developmentApplications.status, `%${status}%`));

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

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ count: results.length, results }, null, 2),
        },
      ],
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Toronto Dev Apps MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
