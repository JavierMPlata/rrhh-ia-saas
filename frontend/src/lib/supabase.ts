import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export type Candidato = {
  id: string
  nombre_completo: string
  email: string
  telefono?: string
  ciudad?: string
  vacante_id?: string
  cv_url?: string
  cv_nombre_archivo?: string
  estado: 'recibido' | 'en_proceso' | 'analizado' | 'preseleccionado' | 'descartado' | 'banco_talentos'
  acepta_terminos: boolean
  acepta_tratamiento_datos: boolean
  notas?: string
  created_at: string
}

export type Evaluacion = {
  id: string
  candidato_id: string
  score_habilidades: number
  score_experiencia: number
  score_educacion: number
  score_fit_cultural: number
  score_total: number
  habilidades_detectadas: string[]
  experiencia_anos: number
  nivel_educativo: string
  ultimo_cargo?: string
  ultima_empresa?: string
  resumen_perfil: string
  fortalezas: string[]
  areas_mejora: string[]
  recomendacion: 'contratar' | 'entrevistar' | 'descartar'
  justificacion_recomendacion: string
  alerta_sesgo: boolean
  created_at: string
}

export type Vacante = {
  id: string
  titulo: string
  descripcion: string
  departamento?: string
  salario_min?: number
  salario_max?: number
  modalidad: 'presencial' | 'remoto' | 'hibrido'
  estado: 'activa' | 'pausada' | 'cerrada'
  habilidades_requeridas: string[]
  experiencia_minima: number
  educacion_requerida?: string
  valores_empresa?: string[]
}

export type PerfilUsuario = {
  id: string
  user_id: string
  nombre_completo: string
  rol: 'admin' | 'rrhh_senior' | 'rrhh_junior'
  activo: boolean
  created_at: string
}

export type EmpresaConfig = {
  id: string
  nombre: string
  nit?: string
  descripcion?: string
  sector?: string
  ciudad?: string
  direccion?: string
  telefono?: string
  email_contacto?: string
  website?: string
  logo_url?: string
  color_primario: string
}

export type Auditoria = {
  id: number
  user_id: string
  user_email: string
  accion: string
  entidad?: string
  entidad_id?: string
  detalle?: any
  created_at: string
}