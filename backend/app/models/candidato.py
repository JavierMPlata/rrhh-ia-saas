from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from uuid import UUID

class CandidatoCreate(BaseModel):
    nombre_completo: str
    email: EmailStr
    telefono: Optional[str] = None
    ciudad: Optional[str] = None
    vacante_id: Optional[UUID] = None
    acepta_terminos: bool
    acepta_tratamiento_datos: bool

    @validator('nombre_completo')
    def nombre_no_vacio(cls, v):
        if len(v.strip()) < 3:
            raise ValueError('El nombre debe tener al menos 3 caracteres')
        return v.strip()

    @validator('acepta_terminos', 'acepta_tratamiento_datos')
    def debe_aceptar(cls, v):
        if not v:
            raise ValueError('Debes aceptar los términos para continuar')
        return v