"use client";

import { useEffect, useState } from "react";
import {
  Sun, Cloud, CloudRain, CloudLightning, Wind,
  Thermometer, MapPin,
} from "lucide-react";

interface WeatherState {
  status: "loading" | "ready" | "error";
  temp: number;
  label: string;
  code: number | null;
}

function weatherLabel(code?: number | null): string {
  if (code == null) return "Consultando...";
  if (code === 0) return "Despejado";
  if ([1, 2, 3].includes(code)) return "Parcialmente nublado";
  if ([45, 48].includes(code)) return "Neblina";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Lluvia probable";
  if ([95, 96, 99].includes(code)) return "Tormenta posible";
  return "Condición variable";
}

function WeatherIcon({ code, className }: { code: number | null; className?: string }) {
  if (code === 0) return <Sun className={className} />;
  if (code != null && [1, 2, 3].includes(code)) return <Cloud className={className} />;
  if (code != null && [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return <CloudRain className={className} />;
  if (code != null && [95, 96, 99].includes(code)) return <CloudLightning className={className} />;
  return <Wind className={className} />;
}

export function PlaceWeatherWidget({
  lat,
  lng,
  placeName,
}: {
  lat: number | null;
  lng: number | null;
  placeName: string;
}) {
  const [weather, setWeather] = useState<WeatherState>({
    status: "loading",
    temp: 0,
    label: "Consultando clima...",
    code: null,
  });

  // Use Honduras center as fallback if no coords
  const latitude  = lat ?? 14.5;
  const longitude = lng ?? -86.8;

  useEffect(() => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}&current=temperature_2m,weather_code&timezone=auto`;

    fetch(url)
      .then(r => r.json())
      .then((data: { current?: { temperature_2m?: number; weather_code?: number } }) => {
        const temp = data.current?.temperature_2m ?? 0;
        const code = data.current?.weather_code ?? null;
        setWeather({ status: "ready", temp, label: weatherLabel(code), code });
      })
      .catch(() => setWeather(s => ({ ...s, status: "error", label: "No disponible" })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  return (
    <div
      className="rounded-2xl bg-white border border-[#E2E8F0] p-5 flex items-center gap-5"
      style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
    >
      {/* Icon */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.12), rgba(56,189,248,0.06))" }}
      >
        {weather.status === "loading" ? (
          <Thermometer className="w-7 h-7 text-sky-400 animate-pulse" />
        ) : (
          <WeatherIcon code={weather.code} className="w-7 h-7 text-sky-500" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <MapPin className="w-3 h-3 text-[#0D9488]" />
          <p className="font-inter text-xs text-[#64748B] truncate">Clima en {placeName}</p>
        </div>
        <p className="font-jakarta font-extrabold text-3xl text-[#0F172A] leading-none">
          {weather.status === "ready" ? `${Math.round(weather.temp)}°C` : "--"}
        </p>
        <p className="font-inter text-sm text-[#64748B] mt-0.5">{weather.label}</p>
      </div>

      {/* Source badge */}
      <div className="shrink-0 text-right">
        <p className="font-inter text-[10px] text-[#CBD5E1]">Open-Meteo</p>
        <p className="font-inter text-[10px] text-[#CBD5E1]">Tiempo real</p>
      </div>
    </div>
  );
}
