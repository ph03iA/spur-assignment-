# Spur AI Live Chat Agent

A mini customer-support chat widget for the Spur founding full-stack engineer assignment. The app uses a Node.js + TypeScript backend, React UI, Postgres persistence, and Gemini for AI replies.

## Stack

- Next.js App Router with React and TypeScript
- Node.js route handlers for `POST /chat/message` and `GET /chat/history`
- Postgres with Prisma
- Gemini API via the official `@google/genai` SDK

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example`:

   ```bash
   cp .env.example .env.local
   ```

3. Set the required values:

   ```bash
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
   GEMINI_API_KEY="your-gemini-api-key"
   GEMINI_MODEL="gemini-2.5-flash"
   ```

4. Run the database migration:

   ```bash
   npm run prisma:migrate
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

No seed command is required. The fictional store knowledge is included in the Gemini system prompt.

## API

### `POST /chat/message`

Request:

```json
{
  "message": "What is your return policy?",
  "sessionId": "optional-existing-session-id"
}
```

Response:

```json
{
  "reply": "Unused items can be returned within 30 days...",
  "sessionId": "conversation-id"
}
```

### `GET /chat/history?sessionId=...`

Returns the saved messages for a conversation so the UI can restore history after reloads.

## Architecture

- `src/app` contains the Next.js page and route handlers.
- `src/components/chat-widget.tsx` owns the chat UI, pending state, local session storage, and history restore.
- `src/server/repositories` isolates Prisma persistence.
- `src/server/services/chat-service.ts` coordinates conversation lookup, persistence, LLM calls, and fallback replies.
- `src/server/services/llm` contains the Gemini integration and store support prompt.
- `src/server/validation` keeps request validation close to the API boundary.

The backend stores both user and AI messages. If Gemini fails because of timeout, rate limiting, or configuration, the server catches the error and stores a friendly fallback AI reply instead of crashing.

## Gemini Notes

The app uses Google's official `@google/genai` TypeScript SDK. `GEMINI_MODEL` defaults to `gemini-2.5-flash`. The prompt instructs Gemini to act as a concise ecommerce support agent and includes policies for shipping, returns, refunds, support hours, and order-specific help.

## Robustness

- Empty messages are rejected.
- Messages over 2,000 characters are rejected.
- Missing or unknown `sessionId` values do not crash the backend.
- Secrets are read from environment variables only.
- The API returns friendly error text instead of raw provider errors.

## Deployment

Recommended deployment:

- Vercel for the Next.js app.
- Neon or Supabase for Postgres.
- Environment variables: `DATABASE_URL`, `GEMINI_API_KEY`, and optional `GEMINI_MODEL`.

Run `npm run build` during deployment. The build script generates Prisma Client before compiling Next.js.

## Trade-offs

- The assignment suggested Svelte, but React is explicitly allowed. I used Next.js + React to keep the frontend and Node.js backend in one TypeScript codebase.
- FAQ knowledge is prompt-based instead of database-backed. That is enough for this take-home and keeps the data model focused on conversations.
- There is no auth because the assignment does not require it.

## If I Had More Time

- Add streaming responses for a more realistic live chat feel.
- Add admin tooling to edit FAQ knowledge without code changes.
- Add automated API tests with a mocked Gemini client.
- Add rate limiting by IP or session.
