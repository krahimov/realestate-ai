import { scenario, persona } from "@fabriklabs/core";

export default scenario("keyword project search by description", async ({ agent, assert }) => {
  const user = persona({
    role: "planning consultant",
    tone: "professional",
    backstory: "Benchmarking similar projects for a client submission.",
  });

  const r1 = await agent.send(
    user.says("Find applications mentioning mixed-use near Toronto and summarize what types they are.")
  );

  await assert.llmJudge(r1, {
    criteria: `This is a happy-path civic planning query focused on keyword-based project discovery.
The user asked for applications mentioning "mixed-use" and a summary of what application types they are.

Evaluate whether the assistant:
1) Chose the correct retrieval approach for a concept keyword query:
   - Preferred behavior: uses the description-search workflow/tool (searchByDescription) to find records containing the keyword.
   - Acceptable fallback: asks a concise clarifying question only if needed, without switching to an unrelated street-only search strategy.
2) Grounded its summary in retrieved records:
   - It should summarize observed application types from the returned results (e.g., type distribution or list of types seen).
   - It should avoid unsupported claims (e.g., definitive citywide totals) unless it explicitly performs a stats call.
3) Maintained concise, readable output:
   - Helpful and professional tone.
   - Structured formatting (bullets/table/short sections) is encouraged.
   - Not excessively verbose.
4) Avoided fabrication:
   - No invented counts, records, or conclusions beyond what tools could support.
   - If results are limited/truncated, acknowledging limits is good behavior.

The response should pass if it correctly uses description-based retrieval and provides a cautious, evidence-based type summary.
It should fail if it primarily uses street search for this keyword intent, gives fabricated numeric summaries, or presents broad unsupported conclusions.`,
    threshold: 4,
    scale: 5,
  });

});