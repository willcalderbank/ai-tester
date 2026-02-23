# ai-tester

Nuxt 4 POC web app for testing the Anthropic API interactively.

## Commands

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm test           # Run Vitest unit tests
npm run test:watch # Watch mode
```

## Environment

```
ANTHROPIC_API_KEY=sk-ant-...  # Required — never expose to browser
```

Create `.env` before running.

## Architecture

```
app/
  pages/index.vue            # Main chat layout
  components/
    AppHeader.vue            # Sticky header: logo, model selector, burger drawer
    PreambleEditor.vue       # System prompt textarea (locked once chat starts)
    ChatMessage.vue          # Message bubble with token/cost metadata
    ChatInput.vue            # Sticky bottom textarea, Enter to send
    CostSummary.vue          # Fixed bottom-right running cost badge
  composables/
    useChat.ts               # All reactive state + calcCost (exported for tests)
server/
  api/
    chat.post.ts             # Proxies to Anthropic, returns content + usage
tests/
  calcCost.test.ts           # Pure function tests
  chat-api.test.ts           # Server route tests with Anthropic SDK mocked
```

## Key Patterns

- All Anthropic calls go through `server/api/chat.post.ts` — never client-side
- Shared composable state uses `useState` with string keys (Nuxt SSR-safe)
- `calcCost` is exported from `useChat.ts` to enable testing without mocking Nuxt
- Tests use plain Vitest `node` environment — not `@nuxt/test-utils`
- Anthropic mock must be a named `function`, not an arrow function (called with `new`)
- Model pricing constants live in `MODELS` array in `useChat.ts`
