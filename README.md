# BrandBoard Backend

BrandBoard is a backend service for generating on-brand banner layouts from a saved brand kit and a short creative prompt.

The service stores projects, validates brand assets, asks an LLM for a structured banner brief, composes deterministic HTML/CSS and inline SVG, sanitizes the result, and exposes generation status to the frontend. The frontend renders the result and performs PNG/JPEG export in the browser.

## Backend responsibilities

- Project and brand-kit persistence
- Token-based project authorization
- Logo upload validation and storage
- Structured banner brief generation
- Deterministic brand-aware composition
- Sanitization of model output and uploaded SVG
- Asynchronous generation status
- Idempotent generation requests
- Version history and regeneration chains
- Usage, token, and error metadata

The backend does not implement the visual application shell and does not rasterize every banner on the server by default.

## Architecture

```text
Frontend
   |
   | project and generation API
   v
FastAPI
   |
   +-- PostgreSQL
   +-- local storage or S3-compatible storage
   +-- generation runner
          |
          +-- structured LLM brief
          +-- art selection / optional SVG accent
          +-- Jinja2 composition
          +-- sanitizer
```

The language model never owns the final image. It returns a small validated `BannerSpec`; deterministic backend code controls brand colors, typography, layout, and output safety.

## Requirements

- Python 3.11 or newer
- A Supabase project with PostgreSQL enabled
- An OpenRouter API key for live LLM generations
- Node/Chromium only if optional server-side rendering is later enabled

## Local setup

From the repository root, create and activate a virtual environment in `backend/`, then install the project:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

The commands above are instructions for you to run locally. The agent does not
start the application or connect to Supabase.

The service should expose:

- `GET /health` for a liveness check
- `GET /docs` for the FastAPI OpenAPI documentation

## Configuration

Configuration belongs in environment variables rather than source code. The eventual `.env.example` should include:

```text
# Supabase connection variables used by app/db.py.
user=postgres.[PROJECT-REF]
password=[PASSWORD]
host=aws-0-[REGION].pooler.supabase.com
port=5432
dbname=postgres
STORAGE_ROOT=./storage
OPENROUTER_API_KEY=
MODEL_BRIEF=
MODEL_ART=
GENERATION_RATE_LIMIT=
DAILY_PROJECT_GENERATION_CAP=
```

Model names, storage backends, and limits must be configurable without changing pipeline code.

## What is implemented

The initial backend slice currently includes:

- FastAPI application setup with `/health`.
- PostgreSQL SQLModel engine configuration for Supabase.
- Alembic configuration and PostgreSQL migrations for projects and generations.
- Project creation with a one-time owner token.
- SHA-256 token storage and constant-time token comparison.
- Protected project read and update endpoints.
- Asynchronous generation lifecycle with brief, compose, and sanitize steps.
- Idempotent generation creation, status polling, regeneration, and SVG download.
- Safe deterministic SVG composition and allowlist-based SVG sanitization.
- Ruff configuration and a health endpoint test.

The project token is returned only by `POST /projects`. Store it in the frontend
client because the backend stores only its hash.

## Backend walkthrough

### 1. Configuration and database

[app/config.py](./backend/app/config.py) reads `DATABASE_URL` and the other
settings from `backend/.env`. [app/db.py](./backend/app/db.py) creates the
SQLModel engine and provides a request-scoped database session.

The backend reads the lowercase variable names exactly as shown. Use the
Supabase connection details from the dashboard, preferably the pooler details
when the direct database host is unreachable on the current network.

### 2. Database schema

[migrations/versions/0001_create_projects.py](./backend/migrations/versions/0001_create_projects.py)
creates the first `project` table. Run the migration against your Supabase
database before using the project endpoints.

### 3. Project security

[app/utils/ids.py](./backend/app/utils/ids.py) creates a public project code and
a high-entropy owner token. [app/utils/security.py](./backend/app/utils/security.py)
hashes the token before persistence and compares presented tokens with a
constant-time comparison.

The project code is an identifier, not a secret. Protected requests must send:

```text
X-Project-Token: <project-owner-token>
```

### 4. Project API

[app/api/projects.py](./backend/app/api/projects.py) provides:

```text
POST  /projects
GET   /projects/{code}
PATCH /projects/{code}
```

The current create endpoint accepts JSON. Logo multipart handling will be added
with the asset-storage slice.

Example create request:

```bash
curl -X POST http://127.0.0.1:8000/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TechNest",
    "description": "A student technology club focused on learning and collaboration.",
    "colors": {
      "primary": "#6366F1",
      "accent": "#10B981",
      "tertiary": "#A78BFA"
    },
    "font": "Inter"
  }'
```

Copy the `code` and `owner_token` from the response. Then retrieve the project:

```bash
curl http://127.0.0.1:8000/projects/<PROJECT_CODE> \
  -H "X-Project-Token: <PROJECT_OWNER_TOKEN>"
```

### 5. Generation API

[app/api/generations.py](./backend/app/api/generations.py) provides:

```text
POST /projects/{code}/generations
GET  /generations/{id}
POST /generations/{id}/regenerate
GET  /generations/{id}/download
```

Generation creation returns `202 Accepted` with `queued` status. The backend
then runs the brief model, composes deterministic SVG, sanitizes it, and
persists either `done` with `spec` and `svg` or `failed` with an error message.
Repeat a request with the same `request_id` within a project to receive the
existing generation instead of starting another model call.

Example:

```bash
curl -X POST http://127.0.0.1:8000/projects/<PROJECT_CODE>/generations \
  -H "Content-Type: application/json" \
  -H "X-Project-Token: <PROJECT_OWNER_TOKEN>" \
  -d '{
    "request_id": "launch-banner-001",
    "prompt": "A square launch banner for our student technology club",
    "width": 1080,
    "height": 1080
  }'
```

Poll the returned generation ID until `status` is `done` or `failed`.

## Your manual run steps

Run these commands from the repository root:

```bash
cd backend
source .venv/bin/activate
cp .env.example .env
```

Edit `backend/.env` and choose one of the following database configurations.

Set these variables in `backend/.env`:

```text
user=postgres.[PROJECT-REF]
password=[PASSWORD]
host=aws-0-[REGION].pooler.supabase.com
port=5432
dbname=postgres
```

The backend constructs the following URL:

```text
postgresql+psycopg2://user:password@host:port/dbname?sslmode=require
```

Then apply the schema:

```bash
alembic upgrade head
```

## AI setup

The AI layer uses OpenRouter through LangChain's `ChatOpenAI` integration.
Configure the provider in `backend/.env`:

```text
OPENROUTER_API_KEY=your-openrouter-key
MODEL_BRIEF=your-brief-model
MODEL_ART=your-art-model
```

`MODEL_BRIEF` is used for structured banner copy. `MODEL_ART` is reserved for
the optional artwork step. The application does not call either model until a
pipeline step explicitly requests it.

The role-based client is implemented in
[app/llm/client.py](./backend/app/llm/client.py). It:

- Routes `brief` and `art` to separate configurable models.
- Uses `https://openrouter.ai/api/v1`.
- Applies a 60-second timeout and two retries.
- Fails explicitly when the API key or requested role model is not configured.

The first structured AI stage is implemented in
[app/pipeline/steps/brief.py](./backend/app/pipeline/steps/brief.py). It sends
the brand context, requested dimensions, and user prompt to the model, then
validates the result as [BannerSpec](./backend/app/pipeline/spec.py).

`BannerSpec` currently allows:

- `split_hero`, `centered`, `image_right`, or `text_only` layouts.
- A headline up to 60 characters.
- Supporting text up to 140 characters.
- A CTA up to 24 characters.
- `bold`, `friendly`, `minimal`, or `premium` tone.

Markup characters are removed from model-produced text before the spec is
returned. The model supplies copy and layout intent only; it does not supply
HTML, SVG, CSS, or arbitrary brand colors.

The prompt used by this stage is stored at
[brief.md](./backend/app/llm/prompts/brief.md), so prompt changes do not require
changing Python code.

If Alembic reports `ValueError: invalid interpolation syntax`, the password is
probably URL-encoded (for example, it contains `%21`). The migration
configuration uses the URL directly and should not produce this error after
updating the backend. Do not remove URL encoding from passwords.

If PostgreSQL reports `Network is unreachable` and the Supabase hostname
resolves to an IPv6 address, the current network does not have an IPv6 route.
Use the Supabase connection pooler URL from the dashboard, typically the
session or transaction pooler connection, instead of the direct database host.
The pooler host is designed for client connections and is commonly reachable
on IPv4 networks. Keep the corresponding pooler port, username, and database
name together when switching connection strings.

Start the development server yourself:

```bash
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` to use the interactive API documentation, or
check the health endpoint:

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{"status": "ok"}
```

Stop the server with `Ctrl+C`.

## API overview

All protected requests send:

```text
X-Project-Token: <project-owner-token>
```

### Create a project

```text
POST /projects
Content-Type: multipart/form-data
```

The request contains the brand name, description, three brand colors, optional font, and optional logo. The response includes the public project code and the owner token. The token is returned only at creation and must be retained by the client.

### Read or update a project

```text
GET   /projects/{code}
PATCH /projects/{code}
```

The response includes the brand kit, assets, and generation history summaries. A project code is an identifier, not an authorization credential.

### Start a generation

```text
POST /projects/{code}/generations
```

Example request:

```json
{
  "request_id": "01JBRANDBOARD-CLIENT-REQUEST",
  "prompt": "A friendly square banner announcing our coding club",
  "size": "square"
}
```

The endpoint returns `202 Accepted` and a generation ID. The request is idempotent per project and `request_id`.

### Poll generation status

```text
GET /generations/{id}
```

Typical states are:

```text
queued -> running -> done
                    \-> failed
```

While running, `step` identifies the current pipeline stage. When done, the response includes sanitized markup and the validated spec. When failed, it includes a safe error message and a generation ID suitable for support logs.

### Regenerate and download

```text
POST /generations/{id}/regenerate
GET  /generations/{id}/download
```

Regeneration creates a new version linked through `parent_id`. Client-side export should use the completed markup. Server-side image rendering is intentionally deferred until a product requirement needs it.

## Data and output safety

The service must:

- Validate all request bodies with Pydantic.
- Strip markup from model-generated copy.
- Enable Jinja autoescaping.
- Sanitize generated SVG with an explicit allowlist.
- Reject scripts, event handlers, `foreignObject`, external references, and unsafe URLs.
- Validate file signatures rather than trusting filename extensions.
- Limit uploads to 2 MB and sanitize SVG logos.
- Derive accessible text/surface colors in backend code from the saved brand colors.
- Avoid external fonts and network assets during composition.

These controls protect both the API and the browser, where the generated markup is eventually displayed.

## Development workflow

Implement the backend in this order:

1. Database, settings, health check, and project authorization.
2. Project and asset endpoints.
3. Deterministic composition from a hardcoded spec.
4. Sanitization and security tests.
5. Asynchronous generation status and idempotency.
6. Structured LLM brief generation.
7. Art library and optional SVG accents.
8. Regeneration history, rate limiting, and usage caps.

Start with the deterministic rendering path before integrating the LLM. This isolates layout and brand-quality issues from model-quality issues and makes failures reproducible.

## Testing expectations

The test suite should cover:

- Project creation and token authorization
- Invalid colors, size presets, dimensions, and uploads
- SVG/logo sanitization
- Markup escaping and external-resource blocking
- Successful pipeline completion
- Explicit pipeline failure and persisted error status
- Generation polling states
- Idempotent `request_id` handling
- Parent/version history
- Rate limits and daily caps

Run the smallest relevant test selection during development, then run the complete suite before integrating a feature.

## Deployment notes

PostgreSQL is used for both local development and production. Local file storage is suitable for development; production should use an S3-compatible storage adapter when multiple instances or durable asset storage are required.

FastAPI background tasks are sufficient for the first slice. Move generation work to a durable queue such as arq or Celery with Redis when jobs need retries across process restarts or when generation volume increases.

Keep server-side rendering optional. Browser export is cheaper and reduces backend infrastructure, while an on-demand render endpoint can be added later for scheduled posts, email delivery, or external API consumers.
