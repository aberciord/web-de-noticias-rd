import { Link } from 'react-router-dom';
import { Newspaper, Shield, FileText, Globe2, Mail, MessageCircle } from 'lucide-react';
import { SOCIAL_LINKS } from '@/lib/socialLinks';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Acerca de El poder del pueblo RD</h1>

      <div className="prose prose-slate max-w-none space-y-6">
        <p className="text-lg text-slate-700 leading-relaxed">
          El poder del pueblo RD es un portal de noticias de la República Dominicana que ofrece información
          actualizada sobre noticias, deportes, política y farándula, con contenido original en
          español e inglés.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <Newspaper className="w-8 h-8 text-red-600 mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">Contenido original</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Cada nota es redactada desde cero por nuestro equipo editorial y herramientas de IA,
              respetando el derecho de autor dominicano (Ley 65-00).
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <Shield className="w-8 h-8 text-red-600 mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">Revisión humana</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Todo artículo pasa por una cola de revisión humana antes de publicarse,
              garantizando calidad y precisión.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <FileText className="w-8 h-8 text-red-600 mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">Fuentes citadas</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Cada artículo publicado incluye la cita de su fuente original con enlace directo,
              promoviendo la transparencia informativa.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <Globe2 className="w-8 h-8 text-red-600 mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">Bilingüe</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Publicamos cada nota en español e inglés, ampliando el alcance de la información
              dominicana a una audiencia global.
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mt-8">Nuestro proceso</h2>
        <p className="text-slate-700 leading-relaxed">
          Recopilamos información de fuentes públicas mediante feeds RSS, seleccionamos los temas
          más relevantes para el público dominicano y generamos notas periodísticas originales.
          Cada nota es revisada y aprobada por un editor humano antes de su publicación.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8">Compromiso legal</h2>
        <p className="text-slate-700 leading-relaxed">
          Respetamos la Ley 65-00 sobre Derecho de Autor de la República Dominicana. No copiamos
          texto ni fotos de terceros. Todo nuestro contenido es original y cita debidamente la
          fuente de la información. Consulta nuestra{' '}
          <Link to="/privacidad" className="text-red-600 hover:underline">política de privacidad</Link>{' '}
          y nuestros{' '}
          <Link to="/terminos" className="text-red-600 hover:underline">términos de uso</Link>.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8">Director responsable</h2>
        <p className="text-slate-700 leading-relaxed">
          Conforme a la Ley 6132 de Expresión y Difusión del Pensamiento, este medio designa como
          director responsable y director técnico a: Abercio Rafael Núñez.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8">Contacto</h2>
        <ul className="space-y-2 not-prose">
          <li>
            <a href={`mailto:${SOCIAL_LINKS.email}`} className="flex items-center gap-2 text-slate-700 hover:text-red-600 transition-colors">
              <Mail className="w-4 h-4" />
              {SOCIAL_LINKS.email}
            </a>
          </li>
          <li>
            <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-700 hover:text-red-600 transition-colors">
              <MessageCircle className="w-4 h-4" />
              WhatsApp: {SOCIAL_LINKS.whatsappDisplay}
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
