Integration notes — Claude (Anthropic)

- Add your key to a local `.env` file (see `.env.example`) or set `CLAUDE_API_KEY` in your environment.
- Do NOT commit your secret to git. Use OS keychain/secret storage for long-term safety.

Quick run (from project root):

```bash
npm install
npm run claude:test
```

Notes:
- The example script uses the public Anthropic HTTP endpoint and `x-api-key` header. Adjust the endpoint/model name if your account requires a different URL or parameter names.
- The script uses global `fetch` (Node 18+). If you run an older Node, either upgrade or add a fetch polyfill.
