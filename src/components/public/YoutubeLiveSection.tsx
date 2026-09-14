import { Youtube, Radio, Bell } from 'lucide-react';
import { SOCIAL_LINKS } from '@/lib/socialLinks';
import { useLanguage } from '@/context/LanguageContext';

export default function YoutubeLiveSection() {
  const { language } = useLanguage();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-700 via-red-600 to-brand-blue-dark p-6 sm:p-8">
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-lg">
            <Youtube className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-2">
              <Radio className="w-3 h-3 animate-pulse" />
              {language === 'en' ? 'Live on our channel' : 'En vivo en nuestro canal'}
            </div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-white leading-tight">
              {language === 'en'
                ? 'Watch our live broadcasts on YouTube'
                : 'Mira nuestras transmisiones en vivo en YouTube'}
            </h2>
            <p className="text-red-50 text-sm sm:text-base mt-1.5 max-w-xl">
              {language === 'en'
                ? 'Breaking news, live coverage, and exclusive interviews. Subscribe so you never miss a broadcast.'
                : 'Noticias de última hora, cobertura en vivo y entrevistas exclusivas. Suscríbete para no perderte ninguna transmisión.'}
            </p>
          </div>
        </div>

        <a
          href={SOCIAL_LINKS.youtube}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-white text-red-600 font-bold px-6 py-3.5 rounded-xl hover:bg-red-50 transition-colors shadow-lg flex-shrink-0 w-full sm:w-auto justify-center"
        >
          <Bell className="w-5 h-5" />
          {language === 'en' ? 'Subscribe on YouTube' : 'Suscribirme en YouTube'}
        </a>
      </div>
    </div>
  );
}
