import httpx
from datetime import datetime
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import EmailStr
from typing import Optional
from app.database import supabase
from app.config import settings
from app.services.ia_service import extraer_texto_cv
from app.routes.auth import get_current_user, TokenPayload
from fastapi import Depends

router = APIRouter()

@router.post("/aplicar")
async def aplicar_vacante(
    request: Request,
    nombre_completo: str = Form(...),
    email: EmailStr = Form(...),
    telefono: str = Form(""),
    ciudad: str = Form(""),
    vacante_id: Optional[str] = Form(None),
    acepta_terminos: bool = Form(...),
    acepta_tratamiento_datos: bool = Form(...),
    cv: UploadFile = File(...)
):
    # 1. Validaciones
    if not acepta_terminos or not acepta_tratamiento_datos:
        raise HTTPException(
            status_code=400,
            detail="Debes aceptar los términos y el tratamiento de datos"
        )

    tipos_permitidos = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    if cv.content_type not in tipos_permitidos:
        raise HTTPException(
            status_code=400,
            detail="Solo se aceptan archivos PDF o Word (.docx)"
        )

    # 2. Verificar email duplicado
    existing = supabase.table("candidatos").select("id").eq(
        "email", email
    ).execute()
    if existing.data:
        raise HTTPException(
            status_code=409,
            detail="Ya existe una aplicación con este correo electrónico."
        )

    # 3. Leer CV
    cv_content = await cv.read()
    if len(cv_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El archivo no debe superar 10MB")

    # 4. Subir CV a Storage
    extension = cv.filename.split('.')[-1] if cv.filename else 'pdf'
    timestamp = int(datetime.now().timestamp())
    nombre_archivo_storage = f"{email.replace('@','_')}_{timestamp}.{extension}"

    supabase.storage.from_("cvs").upload(
        path=nombre_archivo_storage,
        file=cv_content,
        file_options={"content-type": cv.content_type}
    )

    cv_url = f"{settings.SUPABASE_URL}/storage/v1/object/cvs/{nombre_archivo_storage}"

    # 5. Extraer texto del CV
    texto_cv = extraer_texto_cv(cv_content, cv.content_type)

    # 6. Guardar candidato en BD
    ip_cliente = request.client.host if request.client else None
    candidato_data = {
        "nombre_completo": nombre_completo.strip(),
        "email": email.lower(),
        "telefono": telefono or None,
        "ciudad": ciudad or None,
        "vacante_id": str(vacante_id) if vacante_id else None,
        "cv_url": cv_url,
        "cv_nombre_archivo": cv.filename,
        "cv_mime_type": cv.content_type,
        "cv_texto_extraido": texto_cv,
        "estado": "recibido",
        "acepta_terminos": acepta_terminos,
        "acepta_tratamiento_datos": acepta_tratamiento_datos,
        "fecha_consentimiento": datetime.now().isoformat(),
        "ip_aplicacion": ip_cliente,
        "fuente": "formulario_web"
    }

    result = supabase.table("candidatos").insert(candidato_data).execute()
    candidato_id = result.data[0]["id"]

    # 7. Disparar webhook n8n (sin bloquear la respuesta)
    await disparar_webhook_n8n(
        candidato_id=candidato_id,
        candidato_nombre=nombre_completo,
        candidato_email=email,
        vacante_id=str(vacante_id) if vacante_id else None,
        cv_texto=texto_cv,
        cv_url=cv_url
    )

    return JSONResponse(
        status_code=201,
        content={
            "message": "Tu aplicación fue recibida exitosamente.",
            "candidato_id": candidato_id
        }
    )


async def disparar_webhook_n8n(
    candidato_id: str,
    candidato_nombre: str,
    candidato_email: str,
    vacante_id: Optional[str],
    cv_texto: str,
    cv_url: str
):
    webhook_url = settings.N8N_WEBHOOK_URL if hasattr(settings, 'N8N_WEBHOOK_URL') else ""
    if not webhook_url:
        print("Warning: N8N_WEBHOOK_URL no configurado aún")
        return

    payload = {
        "candidato_id": candidato_id,
        "nombre": candidato_nombre,
        "email": candidato_email,
        "vacante_id": vacante_id,
        "cv_texto": cv_texto[:8000],
        "cv_url": cv_url,
        "timestamp": datetime.now().isoformat(),
        "secreto": settings.N8N_WEBHOOK_SECRET
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(webhook_url, json=payload)
    except Exception as e:
        print(f"Warning: No se pudo contactar n8n: {e}")


@router.get("/", dependencies=[Depends(get_current_user)])
def listar_candidatos(
    estado: Optional[str] = None,
    vacante_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    query = supabase.table("candidatos").select(
        "*, evaluaciones(*), vacantes(titulo, departamento)"
    )
    if estado:
        query = query.eq("estado", estado)
    if vacante_id:
        query = query.eq("vacante_id", vacante_id)

    result = query.order("created_at", desc=True).range(
        offset, offset + limit - 1
    ).execute()
    return {"candidatos": result.data, "total": len(result.data)}


@router.patch("/{candidato_id}/estado", dependencies=[Depends(get_current_user)])
def actualizar_estado(candidato_id: str, nuevo_estado: str):
    estados_validos = [
        "recibido", "en_proceso", "analizado",
        "preseleccionado", "descartado", "banco_talentos"
    ]
    if nuevo_estado not in estados_validos:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido: {nuevo_estado}"
        )

    result = supabase.table("candidatos").update(
        {"estado": nuevo_estado}
    ).eq("id", candidato_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")

    return {"message": "Estado actualizado", "candidato": result.data[0]}