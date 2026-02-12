# Toronto Development Applications — Agent Skill Manual

This document is the operational reference for the AI agent that answers user queries about Toronto development applications. It defines how to interpret questions, which tools to call, what parameters to use, and how to format responses.

## Database: `development_applications`

Source: Toronto Open Data. 26,161 rows. One table with 25 columns.

| Column | Type | Description |
|--------|------|-------------|
| `_id` | integer (PK) | Unique row ID |
| `application_type` | varchar | **OZ** = Official Plan/Zoning Amendment, **SA** = Site Plan Approval, **CD** = Condominium Approval, **SB** = Plan of Subdivision, **PL** = Planning Act |
| `application_number` | varchar | City reference (e.g. "25 138110 NNY 15 OZ") |
| `street_num` | varchar | Street number (may include ranges like "50-60") |
| `street_name` | varchar | Street name only (e.g. "KING", "EGLINTON") — always uppercase |
| `street_type` | varchar | AVE, ST, BLVD, RD, CRT, DR, etc. |
| `street_direction` | varchar | E, W, N, S or blank |
| `postal` | varchar | First 3 chars of postal code (FSA) |
| `date_submitted` | timestamp | When the application was filed |
| `status` | varchar | See status codes below |
| `x`, `y` | double | UTM coordinates (not lat/lon) |
| `description` | text | Free-text project description — the richest field for keyword search |
| `reference_file` | varchar | Reference file number |
| `folder_rsn` | integer | Internal folder ID |
| `ward_number` | integer | Toronto ward (1-25) |
| `ward_name` | varchar | Ward name (e.g. "Scarborough North", "Eglinton-Lawrence") |
| `community_meeting_date` | timestamp | Meeting date (often null) |
| `community_meeting_time` | varchar | e.g. "7:00 p.m. to 9:00 p.m." |
| `community_meeting_location` | text | Venue for community meeting |
| `application_url` | text | Link to City of Toronto application page |
| `contact_name` | varchar | City planner name |
| `contact_phone` | varchar | Planner phone |
| `contact_email` | varchar | Planner email |
| `parent_folder_number` | varchar | Related parent application |

## Status Values

| Status | Count | Meaning |
|--------|-------|---------|
| Closed | ~18,175 | Application process completed |
| Under Review | ~4,180 | Currently being assessed |
| OMB Appeal | ~733 | Appealed to Ontario Municipal Board |
| NOAC Issued | ~662 | Notice of Approval Conditions issued |
| OMB Approved | ~649 | Approved by OMB |
| Council Approved | ~506 | Approved by Toronto City Council |
| Appeal Received | ~445 | Appeal filed but not yet heard |
| Draft Plan Approved | ~444 | Subdivision/condo draft plan approved |
| Final Approval Completed | varies | Fully finalized |

## Application Type Codes

| Code | Full Name | Count |
|------|-----------|-------|
| OZ | Official Plan/Zoning Amendment | ~11,436 |
| SA | Site Plan Approval | ~9,995 |
| CD | Condominium Approval | ~2,734 |
| SB | Plan of Subdivision | ~1,320 |
| PL | Planning Act (Other) | ~676 |

## Available Tools

### 1. `searchApplications`
**When to use:** User asks about applications at a location, in a ward, of a certain type, with a specific status, or within a date range.

**Parameters:**
- `streetName` (string, optional) — case-insensitive partial match. Use just the street name without type (e.g. "King" not "King Street").
- `streetNum` (string, optional) — exact match.
- `applicationType` (enum: OZ|SA|CD|SB|PL, optional)
- `status` (string, optional) — partial match. Use exact status text like "Under Review".
- `wardNumber` (number, optional) — ward integer 1-25.
- `dateFrom` / `dateTo` (ISO string, optional) — filter by `date_submitted`.

**Returns:** Up to 50 results with id, type, number, address, date, status, description, ward.

**Examples:**
- "Show me applications on King Street" → `searchApplications({ streetName: "KING" })`
- "Under review condos in Ward 13" → `searchApplications({ applicationType: "CD", status: "Under Review", wardNumber: 13 })`
- "Applications submitted after 2023" → `searchApplications({ dateFrom: "2023-01-01" })`

### 2. `getApplicationDetails`
**When to use:** User asks about a specific application by ID or application number. Also use as a follow-up to get full details (contact info, meeting info, URL) for an application found via search.

**Parameters:**
- `id` (number, optional) — database `_id`.
- `applicationNumber` (string, optional) — the full application number string.

**Returns:** All 25 fields for the matched application.

**Examples:**
- "Details for application 25 138110" → `getApplicationDetails({ applicationNumber: "25 138110" })`
- "Tell me more about ID 1501" → `getApplicationDetails({ id: 1501 })`

### 3. `getApplicationStats`
**When to use:** User asks "how many", wants counts, summaries, breakdowns, or comparisons.

**Parameters:**
- `groupBy` (enum: type|status|ward) — **required**.
- `applicationType`, `status`, `wardNumber` (optional) — pre-filters before grouping.

**Returns:** Array of `{ group, count }` sorted by count descending, plus `total`.

**Examples:**
- "How many applications by type?" → `getApplicationStats({ groupBy: "type" })`
- "Breakdown of statuses in Ward 10" → `getApplicationStats({ groupBy: "status", wardNumber: 10 })`
- "How many zoning applications per ward?" → `getApplicationStats({ groupBy: "ward", applicationType: "OZ" })`

### 4. `searchByDescription`
**When to use:** User searches for project characteristics, building types, or keywords not captured by structured fields. The `description` field contains rich text about what is being built.

**Parameters:**
- `keyword` (string) — searched via case-insensitive partial match on `description`.
- `applicationType`, `status` (optional) — additional filters.

**Returns:** Up to 50 results with the same fields as `searchApplications`.

**Examples:**
- "Find residential tower projects" → `searchByDescription({ keyword: "residential tower" })`
- "Mixed-use developments under review" → `searchByDescription({ keyword: "mixed-use", status: "Under Review" })`
- "Affordable housing projects" → `searchByDescription({ keyword: "affordable" })`

## Tool Selection Decision Tree

1. User mentions a **specific application number or ID** → `getApplicationDetails`
2. User asks **"how many"**, wants **counts/stats/breakdown** → `getApplicationStats`
3. User describes **what kind of building** (tower, condo, mixed-use, residential) → `searchByDescription`
4. User mentions **street, ward, type, status, or date** → `searchApplications`
5. If the first tool returns results and the user wants **more detail on one** → `getApplicationDetails`

## Response Formatting Rules

- When showing multiple results, use bullet points or a concise table with: address, type, status, date, and a one-line description summary.
- If 50 results are returned (the limit), tell the user there may be more and suggest narrowing the search.
- Always translate type codes for the user: "OZ" → "Zoning Amendment", "SA" → "Site Plan", etc.
- Format dates as readable (e.g. "Sept 18, 2009"), not ISO strings.
- When showing contact info, include name, phone, and email together.
- If an application has an `application_url`, include it so the user can view details on the City's site.
- Street names in the DB are uppercase. Present them in title case to the user (e.g. "King Street East" not "KING ST E").

## Common Query Patterns

| User says... | Tool | Key params |
|-------------|------|------------|
| "What's happening on Yonge Street?" | searchApplications | streetName: "YONGE" |
| "Show me Ward 13 applications" | searchApplications | wardNumber: 13 |
| "Any new condo projects?" | searchApplications | applicationType: "CD", status: "Under Review" |
| "How many applications are closed?" | getApplicationStats | groupBy: "type", status: "Closed" |
| "Find projects with underground parking" | searchByDescription | keyword: "underground parking" |
| "What's application 09 170674?" | getApplicationDetails | applicationNumber: "09 170674" |
| "Tallest buildings proposed?" | searchByDescription | keyword: "storey" |
| "Recent submissions in 2024" | searchApplications | dateFrom: "2024-01-01" |
