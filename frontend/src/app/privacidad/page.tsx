import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidad — USB Bogotá RRHH',
  description: 'Política de tratamiento de datos personales del proceso de selección, Ley 1581 de 2012.',
}

export default function PoliticaPrivacidad() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gray-950 relative overflow-hidden">
        <div className="absolute -top-32 right-0 w-96 h-96 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="max-w-3xl mx-auto px-4 pt-12 pb-16 relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-gray-950 text-xs font-bold">
              USB
            </div>
            <div className="leading-tight">
              <p className="text-white text-sm font-semibold">Universidad de San Buenaventura</p>
              <p className="text-orange-400 text-xs">Bogotá D.C. · Talento Humano</p>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            Política de tratamiento de datos personales
          </h1>
          <p className="text-gray-400 mt-3 max-w-xl text-sm leading-relaxed">
            Cómo recolectamos, usamos y protegemos tus datos durante el proceso de
            selección de personal, en cumplimiento de la Ley Estatutaria 1581 de 2012
            y el Decreto 1377 de 2013.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">1</span>
            <h2 className="text-lg font-semibold text-gray-900">Responsable del tratamiento</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-4">
            La Universidad de San Buenaventura, sede Bogotá D.C., a través de su área de
            Talento Humano, es la responsable del tratamiento de los datos personales que
            recolecta este sistema para fines de selección y vinculación de personal.
          </p>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">2</span>
            <h2 className="text-lg font-semibold text-gray-900">Datos que recolectamos</h2>
          </div>
          <ul className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-4 space-y-2">
            <li className="flex items-start gap-2"><span className="text-orange-500 mt-0.5">·</span> Datos de identificación y contacto: nombre completo, correo electrónico, teléfono, ciudad.</li>
            <li className="flex items-start gap-2"><span className="text-orange-500 mt-0.5">·</span> Hoja de vida y su contenido: experiencia laboral, formación académica, habilidades.</li>
            <li className="flex items-start gap-2"><span className="text-orange-500 mt-0.5">·</span> Resultados del análisis automatizado de tu perfil frente a la vacante a la que aplicas.</li>
          </ul>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">3</span>
            <h2 className="text-lg font-semibold text-gray-900">Finalidad del tratamiento</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-4">
            Usamos tus datos exclusivamente para evaluar tu perfil frente a las vacantes
            disponibles, contactarte durante el proceso de selección y, si aplicas y eres
            seleccionado, iniciar tu proceso de vinculación laboral. No compartimos tu
            información con terceros ajenos al proceso de selección ni la usamos con fines
            comerciales o publicitarios.
          </p>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">4</span>
            <h2 className="text-lg font-semibold text-gray-900">Uso de inteligencia artificial</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-4">
            Tu hoja de vida es analizada por un sistema de inteligencia artificial que
            genera un puntaje de afinidad frente a la vacante, como apoyo al equipo de
            Talento Humano. Este análisis nunca es la única base de una decisión de
            contratación: toda recomendación es revisada por una persona antes de tomar
            cualquier decisión final.
          </p>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">5</span>
            <h2 className="text-lg font-semibold text-gray-900">Tiempo de conservación</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-4">
            Conservamos tus datos por un máximo de 2 años desde tu aplicación, o hasta que
            solicites su eliminación, lo que ocurra primero. Si eres vinculado laboralmente,
            tus datos pasan a regirse por las políticas de gestión de personal de la
            Universidad.
          </p>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">6</span>
            <h2 className="text-lg font-semibold text-gray-900">Tus derechos</h2>
          </div>
          <div className="bg-gray-950 rounded-xl p-5 space-y-2">
            <p className="text-sm text-gray-300">Como titular de tus datos, en cualquier momento puedes:</p>
            <ul className="text-sm text-gray-300 space-y-1.5 mt-2">
              <li className="flex items-start gap-2"><span className="text-orange-400 mt-0.5">✓</span> Conocer, actualizar y rectificar tus datos personales.</li>
              <li className="flex items-start gap-2"><span className="text-orange-400 mt-0.5">✓</span> Solicitar prueba de la autorización otorgada.</li>
              <li className="flex items-start gap-2"><span className="text-orange-400 mt-0.5">✓</span> Revocar la autorización o solicitar la supresión de tus datos, salvo obligación legal de conservarlos.</li>
              <li className="flex items-start gap-2"><span className="text-orange-400 mt-0.5">✓</span> Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley.</li>
            </ul>
            <Link
              href="/eliminar-datos"
              className="inline-block mt-3 text-sm font-semibold text-gray-950 bg-orange-500 hover:bg-orange-400 px-4 py-2 rounded-lg transition-colors"
            >
              Solicitar eliminación de mis datos →
            </Link>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">7</span>
            <h2 className="text-lg font-semibold text-gray-900">Contacto</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-4">
            Para ejercer tus derechos o resolver dudas sobre el tratamiento de tus datos,
            escríbenos a{' '}
            <a href="mailto:talentohumano@usbbog.edu.co" className="text-orange-600 hover:underline font-medium">
              talentohumano@usbbog.edu.co
            </a>.
          </p>
        </section>

        <div className="pt-4 border-t border-gray-100">
          <Link href="/" className="text-sm text-orange-600 hover:underline font-medium">
            ← Volver al formulario de aplicación
          </Link>
        </div>
      </div>
    </div>
  )
}
