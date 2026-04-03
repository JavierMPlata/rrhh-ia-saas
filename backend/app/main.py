from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import candidatos, auth

app = FastAPI(
    title="RRHH-IA API",
    description="Sistema de gestion de RRHH con IA para startups colombianas",
    version="1.0.0"
)

# Orígenes permitidos
origins = [
    "http://localhost:3000",
    "https://localhost:3000",
]

# Agregar FRONTEND_URL si está configurado
if hasattr(settings, 'FRONTEND_URL') and settings.FRONTEND_URL:
    origins.append(settings.FRONTEND_URL)
    # También agregar con y sin www
    if settings.FRONTEND_URL.startswith('https://'):
        origins.append(settings.FRONTEND_URL.replace('https://', 'https://www.'))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(candidatos.router, prefix="/api/candidatos", tags=["Candidatos"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])

@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "RRHH-IA API",
        "version": "1.0.0"
    }