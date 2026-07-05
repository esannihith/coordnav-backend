import { env } from "@/config/env.js";
import { AppError } from "@/lib/app-error.js";
import {
  toRoutesApiWaypoint,
  parseDurationSeconds,
  formatDuration,
  formatDistance,
} from "@/utils/directions.util.js";
import {
  RoutesApiResponse,
  RouteOption,
  TravelMode,
} from "@/types/directions.type.js";

const COMPUTE_ROUTES_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";

const TRAVEL_MODE_MAP: Record<TravelMode, string> = {
  driving: "DRIVE",
  walking: "WALK",
  bicycling: "BICYCLE",
  transit: "TRANSIT",
};

const BASE_FIELD_MASK = [
  "routes.description",
  "routes.duration",
  "routes.distanceMeters",
  "routes.polyline.encodedPolyline",
  "routes.viewport",
].join(",");

const getRoutes = async (
  origin: string,
  destination: string,
  mode: TravelMode,
): Promise<RouteOption[]> => {
  const isDriving = mode === "driving";

  // routeToken exists only for DRIVE (and TWO_WHEELER) with a traffic-aware
  // routing preference; requesting it for other modes is an API error.
  const fieldMask = isDriving
    ? `${BASE_FIELD_MASK},routes.routeToken`
    : BASE_FIELD_MASK;

  const body: Record<string, unknown> = {
    origin: toRoutesApiWaypoint(origin),
    destination: toRoutesApiWaypoint(destination),
    travelMode: TRAVEL_MODE_MAP[mode],
    computeAlternativeRoutes: true,
    units: "METRIC",
  };
  if (isDriving) body.routingPreference = "TRAFFIC_AWARE";

  const response = await fetch(COMPUTE_ROUTES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as
    | RoutesApiResponse
    | null;

  if (!response.ok) {
    throw new AppError(
      502,
      data?.error?.message || `Google Routes API error (HTTP ${response.status})`,
    );
  }

  // No route between the points comes back as 200 with no routes array.
  return (data?.routes ?? []).map((route, index) => {
    const durationSeconds = parseDurationSeconds(route.duration);
    const distanceMeters = route.distanceMeters ?? 0;

    return {
      id: String(index),
      summary: route.description || `Route ${index + 1}`,
      durationSeconds,
      durationText: formatDuration(durationSeconds),
      distanceMeters,
      distanceText: formatDistance(distanceMeters),
      encodedPolyline: route.polyline?.encodedPolyline ?? "",
      bounds: {
        northeast: {
          lat: route.viewport?.high?.latitude ?? 0,
          lng: route.viewport?.high?.longitude ?? 0,
        },
        southwest: {
          lat: route.viewport?.low?.latitude ?? 0,
          lng: route.viewport?.low?.longitude ?? 0,
        },
      },
      ...(route.routeToken ? { routeToken: route.routeToken } : {}),
    };
  });
};

export { getRoutes };
