# Community marketing site on Vercel

This repository deploys **only** the Astro community site.

| Setting | Value |
|---------|-------|
| Vercel project | `marketing` |
| GitHub repository | `dataengineeringformachinelearning/dataengineeringformachinelearning` (`main`) |
| Root directory | `marketing` |
| Config | `marketing/vercel.json` |
| Build | `npm run build` → `dist` |
| Install | `npm install --legacy-peer-deps --no-workspaces` |
| Domain | `https://dataengineeringformachinelearning.com` |
| Node.js | 24.x |

Control-plane Angular (`deml.app`) and Django (`backend.deml.app`) deploy from [`deml`](https://github.com/dataengineeringformachinelearning/deml). FORJD landing/API deploy from [`forjd`](https://github.com/dataengineeringformachinelearning/forjd).

## Environment variables (Production)

| Variable | Value |
|----------|-------|
| `FRONTEND_URL` | `https://deml.app` |
| `BACKEND_URL` | `https://backend.deml.app` |
| `MARKETING_URL` | `https://dataengineeringformachinelearning.com` |

## Deploy

```bash
cd marketing
npx vercel link --project marketing --yes
npx vercel env add FRONTEND_URL production --value 'https://deml.app' --force --yes --no-sensitive
npx vercel env add BACKEND_URL production --value 'https://backend.deml.app' --force --yes --no-sensitive
npx vercel env add MARKETING_URL production --value 'https://dataengineeringformachinelearning.com' --force --yes --no-sensitive
npx vercel deploy --prod --yes
```

`vercel.json` redirects:

- `/status/:slug` → `https://deml.app/status/:slug`
- `/documentation` → `https://backend.deml.app/documentation`

Viking-UI is consumed from the published npm package — no sibling `packages/viking-ui` build is required on Vercel.
