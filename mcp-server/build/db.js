import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env.local") });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, integer, varchar, text, doublePrecision, timestamp, index, } from "drizzle-orm/pg-core";
export const developmentApplications = pgTable("development_applications", {
    id: integer("_id").primaryKey(),
    applicationType: varchar("application_type", { length: 10 }),
    applicationNumber: varchar("application_number", { length: 50 }),
    streetNum: varchar("street_num", { length: 20 }),
    streetName: varchar("street_name", { length: 100 }),
    streetType: varchar("street_type", { length: 20 }),
    streetDirection: varchar("street_direction", { length: 5 }),
    postal: varchar("postal", { length: 10 }),
    dateSubmitted: timestamp("date_submitted", { mode: "string" }),
    status: varchar("status", { length: 50 }),
    x: doublePrecision("x"),
    y: doublePrecision("y"),
    description: text("description"),
    referenceFile: varchar("reference_file", { length: 100 }),
    folderRsn: integer("folder_rsn"),
    wardNumber: integer("ward_number"),
    wardName: varchar("ward_name", { length: 100 }),
    communityMeetingDate: timestamp("community_meeting_date", {
        mode: "string",
    }),
    communityMeetingTime: varchar("community_meeting_time", { length: 50 }),
    communityMeetingLocation: text("community_meeting_location"),
    applicationUrl: text("application_url"),
    contactName: varchar("contact_name", { length: 100 }),
    contactPhone: varchar("contact_phone", { length: 30 }),
    contactEmail: varchar("contact_email", { length: 100 }),
    parentFolderNumber: varchar("parent_folder_number", { length: 50 }),
}, (table) => [
    index("idx_application_type").on(table.applicationType),
    index("idx_status").on(table.status),
    index("idx_street_name").on(table.streetName),
    index("idx_ward_number").on(table.wardNumber),
    index("idx_date_submitted").on(table.dateSubmitted),
    index("idx_application_number").on(table.applicationNumber),
]);
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema: { developmentApplications } });
