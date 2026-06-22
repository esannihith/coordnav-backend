export type PlaceAutocompletePrediction = {
  description: string;
  place_id: string;
  [key: string]: unknown;
};

export type PlaceOpeningHours = {
  open_now?: boolean;
  weekday_text?: string[];
};

export type PlaceDetails = {
  place_id: string;
  name?: string;
  types?: string[];
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  business_status?: string;
  opening_hours?: PlaceOpeningHours;
  website?: string;
  geometry?: {
    location: { lat: number; lng: number };
  };
  [key: string]: unknown;
};

export type PlaceSearchResult = {
  place_id: string;
  name?: string;
  formatted_address?: string;
  geometry?: {
    location: { lat: number; lng: number };
  };
  [key: string]: unknown;
};

export type GooglePlacesResponse<T> = {
  status: string;
  error_message?: string;
  predictions?: T[];
  result?: T;
  results?: T[];
};
