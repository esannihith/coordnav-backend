import express from "express";
import {
  autocomplete,
  placeDetails,
  search,
} from "@/controllers/places.controller.js";

const router = express.Router();

router.get("/autocomplete", autocomplete);
router.get("/search", search);
router.get("/:placeId", placeDetails);

export { router as placesRoutes };
