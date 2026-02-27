import { scenario, persona } from "@fabriklabs/core";

export default scenario("result-limit boundary handling at 50 records", async ({ agent, assert }) => {
  const user = persona({
    role: "market researcher",
    tone: "efficient",
    backstory: "Collecting broad inventory across many applications.",
  });

  const r1 = await agent.send(
    user.says("List all development applications on Yonge Street.")
  );

  await assert.llmJudge(r1, {
    criteria: `This edge-case test checks boundary handling for broad searches that can exceed tool return limits.
The request ("List all development applications on Yonge Street") is likely to produce many records.

Evaluate whether the agent demonstrates correct constrained behavior:
1) Tool selection:
   - Preferably calls searchApplications for a street/location query.
   - Using tools before answering is expected for this data-backed agent.
2) Limit/truncation awareness:
   - If results are at/near the known cap (50 max from searchApplications), the agent should clearly communicate that output is capped/truncated/partial.
   - It should not imply the list is exhaustive when tool constraints make that uncertain.
3) Guidance to narrow scope:
   - Good responses suggest practical filters such as date range, status, ward, and/or application type (OZ, SA, CD, SB, PL) to refine results.
4) No fabricated completeness claims:
   - The agent must not invent "all matches" totals or definitive complete counts unless supported by appropriate stats tooling.
5) Response quality:
   - Helpful, concise, and structured presentation is preferred.

Valid behavior includes:
- Returning a subset and explicitly stating only up to 50 are shown.
- Asking a concise follow-up to narrow the query before listing.
- Suggesting a stats summary path for totals while separating that from the returned list.

Fail behavior includes:
- Claiming it listed all Yonge Street applications without qualification.
- Omitting any mention of truncation when the boundary condition is relevant.
- Presenting invented complete totals without a stats basis.`,
    threshold: 4,
    scale: 5,
  });

});