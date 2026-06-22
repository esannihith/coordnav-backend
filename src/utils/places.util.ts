import { env } from "@/config/env.js";

const PLACES_API_BASE_URL = "https://maps.googleapis.com/maps/api/place";

const buildPlacesUrl = (
  endpoint: string,
  params: Record<string, string | undefined>,
): string => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) searchParams.set(key, value);
  }

  searchParams.set("key", env.GOOGLE_PLACES_API_KEY);

  return `${PLACES_API_BASE_URL}/${endpoint}/json?${searchParams.toString()}`;
};

export { buildPlacesUrl };
