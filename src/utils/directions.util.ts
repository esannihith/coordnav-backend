import { RoutesApiWaypoint } from "@/types/directions.type.js";

/** "lat,lng" pair or a "place_id:XXX" reference — the two waypoint formats
 *  we expose to clients (unchanged from the legacy Directions contract). */
const isValidWaypoint = (value: string): boolean =>
  /^place_id:\S+$/.test(value) ||
  /^-?\d{1,2}(\.\d+)?,-?\d{1,3}(\.\d+)?$/.test(value);

/** Convert a client waypoint param into a Routes API v2 waypoint object. */
const toRoutesApiWaypoint = (value: string): RoutesApiWaypoint => {
  if (value.startsWith("place_id:")) {
    return { placeId: value.slice("place_id:".length) };
  }
  const [lat, lng] = value.split(",").map(Number);
  return { location: { latLng: { latitude: lat, longitude: lng } } };
};

/** Routes API v2 durations are protobuf-style strings like "1234s". */
const parseDurationSeconds = (duration: string | undefined): number => {
  if (!duration) return 0;
  const seconds = Number(duration.replace(/s$/, ""));
  return Number.isFinite(seconds) ? Math.round(seconds) : 0;
};

/** v2 returns no display strings, so we format them server-side. */
const formatDuration = (seconds: number): string => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} hr ${rest} min` : `${hours} hr`;
};

const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return km >= 100 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
};

export {
  isValidWaypoint,
  toRoutesApiWaypoint,
  parseDurationSeconds,
  formatDuration,
  formatDistance,
};
