# AI-First Generation Workaround Strategy

## Executive diagnosis

The current generation response can be marked `done` even when the AI has not
meaningfully generated or selected the visual result.

The current implementation performs an AI brief call, but the renderer still
uses backend defaults for most of the banner:

- The HTML layout is hard-coded in `compose_html()`.
- The inline SVG artwork is hard-coded in `_artwork_svg()`.
- The SVG fallback is hard-coded in `compose_svg()`.
- `MODEL_ART` is configured but is not called by the runner.
- `art_prompt` is collected from the brief but is not consumed by an art step.
- The selected `layout` does not meaningfully select a rendering strategy.
- Badge, highlight, artwork type, artwork placement, and visual details are
  mostly renderer defaults.

Therefore, a valid `BannerSpec` proves only that the brief model returned
parseable copy metadata. It does **not** prove that AI generated the artwork,
selected the composition, or controlled the final banner.

The empty `error` field is not itself evidence that the AI succeeded. It only
means no exception was raised. The system currently has no provenance or
contribution tracking to distinguish:

1. AI-generated values.
2. Backend-selected values.
3. Default fallback values.
4. Values omitted because an optional AI step was never executed.

The priority fix is therefore observability and AI provenance, not only
prompt improvement.

## What the current response proves

The response proves that:

- A generation record was created.
- The generation reached `done`.
- A brief-shaped object was persisted.
- HTML and SVG strings were persisted.
- No uncaught pipeline exception was recorded.

The response does **not** prove that:

- The AI selected the final layout.
- The AI generated or selected artwork.
- The AI output controlled the rendered composition.
- The artwork was based on `art_prompt`.
- The HTML and SVG were rendered from the same AI design plan.
- The final sanitized output remained visually complete.

## Why the current `error` field is blank

The current runner has a success path equivalent to:

```text
brief model returns a valid BannerSpec
  -> compose hard-coded HTML
  -> compose hard-coded SVG
  -> sanitize
  -> status = done
  -> error = null
```

No error occurs because the missing art step is not treated as an error. It is
silently skipped. The fallback renderer is considered a successful completion.

This is the core reliability problem:

> A required AI contribution can be absent while the generation still reports
> success.

The system must either:

1. Make the AI contribution mandatory and fail when it is unavailable; or
2. Explicitly label the result as fallback/degraded and expose that state to
   the frontend.

For the requested AI-first behavior, the recommended policy is:

- Brief AI failure: generation fails.
- Required art AI failure: generation fails.
- Optional art AI omission: generation succeeds only with an explicit
  `degraded`/`fallback` marker.
- Silent fallback: never allowed.

## Workaround strategy

The strategy is intentionally incremental. It gives the product a reliable
AI-first path without requiring an immediate image-generation provider.

### Phase 1: Make AI contribution observable

Add generation provenance fields and persist them with every result.

Recommended fields:

```text
ai_status
ai_brief_status
ai_art_status
render_status
degraded
fallback_used
fallback_reason
brief_provider
brief_model
art_provider
art_model
brief_attempts
art_attempts
```

Recommended values:

```text
ai_status:
  pending | running | completed | failed | skipped

ai_brief_status:
  pending | completed | failed

ai_art_status:
  pending | completed | failed | skipped

render_status:
  pending | completed | failed
```

The persisted generation should also contain a provenance object:

```json
{
  "brief": {
    "source": "openrouter",
    "model": "provider/model",
    "status": "completed",
    "attempts": 1,
    "fields_used": [
      "layout",
      "headline",
      "subtext",
      "cta",
      "tone"
    ]
  },
  "art": {
    "source": "openrouter",
    "model": "provider/model",
    "status": "completed",
    "attempts": 1,
    "prompt": "A mobile voting interface...",
    "used_in_output": true
  },
  "renderer": {
    "layout_source": "ai",
    "art_source": "ai",
    "fallback_used": false
  }
}
```

This makes it impossible to infer AI success merely from `status="done"`.

### Phase 2: Separate AI plan from rendering defaults

Replace the current narrow `BannerSpec` role with a validated creative plan.
The model must choose bounded creative decisions that the renderer actually
consumes.

Minimum plan fields:

```json
{
  "layout": "image_right",
  "visual_style": "playful_product",
  "text_alignment": "left",
  "brand_label": "Balotly",
  "badge": "NEW FEATURE",
  "headline": "Award voting is live.",
  "highlight": "is live.",
  "subtext": "Voters pay for their votes and cast up to 10 at a time.",
  "cta": "Create yours",
  "artwork": {
    "enabled": true,
    "kind": "product_mockup",
    "placement": "right",
    "prompt": "A mobile voting interface with nominee card and vote controls"
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

Important rule:

> Every required AI field must affect the final output, or it must not be
> requested from the model.

Examples:

- `layout=image_right` must produce a right-side artwork composition.
- `layout=centered` must not render the image-right template.
- `artwork.kind=product_mockup` must select the product mockup renderer.
- `artwork.enabled=false` must not render artwork.
- `highlight` must appear in the headline or be normalized before rendering.
- `decorations` must select approved backend decoration primitives.

### Phase 3: Implement an explicit art step

The current `MODEL_ART` setting must become an actual pipeline stage.

Proposed flow:

```text
brief
  -> validate BannerPlan
  -> if artwork.enabled:
       art
         -> call MODEL_ART
         -> request structured ArtPlan or safe SVG
         -> validate response
     else:
       mark art as skipped with explicit reason
  -> compose
```

The first workaround does not need unrestricted AI-generated SVG. A safer
initial approach is to ask the art model for a structured `ArtPlan`:

```json
{
  "kind": "product_mockup",
  "subject": "mobile voting interface",
  "placement": "right",
  "accent_shapes": ["badge", "coin"],
  "details": ["nominee card", "vote counter", "primary action"]
}
```

The backend then renders that plan using approved SVG primitives. This allows
AI-driven artwork selection while avoiding arbitrary executable markup.

Later, a controlled AI SVG path can be added if the sanitizer and geometry
validator are sufficiently strict.

### Phase 4: Make fallback behavior explicit

The renderer should not silently substitute defaults.

Each renderer decision should have a source:

```text
ai
project_brand_default
system_default
fallback
```

Example:

```json
{
  "layout": {
    "value": "image_right",
    "source": "ai"
  },
  "artwork": {
    "value": "product_mockup",
    "source": "ai"
  },
  "font": {
    "value": "Inter",
    "source": "project_brand_default"
  },
  "background": {
    "value": "#F0FDF4",
    "source": "project_brand_default"
  }
}
```

If a fallback is used, persist:

```json
{
  "degraded": true,
  "fallback_used": true,
  "fallback_reason": "art_model_unavailable",
  "error_code": "ai_art_unavailable"
}
```

Do not set `error=null` for a degraded output. Use a separate error or warning
contract so the frontend can decide whether to show a warning.

Recommended status behavior:

```text
AI fully completed:
  status = done
  degraded = false
  error_code = null

AI failed and fallback is forbidden:
  status = failed
  degraded = false
  error_code = ai_brief_failed or ai_art_failed

AI partially completed and fallback is explicitly allowed:
  status = done
  degraded = true
  fallback_used = true
  error_code = ai_art_fallback
```

### Phase 5: Validate the rendered result

After compose and sanitize, add a final `validate_output` stage.

The stage should verify:

- HTML contains the expected canvas element.
- Canvas dimensions match the generation dimensions.
- Selected layout classes/elements are present.
- Required AI-selected text appears.
- Highlight is valid or has been normalized.
- Artwork appears when `artwork.enabled=true`.
- Artwork does not appear when disabled.
- SVG geometry attributes required by the chosen art renderer remain present.
- HTML and SVG are generated from the same plan.
- No required output was silently removed by sanitization.

If validation fails:

```json
{
  "status": "failed",
  "step": "validate_output",
  "error_code": "invalid_rendered_output",
  "error": "The generated banner did not pass output validation."
}
```

The output must never become `done` merely because the sanitizer returned a
string.

## Error tracking contract

The existing `error` field is insufficient by itself. Use both a stable code
and a safe message.

Recommended error codes:

```text
input_invalid
llm_configuration
llm_timeout
llm_provider_error
llm_invalid_output
ai_brief_failed
ai_art_failed
ai_art_unavailable
composition_failed
sanitization_failed
invalid_rendered_output
generation_timeout
worker_failed
```

Example failed AI brief response:

```json
{
  "status": "failed",
  "step": "brief",
  "ai_status": "failed",
  "ai_brief_status": "failed",
  "error_code": "llm_invalid_output",
  "error": "The AI did not return a valid creative plan. Please try again.",
  "fallback_used": false,
  "degraded": false
}
```

The detailed provider exception should be logged server-side with:

- generation ID
- project ID
- stage
- provider
- model
- attempt number
- latency
- exception type

Do not expose raw API keys, full provider payloads, or sensitive prompt
material in the public error field.

## Recommended implementation order

### Step 1: Provenance and schema

Add:

- `error_code`
- `degraded`
- `fallback_used`
- `fallback_reason`
- `ai_status`
- `ai_brief_status`
- `ai_art_status`
- `render_status`
- persisted provenance JSON

This is the highest-priority observability change.

### Step 2: Make the current brief authoritative

Until the art step is implemented:

- Use the AI-selected layout in the renderer.
- Use AI-selected badge, highlight, tone, and artwork intent.
- Do not claim AI artwork generation.
- Mark artwork as `skipped` or `fallback`.
- Mark the result degraded if the product requires artwork.

This immediately prevents the current false impression that the AI generated
the entire banner.

### Step 3: Add the structured art step

Implement `app/pipeline/steps/art.py`:

- Call `MODEL_ART`.
- Request structured `ArtPlan`, not arbitrary HTML.
- Validate the result.
- Render approved SVG primitives from the plan.
- Record model, attempts, and source.

### Step 4: Refactor composition around the plan

Update composition so it receives:

```text
project brand kit
validated BannerPlan
validated ArtPlan or explicit no-art state
```

It must not silently construct an unrelated default banner.

### Step 5: Add output validation and failure tests

Required tests:

1. Brief returns valid JSON and is used.
2. Brief returns prose twice and generation fails with
   `llm_invalid_output`.
3. Art is requested and successfully used.
4. Art model fails and generation fails or explicitly becomes degraded,
   depending on configured policy.
5. Layout changes produce different renderer branches.
6. Highlight is normalized or rejected.
7. Fallback usage is persisted.
8. Sanitization does not remove required geometry.
9. Final output validation rejects incomplete artwork.
10. A successful response contains provenance proving AI contribution.

## Temporary workaround before full implementation

Until the full art step is ready, use this safe interim policy:

1. Rename the current output behavior internally as `brief_plus_template`,
   not AI-generated banner.
2. Add `degraded=true` whenever artwork is supplied by the backend fallback.
3. Set:

```text
ai_brief_status = completed
ai_art_status = skipped
fallback_used = true
fallback_reason = art_step_not_implemented
```

4. Return a warning to the frontend:

```json
{
  "code": "ai_art_skipped",
  "message": "The banner was generated from the AI brief using default artwork."
}
```

5. Do not leave `error` blank when a required AI stage was skipped. Use
   `error_code="ai_art_unavailable"` if the product requires AI artwork.

This workaround is honest, debuggable, and prevents the frontend or operator
from assuming that a hard-coded fallback was generated by the model.

## Definition of success

The corrected pipeline is successful only when the response can answer all of
these questions:

1. Which AI model was called?
2. Which AI stages ran?
3. What AI fields were used?
4. Which renderer branch was selected?
5. Was artwork AI-generated, backend-selected, or fallback?
6. Was any fallback used?
7. If the AI failed, why did the generation finish or fail?
8. Does the final artifact reflect the stored plan?
9. Did sanitization preserve all required renderable geometry?
10. Can the frontend distinguish complete AI output from degraded output?

Until those answers are persisted and testable, `status="done"` is not enough
to claim an AI-generated banner.

## Approval checkpoint

This document is the workaround strategy and implementation direction. The
next code change should begin with provenance/error schema changes, then wire
the AI plan and art stages into composition. No silent fallback should remain.
