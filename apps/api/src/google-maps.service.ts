import { BadRequestException, Injectable } from '@nestjs/common';

type PlaceAutocompleteResponse = {
  predictions?: Array<{
    description: string;
    place_id: string;
    structured_formatting?: {
      main_text?: string;
      secondary_text?: string;
    };
  }>;
  status?: string;
};

type DirectionsResponse = {
  routes?: Array<{
    overview_polyline?: { points?: string };
    bounds?: Record<string, unknown>;
    legs?: Array<{
      distance?: { value?: number; text?: string };
      duration?: { value?: number; text?: string };
      steps?: Array<{
        distance?: { value?: number; text?: string };
        duration?: { value?: number; text?: string };
        html_instructions?: string;
        travel_mode?: string;
      }>;
    }>;
  }>;
  status?: string;
  error_message?: string;
};

type PlacesNearbyResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    googleMapsUri?: string;
    location?: {
      latitude?: number;
      longitude?: number;
    };
    businessStatus?: string;
    evChargeOptions?: {
      connectorAggregation?: Array<{
        type?: string;
        maxChargeRateKw?: number;
        count?: number;
        availableCount?: number;
        outOfServiceCount?: number;
      }>;
    };
  }>;
};

type PlaceDetailsResponse = {
  result?: {
    formatted_address?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
    name?: string;
    place_id?: string;
  };
  status?: string;
};

type RoutePoint = {
  latitude?: number;
  longitude?: number;
};

type RoutePreviewBody = {
  originLabel?: string;
  originPlaceId?: string;
  originLocation?: RoutePoint;
  destinationLabel?: string;
  destinationPlaceId?: string;
  destinationLocation?: RoutePoint;
  language?: string;
};

@Injectable()
export class GoogleMapsService {
  async autocomplete(input?: string, language = 'tr', latitude?: string, longitude?: string) {
    const query = input?.trim();

    if (!query || query.length < 2) {
      return { status: 'empty', predictions: [] };
    }

    const key = googleMapsApiKey();

    if (!key) {
      return { status: 'api_key_missing', predictions: [] };
    }

    const params = new URLSearchParams({
      input: query,
      key,
      language: normalizeLanguage(language),
      types: 'geocode',
    });

    const locationBias = resolveLocation(latitude, longitude);

    if (locationBias) {
      params.set('location', `${locationBias.latitude},${locationBias.longitude}`);
      params.set('radius', '75000');
    }

    const response = await fetchJson<PlaceAutocompleteResponse>(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
    );

    return {
      status: response.status ?? 'UNKNOWN',
      predictions: (response.predictions ?? []).slice(0, 5).map((prediction) => ({
        description: prediction.description,
        placeId: prediction.place_id,
        mainText: prediction.structured_formatting?.main_text ?? prediction.description,
        secondaryText: prediction.structured_formatting?.secondary_text ?? '',
      })),
    };
  }

  async routePreview(body: RoutePreviewBody) {
    const key = googleMapsApiKey();

    if (!key) {
      return { status: 'api_key_missing', route: null };
    }

    const origin = resolveDirectionsPoint(body.originPlaceId, body.originLabel, body.originLocation);
    const destination = resolveDirectionsPoint(body.destinationPlaceId, body.destinationLabel, body.destinationLocation);

    if (!origin || !destination) {
      throw new BadRequestException('Origin and destination are required.');
    }

    const params = new URLSearchParams({
      origin,
      destination,
      key,
      language: normalizeLanguage(body.language),
      mode: 'driving',
    });

    const response = await fetchJson<DirectionsResponse>(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
    );
    const route = response.routes?.[0];
    const leg = route?.legs?.[0];
    const distanceM = leg?.distance?.value;
    const durationSeconds = leg?.duration?.value;

    if (!route || !leg || !distanceM || !durationSeconds) {
      return {
        status: response.status ?? 'route_not_found',
        route: null,
      };
    }

    const distanceKm = round(distanceM / 1000, 2);
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

    return {
      status: response.status ?? 'OK',
      route: {
        provider: 'google_directions',
        originLabel: body.originLabel,
        destinationLabel: body.destinationLabel,
        distanceKm,
        durationMinutes,
        encodedPolyline: route.overview_polyline?.points ?? null,
        bounds: route.bounds ?? {},
        roadProfile: inferRoadProfile(distanceKm, durationMinutes),
        steps: (leg.steps ?? []).slice(0, 24).map((step, index) => ({
          sequence: index + 1,
          distanceKm: step.distance?.value ? round(step.distance.value / 1000, 2) : null,
          durationMinutes: step.duration?.value ? Math.max(1, Math.round(step.duration.value / 60)) : null,
          instruction: stripHtml(step.html_instructions ?? ''),
          travelMode: step.travel_mode ?? 'DRIVING',
        })),
      },
    };
  }

  async placeDetails(placeId?: string, language = 'tr') {
    const id = placeId?.trim();
    const key = googleMapsApiKey();

    if (!id) {
      throw new BadRequestException('Place id is required.');
    }

    if (!key) {
      return { status: 'api_key_missing', place: null };
    }

    const params = new URLSearchParams({
      fields: 'place_id,name,formatted_address,geometry/location',
      key,
      language: normalizeLanguage(language),
      place_id: id,
    });

    const response = await fetchJson<PlaceDetailsResponse>(
      `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`,
    );
    const location = response.result?.geometry?.location;

    if (!location || !isFiniteNumber(location.lat) || !isFiniteNumber(location.lng)) {
      return { status: response.status ?? 'place_not_found', place: null };
    }

    return {
      status: response.status ?? 'OK',
      place: {
        address: response.result?.formatted_address ?? null,
        googlePlaceId: response.result?.place_id ?? id,
        latitude: location.lat,
        longitude: location.lng,
        name: response.result?.name ?? response.result?.formatted_address ?? 'Seçilen konum',
      },
    };
  }

  async searchEvChargingStations(latitude: number, longitude: number, language = 'tr') {
    const key = googleMapsApiKey();

    if (!key || !isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
      return { status: key ? 'invalid_location' : 'api_key_missing', stations: [] };
    }

    const response = await fetchJson<PlacesNearbyResponse>(
      'https://places.googleapis.com/v1/places:searchNearby',
      {
        body: JSON.stringify({
          includedTypes: ['electric_vehicle_charging_station'],
          languageCode: normalizeLanguage(language),
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: 25000,
            },
          },
          maxResultCount: 8,
          rankPreference: 'DISTANCE',
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': [
            'places.id',
            'places.displayName',
            'places.formattedAddress',
            'places.googleMapsUri',
            'places.location',
            'places.businessStatus',
            'places.evChargeOptions',
          ].join(','),
        },
        method: 'POST',
      },
    );

    return {
      status: 'OK',
      stations: (response.places ?? []).map((place) => {
        const connectorAggregation = place.evChargeOptions?.connectorAggregation ?? [];
        const maxDcKw = connectorAggregation.reduce<number | null>((current, connector) => {
          const kw = connector.maxChargeRateKw;
          return typeof kw === 'number' ? Math.max(current ?? 0, kw) : current;
        }, null);
        const connectorTypes = connectorAggregation
          .map((connector) => connector.type)
          .filter((type): type is string => Boolean(type));

        return {
          googlePlaceId: place.id ?? null,
          stationName: place.displayName?.text ?? 'Google EV Charging Station',
          address: place.formattedAddress ?? null,
          latitude: place.location?.latitude ?? null,
          longitude: place.location?.longitude ?? null,
          maxDcKw,
          connectorTypes: Array.from(new Set(connectorTypes)),
          operationalStatus: place.businessStatus === 'CLOSED_PERMANENTLY' ? 'closed' : 'active',
          sourceUrl: place.googleMapsUri ?? null,
        };
      }).filter((station) => station.googlePlaceId && station.latitude !== null && station.longitude !== null),
    };
  }
}

function googleMapsApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_API_KEY ?? '';
}

function resolveDirectionsPoint(placeId?: string, label?: string, location?: RoutePoint) {
  if (placeId?.trim()) {
    return `place_id:${placeId.trim()}`;
  }

  if (isFiniteNumber(location?.latitude) && isFiniteNumber(location?.longitude)) {
    return `${location.latitude},${location.longitude}`;
  }

  return label?.trim() || '';
}

function resolveLocation(latitude?: string, longitude?: string) {
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (!isFiniteNumber(parsedLatitude) || !isFiniteNumber(parsedLongitude)) {
    return null;
  }

  return { latitude: parsedLatitude, longitude: parsedLongitude };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeLanguage(language?: string) {
  return language?.toLowerCase().startsWith('en') ? 'en' : 'tr';
}

function inferRoadProfile(distanceKm: number, durationMinutes: number) {
  const avgSpeedKmh = durationMinutes > 0 ? distanceKm / (durationMinutes / 60) : 0;

  if (avgSpeedKmh >= 75) {
    return 'highway';
  }

  if (avgSpeedKmh <= 42) {
    return 'city';
  }

  return 'mixed';
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new BadRequestException(`Google Maps request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
