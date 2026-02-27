import { scenario, persona } from "@fabriklabs/core";

export default scenario("specific application detail request by application number", async ({ agent, assert }) => {
  const user = persona({
    role: "development analyst",
    tone: "neutral",
    backstory: "Needs record-level details for due diligence notes.",
  });

  const r1 = await agent.send(
    user.says("Give me full details for application number 23 145678 STE 10 OZ.")
  );

  await assert.llmJudge(r1, {
    criteria: `This is a happy-path civic-planning detail lookup. The user supplied a specific Toronto development application number and asked for full details.

Evaluate whether the assistant handled the request with the correct single-record retrieval workflow:
1) Correct tool choice and intent:
   - Preferred behavior is to use getApplicationDetails with the provided applicationNumber.
   - It should treat the input as a specific-record lookup, not as a broad list search, description search, or grouped stats query.
2) Output quality and structure:
   - Response should be concise but informative, and organized (e.g., bullets/sections/table-like formatting).
   - It should present key record-level fields if available (such as application number, address/location, type, status, dates, description, ward, etc.) without inventing data.
3) Handling uncertainty/not-found:
   - If no record exists, the assistant should clearly say it could not find that application and optionally suggest a next step (e.g., verify number format), rather than guessing details.
4) No hallucination:
   - The assistant must not fabricate precise values for fields that were not returned by tools.
   - If some fields are unavailable, acknowledging missing data is acceptable.

Valid successful behaviors include:
- A detailed single-record summary after getApplicationDetails call.
- A clear not-found message if tool returns no match/error.
- Minor variation in formatting/tone is fine as long as it remains helpful and structured.`,
    threshold: 4,
    scale: 5,
  });

});