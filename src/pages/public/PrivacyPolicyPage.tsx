export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">Política de Privacidad</h1>
      <p className="text-sm text-slate-500 mb-8">Última actualización: septiembre de 2026</p>

      <div className="prose prose-slate max-w-none space-y-6">
        <p className="text-slate-700 leading-relaxed">
          El poder del pueblo RD ("nosotros") respeta tu privacidad y trata tus datos personales conforme a la
          Ley No. 172-13 sobre Protección de Datos de Carácter Personal de la República Dominicana. Esta política
          explica qué información recopilamos, para qué la usamos y qué derechos tienes sobre ella.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8">1. Información que recopilamos</h2>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>Correo electrónico y contraseña, si creas una cuenta para comentar en los artículos.</li>
          <li>El contenido de los comentarios que publiques.</li>
          <li>Tu correo electrónico, si te suscribes a nuestro boletín de noticias.</li>
          <li>Tu preferencia de idioma (español/inglés), guardada localmente en tu navegador.</li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          No recopilamos datos de navegación con fines publicitarios ni compartimos tu información con terceros
          para fines de mercadeo.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8">2. Para qué usamos tu información</h2>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>Permitirte iniciar sesión y publicar comentarios bajo tu identidad.</li>
          <li>Moderar comentarios y aplicar nuestras reglas de comunidad.</li>
          <li>Enviarte el boletín de noticias, si te suscribiste voluntariamente.</li>
          <li>Mostrar el sitio en el idioma que prefieras.</li>
        </ul>

        <h2 className="text-xl font-bold text-slate-900 mt-8">3. Con quién compartimos datos</h2>
        <p className="text-slate-700 leading-relaxed">
          Usamos <strong>Supabase</strong> como proveedor de base de datos y autenticación para almacenar cuentas,
          comentarios y suscripciones de forma segura. Usamos <strong>Pexels</strong> únicamente para buscar imágenes
          de stock para nuestros artículos — esa integración no envía ningún dato personal tuyo. No vendemos ni
          alquilamos tu información a terceros.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8">4. Tus derechos</h2>
        <p className="text-slate-700 leading-relaxed">
          Puedes solicitar acceso, corrección, cancelación o eliminación de tus datos personales (incluyendo tu
          cuenta, tus comentarios o tu suscripción al boletín) escribiéndonos a{' '}
          <a href="mailto:elpoderdelpueblord@gmail.com" className="text-red-600 hover:underline">
            elpoderdelpueblord@gmail.com
          </a>. Atenderemos tu solicitud dentro de un plazo razonable.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8">5. Menores de edad</h2>
        <p className="text-slate-700 leading-relaxed">
          Este sitio no está dirigido a menores de 13 años y no recopilamos deliberadamente información de menores.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8">6. Cambios a esta política</h2>
        <p className="text-slate-700 leading-relaxed">
          Podemos actualizar esta política ocasionalmente. Publicaremos cualquier cambio en esta misma página con
          su fecha de actualización.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8">Contacto</h2>
        <p className="text-slate-700 leading-relaxed">
          Si tienes preguntas sobre esta política, escríbenos a{' '}
          <a href="mailto:elpoderdelpueblord@gmail.com" className="text-red-600 hover:underline">
            elpoderdelpueblord@gmail.com
          </a>.
        </p>
      </div>
    </div>
  );
}
