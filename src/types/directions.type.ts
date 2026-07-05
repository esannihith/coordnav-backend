interface LatLng {
  lat: number;
  lng: number;
}

interface GoogleDirectionsLeg {
  duration: { value: number; text: string };
  distance: { value: number; text: string };
}

interface GoogleDirectionsRoute {
  summary?: string;
  overview_polyline: { points: string };
  bounds: { northeast: LatLng; southwest: LatLng };
  legs: GoogleDirectionsLeg[];
}

interface GoogleDirectionsResponse {
  status: string;
  error_message?: string;
  routes?: GoogleDirectionsRoute[];
}

type TravelMode = "driving" | "walking" | "bicycling" | "transit";

/** Normalized route sent to the client. Numeric values enable sorting and
 *  reformatting; text values are Google's human strings for direct display. */
interface RouteOption {
  id: string;
  summary: string;
  durationSeconds: number;
  durationText: string;
  distanceMeters: number;
  distanceText: string;
  encodedPolyline: string;
  bounds: { northeast: LatLng; southwest: LatLng };
}

export type {
  LatLng,
  GoogleDirectionsLeg,
  GoogleDirectionsRoute,
  GoogleDirectionsResponse,
  TravelMode,
  RouteOption,
};
