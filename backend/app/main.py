from fastapi import FastAPI

from app.api.generations import router as generations_router
from app.api.projects import router as projects_router

app = FastAPI(
    title="BrandBoard API",
    version="0.1.0",
    description="Backend API for on-brand banner generation.",
)

app.include_router(projects_router)
app.include_router(generations_router)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}
