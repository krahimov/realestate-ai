import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { tools } from "@/lib/ai/tools";

function isUIMessage(msg: unknown): boolean {
  return typeof msg === "object" && msg !== null && "parts" in msg;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Missing ANTHROPIC_API_KEY. Set it in your server environment.",
      },
      { status: 500 }
    );
  }

  const anthropic = createAnthropic({ apiKey });
  const { messages } = await req.json();

  const modelMessages = isUIMessage(messages[0])
    ? await convertToModelMessages(messages)
    : messages;

  const result = streamText({
    model: anthropic("claude-opus-4-6"),
    system: `You are a helpful assistant for real estate developers querying Toronto development applications data.

The database contains ~26,161 development applications from Toronto Open Data.

**Application Type Codes:**
- OZ = Official Plan/Zoning Amendment
- SA = Site Plan Approval
- CD = Condominium Approval
- SB = Plan of Subdivision
- PL = Planning Act (other)

**Common Status Values:**
- Closed
- Under Review
- OMB Appeal
- NOAC Issued (Notice of Approval Conditions)
- OMB Approved
- Council Approved
- Appeal Received
- Draft Plan Approved

**Guidelines:**
- Use the search tools to find relevant applications before answering.
- When users ask about a street, use searchApplications with the street name.
- When users ask "how many" or want summaries, use getApplicationStats.
- When users search for specific project types (e.g. "condo towers", "residential"), use searchByDescription.
- When users ask about a specific application number, use getApplicationDetails.
- Format results clearly with addresses, types, statuses, and dates.
- If results are truncated at 50, mention that there may be more results.
- Be concise but informative. Use bullet points or tables for multiple results.`,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
