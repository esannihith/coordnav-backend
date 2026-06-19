import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { AppError } from "./app-error.js";
import { GoogleProfile } from "../types/google.type.js";

const oauth2client = new OAuth2Client(env.GOOGLE_WEB_CLIENT_ID);

const verifyGoogleIdToken = async (idToken: string): Promise<GoogleProfile> => {
  try {
    const tokenInfo = await oauth2client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_WEB_CLIENT_ID,
    });
    const payload = tokenInfo.getPayload();

    if (!payload || !payload.email || !payload.email_verified)
      throw new AppError(401, "Invalid Google token");

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch {
    throw new AppError(401, "Invalid Google token");
  }
};

export { verifyGoogleIdToken };
