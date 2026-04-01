from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from app.database import supabase

router = APIRouter()
security = HTTPBearer()

class TokenPayload(BaseModel):
    user_id: str
    email: str
    role: str

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenPayload:
    token = credentials.credentials
    try:
        response = supabase.auth.get_user(token)
        if not response.user:
            raise HTTPException(status_code=401, detail="Token inválido")
        return TokenPayload(
            user_id=response.user.id,
            email=response.user.email,
            role="rrhh"
        )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="No autorizado. Token inválido o expirado."
        )

@router.get("/me")
def get_me(user: TokenPayload = Depends(get_current_user)):
    return {
        "user_id": user.user_id,
        "email": user.email,
        "role": user.role
    }