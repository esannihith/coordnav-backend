interface LatLng {
  lat: number;
  lng: number;
}

type TravelMode = "driving" | "walking" | "bicycling" | "transit";

/** Routes API v2 (computeRoutes) shapes — note latitude/longitude naming. */
interface RoutesApiLatLng {
  latitude: number;
  longitude: number;
}

type RoutesApiWaypoint =
  | { placeId: string }
  | { location: { latLng: RoutesApiLatLng } };

interface RoutesApiRoute {
  description?: string;
  duration?: string; // e.g. "1234s"
  distanceMeters?: number;
  polyline?: { encodedPolyline?: string };
  viewport?: { low?: RoutesApiLatLng; high?: RoutesApiLatLng };
  routeToken?: string;
}

interface RoutesApiResponse {
  routes?: RoutesApiRoute[];
  error?: { code?: number; message?: string; status?: string };
}

/** Normalized route sent to the client. Numeric values enable sorting and
 *  reformatting; text values are preformatted for direct display. routeToken
 *  (driving only) lets the Navigation SDK follow this exact route. */
interface RouteOption {
  id: string;
  summary: string;
  durationSeconds: number;
  durationText: string;
  distanceMeters: number;
  distanceText: string;
  encodedPolyline: string;
  bounds: { northeast: LatLng; southwest: LatLng };
  routeToken?: string;
}

export type {
  LatLng,
  TravelMode,
  RoutesApiLatLng,
  RoutesApiWaypoint,
  RoutesApiRoute,
  RoutesApiResponse,
  RouteOption,
};
