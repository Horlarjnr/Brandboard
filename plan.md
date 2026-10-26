# BrandBoard Backend Implementation Plan

## Scope

This plan covers the backend for BrandBoard: project and brand-kit storage, banner-generation orchestration, sanitized HTML/SVG output, generation history, and the API consumed by the frontend.

The backend does **not** own the visual application shell or client-side PNG export. The frontend is responsible for displaying the returned banner markup and rasterizing it for download. Server-side rasterization remains an optional future capability.

## Product decisions

1. The language model returns a validated `BannerSpec`, not a complete image.
2. The backend composes deterministic HTML/CSS with inline SVG artwork and brand tokens.
3. All model-produced text, SVG, uploaded logos, and user-controlled content are treated as untrusted.
4. A generation is complete when sanitized SVG/HTML is available to the client.
5. The backend stores the sanitized markup and structured spec so a banner can be re-rendered without another model call.
6. Projects use a short public code for lookup and a separate owner token for authorization.
7. SQLite is the development database; SQLModel and Alembic keep the schema portable to PostgreSQL.
8. Generation requests are asynchronous and expose status through polling.
9. A client-supplied `request_id` makes generation creation idempotent.
10. Dimensions are selected from a bounded preset list rather than accepting arbitrary sizes.

## Proposed stack

- Python 3.11+
- FastAPI and Uvicorn
- SQLModel, SQLAlchemy, and Alembic
- Pydantic Settings for environment configuration
- LangChain `ChatOpenAI` with OpenRouter
- Jinja2 for deterministic composition
- Local storage for uploaded logos during development, behind a storage interface
- Optional curated art library; optional sanitized LLM-generated SVG accents
- `bleach`/`defusedxml` or an equivalent explicit allowlist sanitizer
- Pytest and HTTPX for tests

## Backend layout

```text
brandboard-api/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── db.py
│   ├── models.py
│   ├── schemas.py
│   ├── api/
│   │   ├── projects.py
│   │   ├── generations.py
│   │   └── assets.py
│   ├── pipeline/
│   │   ├── runner.py
│   │   ├── context.py
│   │   ├── spec.py
│   │   └── steps/
│   │       ├── brief.py
│   │       ├── art.py
│   │       ├── compose.py
│   │       └── sanitize.py
│   ├── llm/
│   │   ├── client.py
│   │   └── prompts/
│   ├── templates/
│   ├── storage/
│   │   ├── base.py
│   │   └── local.py
│   └── utils/
│       ├── ids.py
│       ├── palette.py
│       ├── security.py
│       └── svg_sanitize.py
├── migrations/
├── tests/
├── storage/
├── .env.example
├── pyproject.toml
└── Dockerfile
```

## Data model

### Project

- `id`: UUID primary key
- `code`: short unique identifier shown in the UI
- `owner_token_hash`: hash of the token returned once at creation
- `name`, `description`
- `colors`: JSON object containing primary, accent, and tertiary colors
- `font`: approved font name, defaulting to Inter
- `created_at`

### Asset

- `id`: UUID primary key
- `project_id`: owning project
- `kind`: `logo`, `reference`, or `render`
- `storage_key`
- `mime`
- optional width and height

Uploaded SVG logos must be sanitized before storage. PNG/JPG uploads must be checked using file signatures, capped at 2 MB, and stripped of EXIF where applicable.

### Generation

- `id`: UUID primary key
- `project_id`
- optional `parent_id` for regeneration/refinement chains
- `version_no`
- `request_id`, unique within a project
- `prompt`, `width`, `height`
- `status`: `queued`, `running`, `done`, or `failed`
- `step`: current pipeline step
- `spec`: validated `BannerSpec` JSON
- `svg`: sanitized composed markup
- optional model and token usage fields
- `error`
- `created_at`

## Generation pipeline

```text
request
  -> validate project token and size preset
  -> create queued Generation
  -> background runner
      -> brief: LLM -> BannerSpec
      -> art: curated art selection or optional sanitized SVG accent
      -> compose: Jinja2 HTML/CSS + inline SVG
      -> sanitize: allowlist markup and attributes
      -> save spec and markup
  -> done
```

Each step receives and updates a small pipeline context. The runner must update `status` and `step` before each step and persist a useful error when a step fails. No broad exception handler should hide the original failure.

### BannerSpec

```python
class BannerSpec(BaseModel):
    layout: Literal["split_hero", "centered", "image_right", "text_only"]
    eyebrow: str | None = None
    headline: str = Field(max_length=60)
    subtext: str = Field(max_length=140)
    cta: str | None = Field(default=None, max_length=24)
    art_prompt: str | None = None
    tone: Literal["bold", "friendly", "minimal", "premium"] = "bold"
```

Validators must strip markup from text fields and reject invalid or oversized values. The model may select brand tokens, but it must not invent arbitrary colors. Derived palette values and contrast decisions belong in backend code.

## API contract

### Projects

```text
POST  /projects
GET   /projects/{code}
PATCH /projects/{code}
```

`POST /projects` accepts project fields and an optional logo upload, then returns the project code and owner token. The token must not be stored in plaintext.

The owner token is sent in `X-Project-Token` for protected project operations. Project lookup by code must still require the token so the code is not treated as a secret.

### Generations

```text
POST /projects/{code}/generations
GET  /generations/{id}
POST /generations/{id}/regenerate
GET  /generations/{id}/download
```

`POST /projects/{code}/generations` accepts:

```json
{
  "request_id": "client-generated-id",
  "prompt": "A square launch banner for our student club",
  "size": "square",
  "parent_id": null
}
```

It returns `202 Accepted` with the generation ID and initial status. Repeating the same `request_id` for the same project returns the existing generation instead of charging the model again.

`GET /generations/{id}` returns status, current step, sanitized markup when complete, the spec, and failure information when applicable. Generation access must verify the project token.

The download endpoint should initially return the stored markup or a safe representation appropriate for client-side export. Server-side PNG/JPEG rendering is a later, opt-in feature.

## Security and reliability requirements

- Hash owner tokens and compare them using a constant-time check.
- Rate-limit generation creation per project.
- Enforce size presets and upload limits at the API boundary.
- Sanitize uploaded SVGs and model-generated SVGs with an allowlist.
- Remove scripts, event-handler attributes, `foreignObject`, external references, and unsafe URLs.
- Escape all model/user text through Jinja autoescaping.
- Never fetch remote fonts or assets during composition.
- Store logos as data URIs or controlled local/storage URLs when composing.
- Keep secrets in environment variables and never return provider credentials.
- Log generation IDs and failure causes without logging owner tokens or sensitive prompts unnecessarily.
- Set a per-project daily usage/cost cap.
- Configure model roles and fallback models through environment variables.

## Implementation order

1. Create the FastAPI skeleton, settings, database session, migrations, and health check.
2. Implement Project, Asset, and Generation models plus project creation and token authorization.
3. Implement local storage and safe logo upload validation.
4. Implement palette derivation and a deterministic hardcoded `BannerSpec`.
5. Implement one HTML/CSS template and composition tests.
6. Implement server-side sanitization and tests for malicious SVG/HTML.
7. Implement generation status polling and background execution.
8. Add the structured LLM brief step with one retry and persisted model/token metadata.
9. Add curated artwork selection and optional sanitized SVG accents.
10. Add regeneration, parent/version history, and idempotent request handling.
11. Add rate limiting, daily caps, structured logging, and operational checks.
12. Add optional on-demand server rendering only if a real delivery integration requires it.

## Definition of done

- A project can be created with a logo and retrieved using its owner token.
- Invalid tokens, uploads, colors, prompts, and dimensions receive explicit validation errors.
- A generation progresses through observable states and never remains silently queued after a worker failure.
- The same `request_id` does not create duplicate generations.
- A hardcoded spec can produce deterministic, sanitized markup without an LLM.
- Model output is validated before composition.
- Generated markup cannot execute scripts or load uncontrolled external resources.
- Generation history preserves parent/version relationships and stored specs.
- Targeted unit and API tests cover authorization, idempotency, sanitizer behavior, pipeline failure, and successful generation.
