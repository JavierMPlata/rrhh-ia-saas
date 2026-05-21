from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import candidatos, auth

app = FastAPI(
    title="RRHH-IA API",
    description="Sistema de gestión de personal con IA para la Universidad de San Buenaventura Bogotá",
    version="1.0.0"
)

# Orígenes permitidos — explícitos para no depender solo de variables de entorno
origins = [
    "http://localhost:3000",
    "https://localhost:3000",
    "https://rrhh-ia-saas.vercel.app",        # producción Vercel — explícito
    "https://www.rrhh-ia-saas.vercel.app",     # con www por si acaso
]

# Agregar FRONTEND_URL de variable de entorno si existe y no está ya en la lista
if hasattr(settings, 'FRONTEND_URL') and settings.FRONTEND_URL:
    if settings.FRONTEND_URL not in origins:
        origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(candidatos.router, prefix="/api/candidatos", tags=["Candidatos"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])

@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "RRHH-IA API",
        "version": "1.0.0",
        "origins_permitidos": origins
    }