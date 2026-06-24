import { Injectable } from '@nestjs/common';

type WeatherResponse = {
  main: { temp: number };
  weather: { main: string; description: string }[];
};

type HvacInferred = 'cooling' | 'heating' | 'none';

const COOLING_THRESHOLD_C = 25;
const HEATING_THRESHOLD_C = 5;

function inferHvac(tempC: number): HvacInferred {
  if (tempC > COOLING_THRESHOLD_C) return 'cooling';
  if (tempC < HEATING_THRESHOLD_C) return 'heating';
  return 'none';
}

function normalizeCondition(weatherMain: string): string {
  const map: Record<string, string> = {
    Clear: 'clear',
    Clouds: 'cloudy',
    Rain: 'rain',
    Drizzle: 'rain',
    Thunderstorm: 'rain',
    Snow: 'snow',
    Fog: 'fog',
    Mist: 'fog',
    Haze: 'fog',
  };
  return map[weatherMain] ?? 'clear';
}

@Injectable()
export class WeatherService {
  private readonly apiKey = process.env.OPENWEATHERMAP_API_KEY ?? '';

  async getWeatherAtLocation(
    lat: number,
    lng: number,
  ): Promise<{ tempC: number; condition: string; hvacInferred: HvacInferred } | null> {
    if (!this.apiKey) return null;

    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;

      const data = (await res.json()) as WeatherResponse;
      const tempC = data.main.temp;
      const condition = normalizeCondition(data.weather[0]?.main ?? 'Clear');

      return { tempC, condition, hvacInferred: inferHvac(tempC) };
    } catch {
      return null;
    }
  }
}
