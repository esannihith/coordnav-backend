import rateLimit from "express-rate-limit";

// Per-IP caps. Auth: sign-in + refresh only, so a low ceiling is safe.
// Places: public by design (no auth), so the limiter is the only thing
// standing between the internet and the billed Google Places key.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

export const placesLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// Same policy as places (public, billed key behind it), separate bucket so
// heavy autocomplete typing can't starve route fetches or vice versa.
export const directionsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
