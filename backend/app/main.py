from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import settings
from app.routes import candidatos, auth

# CORREGIDO: app se crea primero, luego se configura el limiter
app = FastAPI(
    title="RRHH-IA API",
    description="Sistema de gestión de personal con IA para la Universidad de San Buenaventura Bogotá",
    version="1.0.0"
)

# Rate limiting global
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Orígenes permitidos — explícitos para no depender solo de variables de entorno
origins = [
    "http://localhost:3000",
    "https://localhost:3000",
    "https://rrhh-ia-saas.vercel.app",
    "https://www.rrhh-ia-saas.vercel.app",
]

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