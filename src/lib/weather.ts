import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, type LucideIcon } from 'lucide-react';

// WMO weather codes: https://open-meteo.com/en/docs
export function getWeatherInfo(code: number): { Icon: LucideIcon; label: string; labelEn: string } {
  if (code === 0) return { Icon: Sun, label: 'Despejado', labelEn: 'Clear' };
  if (code === 1 || code === 2) return { Icon: CloudSun, label: 'Parcialmente nublado', labelEn: 'Partly cloudy' };
  if (code === 3) return { Icon: Cloud, label: 'Nublado', labelEn: 'Cloudy' };
  if (code === 45 || code === 48) return { Icon: CloudFog, label: 'Neblina', labelEn: 'Foggy' };
  if (code >= 51 && code <= 57) return { Icon: CloudDrizzle, label: 'Llovizna', labelEn: 'Drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { Icon: CloudRain, label: 'Lluvia', labelEn: 'Rain' };
  if (code >= 71 && code <= 77) return { Icon: CloudSnow, label: 'Nieve', labelEn: 'Snow' };
  if (code >= 95) return { Icon: CloudLightning, label: 'Tormenta', labelEn: 'Storm' };
  return { Icon: Cloud, label: 'Nublado', labelEn: 'Cloudy' };
}
