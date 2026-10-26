from fastapi import FastAPI


app = FastAPI(
    title="BrandBoard API",
    version="0.1.0",
    description="Backend API for on-brand banner generation.",
)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}
