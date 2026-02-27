import { scenario, persona } from "@fabriklabs/core";

export default scenario("street lookup with active-status filter on Queen Street West", async ({ agent, assert }) => {
  const developer = persona({
    role: "real estate developer",
    tone: "direct and practical",
    backstory: "Evaluating current development activity on a target corridor.",
  });

  const r1 = await agent.send(
    developer.says("Show me active development applications on Queen Street West.")
  );

  await assert.llmJudge(r1, {
    criteria: `This is a happy-path civic planning query. The user asked for ACTIVE development applications on a specific street corridor ("Queen Street West").
Evaluate whether the assistant handled this as a street/location lookup with status context.

What correct behavior looks like (ALL of these are acceptable variants):
1) Tool strategy:
   - Preferably calls searchApplications for street-based lookup, with parameters reflecting Queen Street West and active-status intent.
   - It may normalize/interpret "active" into one or more concrete status values (e.g., active/in progress/pending), or state how it interpreted "active".
   - If no records are found, clearly says so and may suggest nearby alternatives or relaxed filters (e.g., broader street text, remove status filter).

2) Output quality:
   - Provides structured results (bullets or table-like formatting) rather than vague prose.
   - Includes core fields for each listed record where available: address/location, application type, status, and at least one identifier/time field (application number and/or date).
   - Stays concise but informative, aligned with a practical developer-facing tone.

3) Grounding and correctness:
   - Does not fabricate specific applications, IDs, or statuses.
   - Does not ignore the requested "active" constraint; response should reflect active-status filtering or explicitly explain interpretation/limitations.
   - If result volume is large, mentioning truncation/limits is good behavior.

What would be wrong:
- Using clearly inappropriate tools as primary method for this request (e.g., stats/details-only path without a street search basis).
- Returning generic advice without concrete records or a clear "no matches" outcome.
- Omitting core record fields in a way that makes output non-actionable.
- Inventing records or claiming certainty without tool-grounded results.`,
    threshold: 4,
    scale: 5,
  });

});