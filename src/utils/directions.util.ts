import { env } from "@/config/env.js";

const DIRECTIONS_API_URL = "https://maps.googleapis.com/maps/api/directions/json";

const buildDirectionsUrl = (
  params: Record<string, string | undefined>,
): string => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) searchParams.set(key, value);
  }

  searchParams.set("key", env.GOOGLE_PLACES_API_KEY);

  return `${DIRECTIONS_API_URL}?${searchParams.toString()}`;
};

/** "lat,lng" pair or a "place_id:XXX" reference — the two waypoint formats
 *  the Directions API accepts that we expose to clients. */
const isValidWaypoint = (value: string): boolean =>
  /^place_id:\S+$/.test(value) ||
  /^-?\d{1,2}(\.\d+)?,-?\d{1,3}(\.\d+)?$/.test(value);

export { buildDirectionsUrl, isValidWaypoint };
