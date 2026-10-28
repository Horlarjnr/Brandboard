# BrandBoard AI Generation Pipeline Review

## Purpose

This document records the current backend state, explains why the current
implementation does not yet satisfy the requested AI-generation behavior, and
defines the implementation that should be approved before application code is
changed.

The target behavior is:

1. The user submits a creative request.
2. The AI interprets that request using the saved brand kit and requested
   dimensions.
3. The AI returns a structured creative plan that is flexible enough to
   produce different banner compositions.
4. The backend validates the plan and renders a frontend-ready document.
5. The backend sanitizes the document.
6. If the AI or any pipeline stage fails, the generation is marked failed and
   the API exposes a useful error instead of returning a successful-looking
   result.

The reference HTML supplied for the Balotly banner is an output inspiration,
not a fixed template. The backend should support that visual language:
canvas, brand area, badge or eyebrow, expressive headline, highlighted phrase,
supporting copy, CTA, and optional inline artwork. It must not force every
generation to use the same Balotly layout.

## What has been completed

### Project and database foundation

- FastAPI application and health endpoint exist.
- Supabase/PostgreSQL configuration exists.
- SQLModel models and Alembic migrations exist.
- Project creation and protected project access exist.
- Project owner tokens are hashed before persistence.
- Project lookup requires the project token.

Relevant files:

- `backend/app/config.py`
- `backend/app/db.py`
- `backend/app/models.py`
- `backend/app/api/projects.py`
- `backend/migrations/versions/0001_create_projects.py`
- `backend/migrations/versions/0002_create_generations.py`
- `backend/migrations/versions/0003_scope_generation_request_id.py`
- `backend/migrations/versions/0004_add_generation_html.py`

### LLM client

- OpenRouter is configured through LangChain's `ChatOpenAI` integration.
- `MODEL_BRIEF` is used for the brief role.
- `MODEL_ART` is available as a separate role but is not currently used by
  the generation pipeline.
- Missing API key or model configuration raises an explicit `RuntimeError`.
- The client has a timeout and retry configuration.

Relevant files:

- `backend/app/llm/client.py`
- `backend/app/llm/prompts/brief.md`

### Generation API

The following endpoints exist:

```text
POST /projects/{code}/generations
GET  /generations/{id}
POST /generations/{id}/regenerate
GET  /generations/{id}/download
```

Generation creation currently:

- Authenticates the project token.
- Checks the project/request idempotency key.
- Creates a `queued` generation.
- Schedules a FastAPI background task.
- Returns `202 Accepted`.

Generation responses contain:

- status
- current step
- validated spec
- HTML output
- SVG output
- model name
- error text

Relevant files:

- `backend/app/api/generations.py`
- `backend/app/schemas.py`

### Current pipeline stages

The current runner performs these operations:

```text
queued
  -> running / brief
  -> call the brief LLM
  -> persist BannerSpec
  -> compose deterministic SVG
  -> compose deterministic HTML/CSS with inline SVG
  -> sanitize HTML and SVG
  -> done
```

If an exception occurs, the runner persists:

```text
status = failed
error = exception text
```

Relevant files:

- `backend/app/pipeline/runner.py`
- `backend/app/pipeline/context.py`
- `backend/app/pipeline/spec.py`
- `backend/app/pipeline/steps/brief.py`
- `backend/app/pipeline/steps/compose.py`
- `backend/app/pipeline/steps/sanitize.py`

### Tests and verification already completed

- Existing project and banner specification tests pass.
- Composition and sanitization tests pass.
- The authorized project API was tested with an existing project.
- A generation was observed moving through `queued`, `running`, and `done`.
- The OpenRouter model returned a structured banner specification.
- The resulting HTML/SVG was persisted and returned.
- Repeating the same `request_id` returned the existing generation.
- The database migrations were applied successfully.

## What is wrong with the current implementation

### 1. The AI is not generating the banner design plan

The LLM currently returns a `BannerSpec` containing mostly:

- layout name
- eyebrow
- headline
- subtext
- CTA
- tone
- optional art prompt

The backend then chooses nearly all visual decisions itself:

- CSS structure
- typography scale
- spacing
- badge appearance
- background decoration
- artwork shape
- artwork content
- CTA appearance
- placement of visual elements

This means the AI is functioning primarily as a copywriter, not as the
creative generation stage requested by the product.

The current `compose_html()` function generates one backend-owned structure
regardless of the user's specific creative request. It can produce an output
that resembles the reference, but it does not let the AI meaningfully specify
the visual composition.

### 2. `art_prompt` is collected but never used

The schema and prompt expose `art_prompt`, but no art pipeline stage consumes
it. `MODEL_ART` is also not called by the runner.

As a result, a user request such as:

> Create a banner with a phone mockup showing award voting

does not cause an AI artwork stage to generate or select a phone mockup. The
backend renders the same generic inline SVG artwork.

### 3. The reference output is HTML, but the current contract is still centered
around an SVG fallback

HTML is now stored, but SVG remains the primary composition path in the
runner. The frontend-ready HTML should be the intentional primary artifact,
with SVG retained as an optional compatibility/export artifact.

The correct contract should explicitly distinguish:

- `html`: the frontend-renderable sanitized banner document
- `svg`: optional compatibility or export representation
- `spec`: the validated AI creative plan

### 4. The `BannerSpec` is not a complete creative contract

The new fields `badge`, `highlight`, and `brand_label` improve the output, but
the contract still lacks structured control over flexible composition. The AI
cannot describe, in a validated way:

- text alignment and content arrangement
- visual density
- artwork placement
- artwork type
- background treatment
- accent/decorative shapes
- CTA style
- typography intent
- whether a badge or highlight is appropriate

Adding arbitrary raw HTML or CSS to the model response would be unsafe and is
not the right fix. The correct fix is a richer structured plan with bounded
enums and validated values.

### 5. Failure handling is persisted but not yet product-complete

The runner catches exceptions and sets `status="failed"`, which is a useful
foundation. However:

- `step` is always overwritten with `"brief"` even when composition or
  sanitization fails.
- The original failing stage is therefore lost.
- The error field can contain raw provider or implementation details without a
  stable user-facing error category.
- Background task exceptions are re-raised after persistence, which can create
  noisy server errors even though the status was already recorded.
- There is no explicit failure code such as `llm_unavailable`,
  `llm_timeout`, `invalid_model_output`, `composition_failed`, or
  `sanitization_failed`.
- There is no retry policy at the generation level.
- There is no test proving that an AI failure is returned through polling as a
  failed generation.

The required behavior is not to hide failures. The generation should remain
visible to the frontend with a clear failed status and safe, actionable error
information.

### 6. FastAPI `BackgroundTasks` is not a durable job system

`BackgroundTasks` is acceptable for the first local implementation, but it is
not durable across process restarts and is not a production queue. A process
restart can leave a generation stuck in `running`.

The first implementation can keep `BackgroundTasks` if it includes recovery
and explicit status handling. A production implementation should use a worker
queue or a separate job runner.

### 7. The request input is narrower than the intended product input

The API currently accepts:

```json
{
  "request_id": "...",
  "prompt": "...",
  "width": 1080,
  "height": 1080,
  "parent_id": null
}
```

This is enough for a basic prompt, but the pipeline should make the user's
creative input explicit and preserve optional constraints such as:

- requested format or size preset
- desired visual style
- CTA preference
- target audience
- reference or asset IDs
- whether artwork is wanted
- content that must appear exactly

These should remain optional so the user can provide only a natural-language
prompt.

## Required target architecture

The corrected pipeline should be:

```text
POST generation request
  -> authenticate project
  -> validate prompt and bounded dimensions
  -> create queued Generation
  -> background worker
      -> mark running / input
      -> build brand + user context
      -> AI creative-plan step
          -> structured model response
          -> validate BannerPlan
      -> optional AI art step
          -> only when the plan requests artwork
          -> validate/sanitize artwork result
      -> deterministic renderer
          -> render frontend-ready HTML/CSS
          -> render inline SVG when needed
      -> sanitizer
          -> sanitize HTML and SVG
      -> persist artifacts and metadata
      -> mark done
  -> frontend polls generation
```

Every step must update `generation.step` before doing work.

Recommended step names:

```text
input
brief
art
compose
sanitize
done
```

On failure:

```text
status = failed
step = the actual failing step
error_code = stable machine-readable category
error = safe human-readable message
```

## Proposed AI contract

The model should return a validated `BannerPlan`, not HTML or arbitrary CSS.
The model is responsible for creative intent. The backend remains responsible
for safe rendering.

Example shape:

```json
{
  "layout": "image_right",
  "brand_label": "Balotly",
  "badge": "NEW FEATURE",
  "headline": "Award voting is live.",
  "highlight": "is live.",
  "subtext": "Voters pay for their votes and cast up to 10 at a time.",
  "cta": "Create yours",
  "tone": "bold",
  "visual_style": "playful_product",
  "text_alignment": "left",
  "artwork": {
    "enabled": true,
    "kind": "product_mockup",
    "placement": "right",
    "prompt": "A friendly mobile voting interface with a nominee card and vote controls"
  },
  "decorations": [
    {
      "kind": "circle",
      "placement": "background_right",
      "emphasis": "soft"
    }
  ]
}
```

The exact fields can evolve, but the important boundaries are:

- model returns structured intent
- model does not return executable markup
- all fields are bounded and validated
- colors come from the saved brand kit
- the renderer decides exact HTML, CSS, and SVG syntax

## Required error behavior

### Input errors

Invalid input should be rejected synchronously with a `4xx` response:

- empty prompt
- invalid dimensions
- unsupported size preset
- invalid parent generation
- malformed request ID

### AI errors

Provider failures, timeouts, missing credentials, and invalid structured
responses should result in:

```json
{
  "status": "failed",
  "step": "brief",
  "error_code": "llm_timeout",
  "error": "The banner brief could not be generated. Please try again."
}
```

The detailed provider exception should be logged server-side with the
generation ID, but should not be returned blindly to the frontend.

### Composition and sanitization errors

These should also become failed generations:

```json
{
  "status": "failed",
  "step": "compose",
  "error_code": "composition_failed",
  "error": "The banner could not be composed safely."
}
```

```json
{
  "status": "failed",
  "step": "sanitize",
  "error_code": "sanitization_failed",
  "error": "The generated banner did not pass safety validation."
}
```

### HTTP behavior

Because generation is asynchronous:

- creation returns `202` when the job is accepted
- polling returns `200` with `queued` or `running`
- polling returns `200` with `done` and artifacts
- polling returns `200` with `failed` and the error fields
- authentication failures remain `401` or `404` according to the existing
  project access policy

The frontend must not interpret `202` as generation success. It must poll the
generation and inspect `status`.

## Implementation plan after approval

### Phase 1: Correct the contract

1. Replace or extend `BannerSpec` into a validated `BannerPlan`.
2. Add stable generation error fields:
   - `error_code`
   - `error`
3. Add optional request constraints without requiring them.
4. Add a migration for the new persisted fields if necessary.
5. Update the prompt to request the structured creative plan.

### Phase 2: Separate pipeline steps

1. Add an explicit input/context step.
2. Keep the brief step responsible only for the AI creative plan.
3. Add an optional art step driven by `artwork.enabled`.
4. Make the compose step consume the plan instead of using one mostly fixed
   layout.
5. Keep brand colors and safe font choices controlled by backend code.
6. Keep HTML/CSS/SVG out of the model response.

### Phase 3: Make failures reliable

1. Introduce a typed pipeline exception containing:
   - stage
   - error code
   - safe public message
   - original exception for logging
2. Update the runner before every stage.
3. Persist the actual failed stage.
4. Persist the safe error code and message.
5. Add tests for:
   - missing API key
   - provider timeout
   - invalid structured model response
   - composition error
   - sanitization error
   - failed polling response
6. Avoid returning a successful artifact when any required stage fails.

### Phase 4: Validate the complete API flow

1. Submit a user prompt with the existing project.
2. Confirm the request is `queued`.
3. Confirm the generation becomes `running`.
4. Confirm the AI plan is stored.
5. Confirm the HTML output contains the frontend canvas contract.
6. Confirm the output is sanitized.
7. Confirm a forced AI failure becomes `failed` with the correct stage and
   error code.
8. Confirm duplicate `request_id` remains idempotent.

### Phase 5: Production hardening

1. Replace in-process background tasks with a durable worker queue.
2. Recover stale `running` generations after worker or process failure.
3. Add rate limits and daily caps.
4. Add token and latency metadata.
5. Add asset/reference handling.
6. Add observability around generation ID, stage, provider, latency, and error
   category.

## Definition of done

The implementation should not be considered complete until all of the
following are true:

- A natural-language user prompt changes the generated creative plan.
- The AI can select different valid layouts and optional visual elements.
- The renderer consumes the AI plan rather than ignoring most of it.
- The frontend receives sanitized HTML in the expected canvas structure.
- No model response is treated as executable markup.
- Brand colors and safe rendering rules remain backend-controlled.
- An AI failure produces a persisted `failed` generation.
- The failed generation reports the correct step and stable error code.
- The frontend can distinguish queued, running, done, and failed states.
- Tests cover both successful and failed pipeline executions.
- The existing project-token and idempotency behavior remains intact.

## Approval checkpoint

No application code should be changed based on this review until the target
contract and implementation phases above are approved. This document is the
design and gap analysis requested before the next implementation pass.
