import { AppError } from "@/lib/app-error.js";
import { buildPlacesUrl } from "@/utils/places.util.js";
import {
  GooglePlacesResponse,
  PlaceAutocompletePrediction,
  PlaceDetails,
  PlaceSearchResult,
} from "@/types/places.type.js";

const fetchFromGooglePlaces = async <T>(
  url: string,
): Promise<GooglePlacesResponse<T>> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new AppError(502, "Failed to reach Google Places API");
  }

  const data = (await response.json()) as GooglePlacesResponse<T>;

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new AppError(
      502,
      data.error_message || `Google Places API error: ${data.status}`,
    );
  }

  return data;
};

const autocompletePlaces = async (
  input: string,
  sessionToken?: string,
): Promise<PlaceAutocompletePrediction[]> => {
  const url = buildPlacesUrl("autocomplete", {
    input,
    sessiontoken: sessionToken,
  });

  const data = await fetchFromGooglePlaces<PlaceAutocompletePrediction>(url);

  return data.predictions ?? [];
};

const PLACE_DETAILS_FIELDS = [
  "place_id",
  "name",
  "type",
  "formatted_address",
  "geometry",
  "business_status",
  "opening_hours",
  "formatted_phone_number",
  "international_phone_number",
  "website",
].join(",");

const getPlaceDetails = async (
  placeId: string,
  sessionToken?: string,
): Promise<PlaceDetails> => {
  const url = buildPlacesUrl("details", {
    place_id: placeId,
    sessiontoken: sessionToken,
    fields: PLACE_DETAILS_FIELDS,
  });

  const data = await fetchFromGooglePlaces<PlaceDetails>(url);

  if (!data.result) throw new AppError(404, "Place not found");

  return data.result;
};

const searchPlaces = async (query: string): Promise<PlaceSearchResult[]> => {
  const url = buildPlacesUrl("textsearch", { query });

  const data = await fetchFromGooglePlaces<PlaceSearchResult>(url);

  return data.results ?? [];
};

export { autocompletePlaces, getPlaceDetails, searchPlaces };
