import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { developmentApplications } from "../lib/db/schema";

const BATCH_SIZE = 500;

interface CsvRow {
  _id: string;
  APPLICATION_TYPE: string;
  "APPLICATION#": string;
  STREET_NUM: string;
  STREET_NAME: string;
  STREET_TYPE: string;
  STREET_DIRECTION: string;
  POSTAL: string;
  DATE_SUBMITTED: string;
  STATUS: string;
  X: string;
  Y: string;
  DESCRIPTION: string;
  "REFERENCE_FILE#": string;
  FOLDERRSN: string;
  WARD_NUMBER: string;
  WARD_NAME: string;
  COMMUNITY_MEETING_DATE: string;
  COMMUNITY_MEETING_TIME: string;
  COMMUNITY_MEETING_LOCATION: string;
  APPLICATION_URL: string;
  CONTACT_NAME: string;
  CONTACT_PHONE: string;
  CONTACT_EMAIL: string;
  PARENT_FOLDER_NUMBER: string;
}

function parseDate(value: string): string | null {
  if (!value || value.trim() === "") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseFloat(value: string): number | null {
  if (!value || value.trim() === "") return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function parseInt(value: string): number | null {
  if (!value || value.trim() === "") return null;
  const n = Number(value);
  return isNaN(n) ? null : Math.round(n);
}

function strOrNull(value: string): string | null {
  if (!value || value.trim() === "") return null;
  return value.trim();
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log("Reading CSV...");
  const csv = readFileSync("./data/development-applications.csv", "utf-8");

  console.log("Parsing CSV...");
  const rows: CsvRow[] = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  console.log(`Parsed ${rows.length} rows`);

  const mapped = rows.map((row) => ({
    id: parseInt(row._id)!,
    applicationType: strOrNull(row.APPLICATION_TYPE),
    applicationNumber: strOrNull(row["APPLICATION#"]),
    streetNum: strOrNull(row.STREET_NUM),
    streetName: strOrNull(row.STREET_NAME),
    streetType: strOrNull(row.STREET_TYPE),
    streetDirection: strOrNull(row.STREET_DIRECTION),
    postal: strOrNull(row.POSTAL),
    dateSubmitted: parseDate(row.DATE_SUBMITTED),
    status: strOrNull(row.STATUS),
    x: parseFloat(row.X),
    y: parseFloat(row.Y),
    description: strOrNull(row.DESCRIPTION),
    referenceFile: strOrNull(row["REFERENCE_FILE#"]),
    folderRsn: parseInt(row.FOLDERRSN),
    wardNumber: parseInt(row.WARD_NUMBER),
    wardName: strOrNull(row.WARD_NAME),
    communityMeetingDate: parseDate(row.COMMUNITY_MEETING_DATE),
    communityMeetingTime: strOrNull(row.COMMUNITY_MEETING_TIME),
    communityMeetingLocation: strOrNull(row.COMMUNITY_MEETING_LOCATION),
    applicationUrl: strOrNull(row.APPLICATION_URL),
    contactName: strOrNull(row.CONTACT_NAME),
    contactPhone: strOrNull(row.CONTACT_PHONE),
    contactEmail: strOrNull(row.CONTACT_EMAIL),
    parentFolderNumber: strOrNull(row.PARENT_FOLDER_NUMBER),
  }));

  console.log(`Inserting ${mapped.length} rows in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const batch = mapped.slice(i, i + BATCH_SIZE);
    await db
      .insert(developmentApplications)
      .values(batch)
      .onConflictDoNothing();
    console.log(
      `  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(mapped.length / BATCH_SIZE)} done (${Math.min(i + BATCH_SIZE, mapped.length)}/${mapped.length})`
    );
  }

  console.log("Seeding complete!");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
