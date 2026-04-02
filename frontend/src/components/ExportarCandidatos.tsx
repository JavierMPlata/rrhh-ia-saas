'use client'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Candidato, Evaluacion } from '@/lib/supabase'

type CandidatoConEvaluacion = Candidato & {
  evaluaciones?: Evaluacion[]
  vacantes?: { titulo: string; departamento: string }
}

export default function ExportarCandidatos({
  candidatos
}: {
  candidatos: CandidatoConEvaluacion[]
}) {
  const [exportando, setExportando] = useState(false)

  const prepararDatos = () => {
    return candidatos.map(c => {
      const ev = c.evaluaciones?.[0]
      return {
        nombre: c.nombre_completo,
        email: c.email,
        telefono: c.telefono || '',
        ciudad: c.ciudad || '',
        vacante: (c.vacantes as any)?.titulo || 'Sin vacante',
        estado: c.estado,
        score_total: ev ? Number(ev.score_total).toFixed(1) : 'Sin analizar',
        score_habilidades: ev ? Number(ev.score_habilidades).toFixed(1) : '',
        score_experiencia: ev ? Number(ev.score_experiencia).toFixed(1) : '',
        score_educacion: ev ? Number(ev.score_educacion).toFixed(1) : '',
        score_fit_cultural: ev ? Number(ev.score_fit_cultural).toFixed(1) : '',
        recomendacion: ev?.recomendacion || '',
        experiencia_anos: ev ? ev.experiencia_anos : '',
        nivel_educativo: ev?.nivel_educativo || '',
        ultimo_cargo: ev?.ultimo_cargo || '',
        ultima_empresa: ev?.ultima_empresa || '',
        habilidades: ev?.habilidades_detectadas?.join(', ') || '',
        resumen: ev?.resumen_perfil || '',
        fecha_aplicacion: new Date(c.created_at).toLocaleDateString('es-CO'),
      }
    })
  }

  const exportarExcel = async () => {
    setExportando(true)
    try {
      const datos = prepararDatos()

      const encabezados = {
        nombre: 'Nombre completo',
        email: 'Email',
        telefono: 'Teléfono',
        ciudad: 'Ciudad',
        vacante: 'Vacante',
        estado: 'Estado',
        score_total: 'Score total',
        score_habilidades: 'Score habilidades',
        score_experiencia: 'Score experiencia',
        score_educacion: 'Score educación',
        score_fit_cultural: 'Score fit cultural',
        recomendacion: 'Recomendación IA',
        experiencia_anos: 'Años experiencia',
        nivel_educativo: 'Nivel educativo',
        ultimo_cargo: 'Último cargo',
        ultima_empresa: 'Última empresa',
        habilidades: 'Habilidades detectadas',
        resumen: 'Resumen perfil',
        fecha_aplicacion: 'Fecha aplicación',
      }

      const filas = [
        Object.values(encabezados),
        ...datos.map(d => Object.values(d))
      ]

      const ws = XLSX.utils.aoa_to_sheet(filas)

      // Estilo de encabezados
      const rango = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      for (let col = rango.s.c; col <= rango.e.c; col++) {
        const celda = XLSX.utils.encode_cell({ r: 0, c: col })
        if (ws[celda]) {
          ws[celda].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: '6366F1' } }
          }
        }
      }

      // Ancho de columnas automático
      ws['!cols'] = Object.keys(encabezados).map((key, i) => ({
        wch: Math.max(
          encabezados[key as keyof typeof encabezados].length,
          ...datos.map(d => String(Object.values(d)[i] || '').length)
        ) + 2
      }))

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Candidatos')

      const fecha = new Date().toLocaleDateString('es-CO').replace(/\//g, '-')
      XLSX.writeFile(wb, `candidatos_${fecha}.xlsx`)
    } finally {
      setExportando(false)
    }
  }

  const exportarPDF = async () => {
    setExportando(true)
    try {
      const datos = prepararDatos()
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      // Encabezado
      doc.setFillColor(99, 102, 241)
      doc.rect(0, 0, 297, 20, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Reporte de Candidatos — Sistema RRHH con IA', 14, 13)

      // Fecha
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const fecha = new Date().toLocaleDateString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric'
      })
      doc.text(`Generado: ${fecha}`, 250, 13)

      // Estadísticas rápidas
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      const preseleccionados = candidatos.filter(c => c.estado === 'preseleccionado').length
      const conAnalisis = candidatos.filter(c => c.evaluaciones?.length).length
      doc.text(`Total: ${candidatos.length} candidatos  |  Preseleccionados: ${preseleccionados}  |  Analizados por IA: ${conAnalisis}`, 14, 28)

      // Tabla
      autoTable(doc, {
        startY: 32,
        head: [[
          'Nombre', 'Email', 'Vacante', 'Estado',
          'Score', 'Recomendación', 'Experiencia', 'Educación', 'Fecha'
        ]],
        body: datos.map(d => [
          d.nombre,
          d.email,
          d.vacante,
          d.estado,
          d.score_total,
          d.recomendacion || '—',
          d.experiencia_anos ? `${d.experiencia_anos} años` : '—',
          d.nivel_educativo || '—',
          d.fecha_aplicacion
        ]),
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [99, 102, 241],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [245, 247, 255],
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 45 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25 },
          4: { cellWidth: 18, halign: 'center' },
          5: { cellWidth: 25, halign: 'center' },
          6: { cellWidth: 22, halign: 'center' },
          7: { cellWidth: 22 },
          8: { cellWidth: 22, halign: 'center' },
        },
        didParseCell: (data) => {
          // Colorear scores
          if (data.column.index === 4 && data.section === 'body') {
            const score = parseFloat(data.cell.text[0])
            if (score >= 80) data.cell.styles.textColor = [16, 185, 129]
            else if (score >= 60) data.cell.styles.textColor = [245, 158, 11]
            else if (!isNaN(score)) data.cell.styles.textColor = [239, 68, 68]
          }
          // Colorear recomendaciones
          if (data.column.index === 5 && data.section === 'body') {
            const rec = data.cell.text[0]
            if (rec === 'contratar') data.cell.styles.textColor = [16, 185, 129]
            else if (rec === 'entrevistar') data.cell.styles.textColor = [99, 102, 241]
            else if (rec === 'descartar') data.cell.styles.textColor = [239, 68, 68]
          }
        }
      })

      // Pie de página
      const totalPaginas = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Página ${i} de ${totalPaginas} — Sistema RRHH con IA — Confidencial`,
          14, 200
        )
      }

      const fechaArchivo = new Date().toLocaleDateString('es-CO').replace(/\//g, '-')
      doc.save(`candidatos_${fechaArchivo}.pdf`)
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={exportarExcel}
        disabled={exportando || candidatos.length === 0}
        className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700
                   disabled:bg-gray-300 text-white rounded-lg text-xs font-medium transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Excel
      </button>
      <button
        onClick={exportarPDF}
        disabled={exportando || candidatos.length === 0}
        className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700
                   disabled:bg-gray-300 text-white rounded-lg text-xs font-medium transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        PDF
      </button>
    </div>
  )
}