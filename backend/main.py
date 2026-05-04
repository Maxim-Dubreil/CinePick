from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from supabase_client import supabase

app = FastAPI(title="CinePick API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "CinePick API is running"}

# Liveness of the app
@app.get("/health")
async def health():
    return {"status": "ok"}

# Readiness of the app (DB connection, etc.)
@app.get("/health/ready")
async def health_ready():
    """Readiness probe: l'app est prête à recevoir du trafic (DB OK)."""
    try:
        # Ping minimal : on demande un seul ID, sans matcher de ligne particulière.
        # Coûte quasi rien à Supabase et valide que la connexion + RLS fonctionnent.
        supabase.table("profiles").select("id").limit(1).execute()
        return {"status": "ready", "checks": {"database": "ok"}}
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={"status": "not_ready", "error": str(e)},
        ) from e
