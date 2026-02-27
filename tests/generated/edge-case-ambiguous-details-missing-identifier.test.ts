import { scenario, persona } from "@fabriklabs/core";

export default scenario("ambiguous details request without required identifier", async ({ agent, assert }) => {
  const user = persona({
    role: "first-time portal user",
    tone: "casual",
    backstory: "Not familiar with required identifiers.",
  });

  const r1 = await agent.send(
    user.says("Can you pull the full details for that application on King Street?")
  );

  await assert.llmJudge(r1, {
    criteria: `This is an ambiguity/constraint-handling test for a Toronto development applications assistant.
The user asked for "full details" but did not provide a unique identifier (id or application number), and
"that application on King Street" is not specific enough to uniquely identify one record.

Evaluate whether the assistant behaves safely and correctly under this constraint:
1) It should request clarification (ask for id/application number) OR propose a valid intermediate step
   such as searching King Street applications first so the user can pick one.
2) It should explain what is needed in plain language (e.g., "please share application number/id" or
   "I can list King Street matches first").
3) It must NOT pretend it already identified a specific application from this prompt alone.
4) It should remain helpful, concise, and structured, aligned with civic-data assistant tone.

Valid good behaviors include:
- Asking directly for application number/id before fetching full details.
- Offering to run a quick search on King Street and then fetch details after the user selects one.
- Mentioning that multiple King Street records may exist.

Invalid behaviors include:
- Confidently returning full details for a specific record without disambiguation.
- Hallucinating an application number/id or exact project facts.
- Acting as if a unique record is known when it is not.`,
    threshold: 4,
    scale: 5,
  });

});