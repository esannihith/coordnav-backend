import { Request, Response } from "express";
import { AppError } from "@/lib/app-error.js";
import * as DirectionsService from "@/services/directions.service.js";
import { isValidWaypoint } from "@/utils/directions.util.js";
import { TravelMode } from "@/types/directions.type.js";

const TRAVEL_MODES: TravelMode[] = [
  "driving",
  "walking",
  "bicycling",
  "transit",
];

const getDirections = async (req: Request, res: Response) => {
  const { origin, destination, mode } = req.query;

  if (typeof origin !== "string" || !isValidWaypoint(origin))
    throw new AppError(400, "origin must be 'lat,lng' or 'place_id:XXX'");

  if (typeof destination !== "string" || !isValidWaypoint(destination))
    throw new AppError(400, "destination must be 'lat,lng' or 'place_id:XXX'");

  const travelMode: TravelMode =
    typeof mode === "string" && TRAVEL_MODES.includes(mode as TravelMode)
      ? (mode as TravelMode)
      : "driving";

  const routes = await DirectionsService.getRoutes(
    origin,
    destination,
    travelMode,
  );

  res.status(200).json({
    data: { routes },
  });
};

export { getDirections };
