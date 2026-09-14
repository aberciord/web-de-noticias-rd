export default function TermsOfUsePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">Términos de Uso</h1>
      <p className="text-sm text-slate-500 mb-8">Última actualización: septiembre de 2026</p>

      <div className="prose prose-slate max-w-none space-y-6">
        <p className="text-slate-700 leading-relaxed">
          Al acceder o usar El poder del pueblo RD ("el sitio"), aceptas los siguientes términos. Si no estás de
          acuerdo, por favor no uses el sitio.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8">1. Descripción del servicio</h2>
        <p className="text-slate-700 leading-relaxed">
          El poder del pueblo RD es un portal de noticias de la República Dominicana que publica notas periodísticas
          originales en las categorías de noticias, deportes, política y farándula, en español e inglés.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8">2. Comentarios y conducta del usuario</h2>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>Debes crear una cuenta para comentar en los artículos.</li>
          <li>No se permite lenguaje ofensivo, discurso de odio, spam ni contenido ilegal en los comentarios.</li>
          <li>Nos reservamos el derecho de eliminar cualquier comentario y suspender cuentas que violen estas reglas.</li>
          <li>Eres responsable del contenido que publiques con tu cuenta.</li>
        </ul>

        <h2 className="text-xl font-bold text-slate-900 mt-8">3. Propiedad intelectual y fuentes citadas</h2>
        <p className="text-slate-700 leading-relaxed">
          Todo el contenido editorial publicado en este sitio es redactado originalmente por nuestro equipo y
          herramientas de asistencia editorial, conforme a la Ley 65-00 sobre Derecho de Autor de la República
          Dominicana. No copiamos texto de terceros: cuando una nota se basa en información reportada por otro medio,
          citamos su nombre y enlazamos a la fuente original. El contenido de este sitio no puede reproducirse con
          fines comerciales sin autorización previa por escrito.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8">4. Exoneración de responsabilidad</h2>
        <p className="text-slate-700 leading-relaxed">
          La información se ofrece "tal cual". Hacemos nuestro mejor esfuerzo por garantizar su exactitud, pero no
          garantizamos que esté libre de errores. El sitio puede enlazar a sitios externos sobre los cuales no
          tenemos control ni responsabilidad.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8">5. Modificaciones</h2>
        <p className="text-slate-700 leading-relaxed">
          Podemos actualizar estos términos ocasionalmente. El uso continuado del sitio después de un cambio
          constituye tu aceptación de los nuevos términos.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8">6. Ley aplicable</h2>
        <p className="text-slate-700 leading-relaxed">
          Estos términos se rigen por las leyes de la República Dominicana, incluyendo la Ley 6132 de Expresión y
          Difusión del Pensamiento.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8">Contacto</h2>
        <p className="text-slate-700 leading-relaxed">
          Preguntas sobre estos términos:{' '}
          <a href="mailto:elpoderdelpueblord@gmail.com" className="text-red-600 hover:underline">
            elpoderdelpueblord@gmail.com
          </a>.
        </p>
      </div>
    </div>
  );
}
