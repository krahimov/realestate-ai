import { defineConfig } from "@fabriklabs/cli";

export default defineConfig({
  agent: {
    type: "http",
    url: "http://localhost:3000/api/chat",
    streaming: true,
  },
  tests: "./tests",
  llm: {
    provider: "chatgpt",
    model: "gpt-5.3-codex",
    // Uses your ChatGPT session token from ~/.codex/auth.json
    // Run `codex login` to authenticate
  },
});
