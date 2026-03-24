# Copilot Workspace Instructions for Mehfil Music Player

## Overview
This monorepo contains three main projects:
- **frontend/**: Vite + React web app
- **backend/**: Node.js/Bun API (Hono framework)
- **mobile/**: Flutter app (feature-based, Riverpod)

## Build & Test Commands
- **Frontend**
  - Dev: `npm run dev` (Vite)
  - Build: `npm run build`
- **Backend**
  - Dev: `bun run dev` (or `npm run dev` if using Node)
  - Build: `npm run build`
  - Test: `npm run test` (Vitest)
  - Lint: `bun run lint`
  - Format: `bun run format`
- **Mobile**
  - Standard Flutter commands: `flutter run`, `flutter build`, `flutter test`

## Key Conventions
- **Monorepo**: Keep frontend, backend, and mobile code separate.
- **Backend**: Uses Hono, Zod, and OpenAPI. Linting (ESLint), formatting (Prettier), and spell-check (cspell) are enforced via pre-commit hooks.
- **Frontend**: React 19, Vite, Zustand for state, modular CSS. Service worker for PWA.
- **Mobile**: Feature-based structure, Riverpod for state, Flutter Hooks.

## Deployment
- **Frontend**: Deploy to Vercel. Set `VITE_API_BASE_URL` to backend URL.
- **Backend**: Deploy to Render. Free tier may have cold starts (~30s delay).
- See `frontend/PRODUCTION.md` for step-by-step deployment.

## Documentation
- **Backend API docs**: [saavn.dev/docs](https://saavn.dev/docs)
- **Backend Changelog**: backend/CHANGELOG.md
- **Mobile**: See `mobile/README.md` for Flutter resources.

## Pitfalls
- **Cold Starts**: Render backend may be slow to wake up.
- **CORS**: Already configured in backend for frontend communication.
- **Node/Bun**: Backend can run on either, but Bun is preferred for dev.

## Example Prompts
- "How do I run backend tests?"
- "How do I deploy the frontend?"
- "What is the backend API base URL for local dev?"

## See Also
- [frontend/PRODUCTION.md](../frontend/PRODUCTION.md)
- [backend/README.md](../backend/README.md)
- [mobile/README.md](../mobile/README.md)

---
For advanced customization, see the [agent-customization skill](copilot-skill:/agent-customization/SKILL.md).
