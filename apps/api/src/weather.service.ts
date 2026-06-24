import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

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

const HVAC_LEARNED_THRESHOLD = 2;

@Injectable()
export class WeatherService {
  private readonly apiKey = process.env.OPENWEATHERMAP_API_KEY ?? '';

  constructor(private readonly db: DatabaseService) {}

  async confirmHvac(tripId: string, confirmed: boolean): Promise<{ learned: boolean }> {
    const tripResult = await this.db.query<{
      userId: string | null;
      hvacInferred: string | null;
    }>(
      `SELECT user_id AS "userId", hvac_inferred AS "hvacInferred" FROM trips WHERE id = $1`,
      [tripId],
    );
    const trip = tripResult.rows[0];
    if (!trip) return { learned: false };

    const confirmationStatus = confirmed ? 'confirmed' : 'denied';
    const hvacSource = confirmed ? 'user_confirmed' : 'user_denied';

    await this.db.query(
      `UPDATE trips SET
         hvac_user_confirmed = $2,
         hvac_source = $3,
         hvac_confirmation_status = $4
       WHERE id = $1`,
      [tripId, confirmed, hvacSource, confirmationStatus],
    );

    if (!trip.userId || !trip.hvacInferred || trip.hvacInferred === 'none') {
      return { learned: false };
    }

    const isCooling = trip.hvacInferred === 'cooling';
    const countCol = isCooling ? 'hvac_cooling_confirmations' : 'hvac_heating_confirmations';
    const learnedCol = isCooling ? 'hvac_cooling_learned' : 'hvac_heating_learned';
    const confirmedValue = confirmed ? 'yes' : 'no';

    const updateResult = await this.db.query<{ newCount: number }>(
      `UPDATE users SET
         ${countCol} = ${countCol} + 1
       WHERE id = $1
       RETURNING ${countCol} AS "newCount"`,
      [trip.userId],
    );

    const newCount = updateResult.rows[0]?.newCount ?? 0;
    const learned = Number(newCount) >= HVAC_LEARNED_THRESHOLD;

    if (learned) {
      await this.db.query(
        `UPDATE users SET ${learnedCol} = $2 WHERE id = $1`,
        [trip.userId, confirmedValue],
      );
    }

    return { learned };
  }

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
