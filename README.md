# Lumen Commons

Lumen Commons is a privacy-first civic participation application built on Midnight. It lets a resident prove eligibility and submit a community response without publishing their identity, exact age, district credential, private note, or holder secret.

Each participant owns their deployment. The browser connects to 1AM, deploys a fresh worker contract through the participant's wallet, waits for finalization, and retains the resulting contract address and deployment transaction hash for that wallet and network.

## Participation flow

1. Read the public campaign requirents.
2. Save eligibility information locally on the device.
3. Review what remains private and what becomes public.
4. Connect a 1AM wallet on Midnight Preview or Preprod.
5. Deploy a participant-owned contract from the browser.
6. Generate and submit the eligibility proof.
7. Receive a receipt containing the contract address and transaction hashes.

There is no shared contract-address environment variable. Contract deployment is initiated and approved by the participant.

## Privacy boundary

Remains on the participant's device:

- Resident identity and exact address
- Exact age and district credential
- Holder secret and maintenance signing key
- Private notes and proof witness values

May become public:

- Campaign identifier
- Eligibility result
- Selected response category
- Participant contract address
- Deployment and response transaction hashes
- Finalization time and network

The backend receives public receipts and aggregate counts. It does not need the private proof witness. AI-assisted disclosure explanations receive redacted public requirements only; when no Gemini key is configured, the backend uses a deterministic local explanation.

## Architecture

| Area | Technology | Responsibility |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite | Civic flow, local private state, wallet connection and receipts |
| Wallet | 1AM connector API | User approval, transaction balancing and submission |
| Contract | Midnight Compact | Eligibility proof, campaign response and private administration |
| Backend | FastAPI, SQLAlchemy, Alembic | Public campaigns, disclosure plans, receipts and aggregates |
| Database | SQLite locally, PostgreSQL in production | Public application records |
| Hosting | Netlify and Render | Static frontend and API service |

## Requirements

- Node.js 22 or newer
- npm
- Python 3.12
- A 1AM wallet configured for Midnight Preview or Preprod
- Network funds for contract deployment and proof submission
- The official Compact compiler only when regenerating contract artifacts

## Local setup

Clone or download the project, then create local environment files for Vite and FastAPI:

```powershell
Copy-Item .env.example frontend/.env
Copy-Item .env.example backend/.env
```

### Frontend

Install dependencies from the project root and start Vite:

```powershell
npm ci
npm run dev
```

The frontend is available at `http://localhost:5173` by default.

### Backend

In another PowerShell terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

The health endpoint is `http://localhost:8000/health`. Interactive API documentation is available at `http://localhost:8000/docs` outside production.

## Environment variables

The complete template is in [`.env.example`](.env.example).

| Variable | Used by | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Frontend | Public backend URL |
| `VITE_MIDNIGHT_NETWORK` | Frontend | `preview` or `preprod` |
| `VITE_MIDNIGHT_ARTIFACT_BASE_URL` | Frontend | Browser path for proving artifacts |
| `API_CORS_ORIGINS` | Backend | Allowed frontend origins, separated by commas |
| `DATABASE_URL` | Backend | SQLite or pooled PostgreSQL connection |
| `DATABASE_URL_UNPOOLED` | Backend | Optional direct PostgreSQL connection for migrations |
| `GEMINI_API_KEY` | Backend | Optional disclosure-plan generation key |
| `GEMINI_MODEL` | Backend | Gemini model identifier |
| `STORE_RAW_PUBLIC_REQUIREMENTS` | Backend | Whether approved public requirements may be retained |

Never place private credentials, wallet secrets, proof witnesses, or database passwords in a `VITE_` variable. Vite variables are included in the public browser bundle.

## Validation

Run the frontend checks from the project root:

```powershell
npm run lint
npm test
npm run build
```

Validate the Compact privacy invariants and generated artifacts:

```powershell
npm run contract:validate
npm run contract:verify-artifacts
```

Regenerate the contract outputs only when the official Compact compiler is installed:

```powershell
npm run contract:compile
```

Run the backend checks from `backend`:

```powershell
pytest
ruff check .
```

## Deployment

### Render backend

The repository includes [`render.yaml`](render.yaml). Create a Render Blueprint service and configure these secret values:

- `DATABASE_URL`: pooled PostgreSQL connection string
- `DATABASE_URL_UNPOOLED`: direct PostgreSQL connection string, when available
- `API_CORS_ORIGINS`: final Netlify origin, such as `https://example.netlify.app`
- `GEMINI_API_KEY`: optional

Render installs the backend requirements, applies the Alembic migration, seeds the campaign, and starts Uvicorn. Confirm that `/health` returns a successful response before deploying the frontend.

### Netlify frontend

The repository includes [`netlify.toml`](netlify.toml). Configure:

- `VITE_API_URL`: public HTTPS URL of the Render service
- `VITE_MIDNIGHT_NETWORK`: `preview` or `preprod`
- `VITE_MIDNIGHT_ARTIFACT_BASE_URL`: `/contract-artifacts`

Netlify builds from the repository root and publishes `frontend/dist`. The SPA redirect and long-lived caching for versioned contract artifacts are already configured.

## Project structure

```text
backend/                 FastAPI service, migrations and tests
contract/                Compact source, validation scripts and generated artifacts
frontend/                React application and browser proving assets
netlify.toml             Frontend deployment configuration
render.yaml              Backend deployment configuration
.env.example             Safe environment-variable template
```

## Production checklist

- Use a production PostgreSQL database rather than local SQLite.
- Set CORS to the exact Netlify origin.
- Keep all wallet secrets and private resident attributes on the participant's device.
- Confirm the wallet network matches `VITE_MIDNIGHT_NETWORK`.
- Fund the participant wallet before contract deployment.
- Run the full validation suite before publishing.
- Verify the Render health endpoint and then test one complete wallet deployment and proof flow.
