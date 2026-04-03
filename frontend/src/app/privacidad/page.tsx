export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Política de Tratamiento de Datos Personales</h1>
          <p className="text-gray-500 text-sm mt-1">Última actualización: abril de 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">1. Responsable del tratamiento</h2>
          <p className="text-gray-600 text-sm">
            La empresa responsable del tratamiento de sus datos personales es la organización que publica
            las vacantes en esta plataforma, en cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">2. Datos que recopilamos</h2>
          <p className="text-gray-600 text-sm">Recopilamos los siguientes datos personales:</p>
          <ul className="text-gray-600 text-sm list-disc list-inside space-y-1">
            <li>Nombre completo</li>
            <li>Correo electrónico y teléfono</li>
            <li>Ciudad de residencia</li>
            <li>Hoja de vida (CV) y su contenido</li>
            <li>Dirección IP y fecha de aplicación</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">3. Finalidad del tratamiento</h2>
          <p className="text-gray-600 text-sm">Sus datos serán utilizados exclusivamente para:</p>
          <ul className="text-gray-600 text-sm list-disc list-inside space-y-1">
            <li>Evaluar su perfil para las vacantes disponibles</li>
            <li>Contactarle en caso de ser seleccionado</li>
            <li>Mantener un banco de talentos para futuras oportunidades</li>
            <li>Cumplir obligaciones legales aplicables</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">4. Derechos del titular</h2>
          <p className="text-gray-600 text-sm">Como titular de sus datos personales, usted tiene derecho a:</p>
          <ul className="text-gray-600 text-sm list-disc list-inside space-y-1">
            <li><strong>Conocer</strong> los datos que tenemos sobre usted</li>
            <li><strong>Actualizar</strong> sus datos personales</li>
            <li><strong>Rectificar</strong> información incorrecta</li>
            <li><strong>Solicitar la eliminación</strong> de sus datos (derecho al olvido)</li>
            <li><strong>Revocar</strong> su consentimiento en cualquier momento</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">5. Retención de datos</h2>
          <p className="text-gray-600 text-sm">
            Sus datos serán conservados por un período máximo de <strong>2 años</strong> desde la fecha
            de aplicación, o hasta que usted solicite su eliminación. Los datos de candidatos descartados
            se eliminan automáticamente después de 365 días.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">6. Seguridad de la información</h2>
          <p className="text-gray-600 text-sm">
            Implementamos medidas técnicas y administrativas para proteger sus datos contra acceso
            no autorizado, pérdida o divulgación, incluyendo cifrado en tránsito y en reposo,
            control de acceso por roles y registros de auditoría.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">7. Uso de inteligencia artificial</h2>
          <p className="text-gray-600 text-sm">
            Esta plataforma utiliza sistemas de inteligencia artificial para analizar hojas de vida
            y calcular compatibilidad con las vacantes. Este análisis es una herramienta de apoyo
            y las decisiones finales de contratación son tomadas por personas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">8. Solicitud de eliminación de datos</h2>
          <p className="text-gray-600 text-sm">
            Para ejercer su derecho al olvido o cualquier otro derecho sobre sus datos,
            puede enviar su solicitud indicando su nombre completo y correo electrónico con
            el que aplicó. Atenderemos su solicitud en un plazo máximo de 15 días hábiles.
          </p>
        </section>

        <div className="pt-4 border-t border-gray-100">
          <p className="text-gray-400 text-xs">
            Esta política cumple con la Ley 1581 de 2012 (Ley de Protección de Datos Personales)
            y el Decreto Reglamentario 1377 de 2013 de la República de Colombia.
          </p>
        </div>
      </div>
    </div>
  )
}