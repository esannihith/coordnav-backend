import { GoogleProfile } from "@/types/google.type.js";
import { prisma } from "@/lib/prisma.js";
import { User, Prisma } from "../../generated/prisma/client.js";
import { AppError } from "@/lib/app-error.js";

const upsertUserFromGoogle = async (claims: GoogleProfile): Promise<User> => {
  try {
    const user = await prisma.user.upsert({
      where: { googleId: claims.googleId },
      update: {
        email: claims.email,
        name: claims.name,
        picture: claims.picture,
      },
      create: {
        googleId: claims.googleId,
        email: claims.email,
        name: claims.name,
        picture: claims.picture,
      },
    });
    return user;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(409, "An account with this email already exists");
    }
    throw error;
  }
};

export { upsertUserFromGoogle };
