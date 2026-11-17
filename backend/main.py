import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings, PROJECT_ROOT
from backend.models.database import init_db
from backend.scripts.ingest import ingest_laws
from backend.routers import chat, voice, document, traffic, complaint, lawyers, feedback, admin
from backend.services import speech_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("nyayasathi.backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize SQLite database & ensure legal chunks are ingested
    logger.info("Starting NyayaSathi Backend Service...")
    init_db()
    count = ingest_laws(force_reingest=False)
    logger.info(f"Knowledge Base Ready: {count} active legal chunks available.")
    speech_service.warmup_async()
    yield
    # Shutdown
    logger.info("Shutting down NyayaSathi Backend Service...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Multilingual Indian Legal Awareness AI Assistant Backend",
    lifespan=lifespan
)

# Enable CORS for Web and Mobile clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development/demo, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register MVC Routers
app.include_router(chat.router)
app.include_router(voice.router)
app.include_router(document.router)
app.include_router(traffic.router)
app.include_router(complaint.router)
app.include_router(lawyers.router)
app.include_router(feedback.router)
app.include_router(admin.router)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "models": {
            "chat": settings.GEMINI_CHAT_MODEL,
            "embedding": settings.GEMINI_EMBEDDING_MODEL
        }
    }

# Mount static web frontend & SPA fallback
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
dist_dir = PROJECT_ROOT / "frontend" / "dist"

if dist_dir.exists():
    expo_dir = dist_dir / "_expo"
    assets_dir = dist_dir / "assets"
    if expo_dir.exists():
        app.mount("/_expo", StaticFiles(directory=str(expo_dir)), name="expo_static")

    import os
    import urllib.parse
    from fastapi.responses import Response

    @app.api_route("/assets/{asset_path:path}", methods=["GET", "HEAD"])
    def serve_assets(asset_path: str):
        # Decode and resolve path to allow .pnpm and nested asset paths without Starlette dot-blocking or Windows MAX_PATH
        decoded_path = urllib.parse.unquote(asset_path).replace("/", "\\")
        raw_target = os.path.abspath(os.path.join(str(dist_dir), "assets", decoded_path))
        extended_target = "\\\\?\\" + raw_target if not raw_target.startswith("\\\\?\\") else raw_target
        if os.path.isfile(extended_target):
            mime = "font/ttf" if raw_target.endswith(".ttf") else ("image/png" if raw_target.endswith(".png") else "application/octet-stream")
            with open(extended_target, "rb") as f:
                content = f.read()
            return Response(
                content=content,
                media_type=mime,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                    "Cache-Control": "public, max-age=31536000",
                }
            )
        return FileResponse(str(dist_dir / "index.html"))

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
    def serve_spa_frontend(full_path: str):
        # If requesting a physical file (e.g. favicon.ico, metadata.json), return it
        target_file = (dist_dir / full_path).resolve()
        if full_path and target_file.is_file():
            return FileResponse(str(target_file))
        # Otherwise return index.html for SPA client-side routing with no-cache header
        return FileResponse(
            str(dist_dir / "index.html"),
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)
