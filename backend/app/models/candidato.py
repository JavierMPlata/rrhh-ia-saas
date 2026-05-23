from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from uuid import UUID
import re

class CandidatoCreate(BaseModel):
    nombre_completo: str
    email: EmailStr
    telefono: str | None = None
    ciudad: str | None = None
    vacante_id: str | None = None
    acepta_terminos: bool
    acepta_tratamiento_datos: bool

    @validator('acepta_terminos', 'acepta_tratamiento_datos', pre=True)
    def debe_ser_booleano(cls, v):
        # Rechaza cualquier valor que no sea True/False puro
        if not isinstance(v, bool):
            raise ValueError('Debe ser un valor booleano')
        if not v:
            raise ValueError('El consentimiento es obligatorio')
        return v

    @validator('telefono')
    def telefono_valido(cls, v):
        if v and not re.match(r'^[0-9+\-\s]{7,15}$', v):
            raise ValueError('Teléfono inválido')
        return v

    @validator('vacante_id')
    def vacante_id_valido(cls, v):
        if v:
            uuid_regex = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            if not re.match(uuid_regex, v, re.IGNORECASE):
                raise ValueError('vacante_id inválido')
        return v

    @validator('ciudad', 'nombre_completo')
    def sin_caracteres_peligrosos(cls, v):
        if v:
            # Rechaza path traversal y caracteres de inyección
            patrones_peligrosos = ['../', '..\\', '/etc/', 'c:\\', 'c:/', '<', '>', '{', '}']
            for patron in patrones_peligrosos:
                if patron.lower() in v.lower():
                    raise ValueError('Valor no permitido')
        return v