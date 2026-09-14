import { useEffect, useState } from 'react';
import { getWeatherInfo } from '@/lib/weather';
import { useLanguage } from '@/context/LanguageContext';

const SANTO_DOMINGO = { lat: 18.4861, lon: -69.9312 };

interface WeatherData {
  temperature: number;
  code: number;
}

export default function WeatherWidget() {
  const { language } = useLanguage();
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${SANTO_DOMINGO.lat}&longitude=${SANTO_DOMINGO.lon}&current=temperature_2m,weather_code&timezone=America/Santo_Domingo`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data?.current) {
          setWeather({
            temperature: Math.round(data.current.temperature_2m),
            code: data.current.weather_code,
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!weather) return null;

  const { Icon, label, labelEn } = getWeatherInfo(weather.code);

  return (
    <div
      className="flex items-center gap-1.5 bg-white/10 rounded-full pl-2 pr-3 py-1"
      title={language === 'en' ? labelEn : label}
    >
      <Icon className="w-4 h-4 text-amber-300" />
      <span className="font-semibold text-white">{weather.temperature}°C</span>
      <span className="hidden sm:inline text-blue-100">Santo Domingo</span>
    </div>
  );
}
