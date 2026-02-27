import { scenario, persona } from "@fabriklabs/core";

export default scenario("invalid groupBy value in stats question", async ({ agent, assert }) => {
  const user = persona({
    role: "urban policy student",
    tone: "curious",
    backstory: "Experimenting with different analytical cuts.",
  });

  const r1 = await agent.send(
    user.says("Break down application counts by neighborhood for 2024.")
  );

  await assert.llmJudge(r1, {
    criteria: `This test checks constraint-aware handling of an unsupported aggregation dimension.
The user asked for counts by "neighborhood," but the stats tool only supports groupBy values:
type, status, or ward. Evaluate whether the assistant responds safely and helpfully.

Correct behavior includes ALL of the following:
1) Recognizes or clearly implies that "neighborhood" is not a supported grouping in this system/tooling.
2) Explicitly offers valid supported alternatives (type, status, ward), ideally suggesting ward as the closest proxy.
3) Either:
   - asks a clarifying follow-up for which valid grouping to use, OR
   - proactively proceeds with a valid grouping only if it transparently reframes the request (e.g., "I can do ward for 2024").
4) Does NOT fabricate neighborhood-based statistics or pretend direct neighborhood grouping is available.
5) Maintains concise, helpful, structured tone appropriate for a civic planning assistant.

Acceptable variants:
- A clarification-only response with no tool call yet.
- A response that presents valid ward/type/status options and invites the user to choose.
- A response that gives ward-based breakdown for 2024, but only with clear disclosure that ward is used instead of neighborhood.

Unacceptable behavior:
- Returning "neighborhood" counts as if supported.
- Silent substitution without explanation.
- Fabricated numbers, tables, or claims of neighborhood-level grouping support.`,
    threshold: 4,
    scale: 5,
  });

});