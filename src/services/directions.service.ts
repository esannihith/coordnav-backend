import { AppError } from "@/lib/app-error.js";
import { buildDirectionsUrl } from "@/utils/directions.util.js";
import {
  GoogleDirectionsResponse,
  RouteOption,
  TravelMode,
} from "@/types/directions.type.js";

const getRoutes = async (
  origin: string,
  destination: string,
  mode: TravelMode,
): Promise<RouteOption[]> => {
  const url = buildDirectionsUrl({
    origin,
    destination,
    mode,
    alternatives: "true",
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new AppError(502, "Failed to reach Google Directions API");
  }

  const data = (await response.json()) as GoogleDirectionsResponse;

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new AppError(
      502,
      data.error_message || `Google Directions API error: ${data.status}`,
    );
  }

  return (data.routes ?? []).map((route, index) => {
    // Requests are origin->destination with no waypoints, so a single leg is
    // expected; summing keeps totals correct if waypoints are ever added.
    const durationSeconds = route.legs.reduce(
      (sum, leg) => sum + leg.duration.value,
      0,
    );
    const distanceMeters = route.legs.reduce(
      (sum, leg) => sum + leg.distance.value,
      0,
    );

    return {
      id: String(index),
      summary: route.summary || `Route ${index + 1}`,
      durationSeconds,
      durationText: route.legs[0]?.duration.text ?? "",
      distanceMeters,
      distanceText: route.legs[0]?.distance.text ?? "",
      encodedPolyline: route.overview_polyline.points,
      bounds: route.bounds,
    };
  });
};

export { getRoutes };
