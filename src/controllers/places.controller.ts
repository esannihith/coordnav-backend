import { Request, Response } from "express";
import { AppError } from "@/lib/app-error.js";
import * as PlacesService from "@/services/places.service.js";

const autocomplete = async (req: Request, res: Response) => {
  const { input, sessionToken } = req.query;

  if (typeof input !== "string" || input.trim().length === 0)
    throw new AppError(400, "Input is required");

  const predictions = await PlacesService.autocompletePlaces(
    input,
    typeof sessionToken === "string" ? sessionToken : undefined,
  );

  res.status(200).json({
    data: { predictions },
  });
};

const placeDetails = async (req: Request, res: Response) => {
  const { placeId } = req.params;
  const { sessionToken } = req.query;

  if (typeof placeId !== "string" || placeId.trim().length === 0)
    throw new AppError(400, "Place ID is required");

  const place = await PlacesService.getPlaceDetails(
    placeId,
    typeof sessionToken === "string" ? sessionToken : undefined,
  );

  res.status(200).json({
    data: { place },
  });
};

const search = async (req: Request, res: Response) => {
  const { query } = req.query;

  if (typeof query !== "string" || query.trim().length === 0)
    throw new AppError(400, "Query is required");

  const places = await PlacesService.searchPlaces(query);

  res.status(200).json({
    data: { places },
  });
};

export { autocomplete, placeDetails, search };
