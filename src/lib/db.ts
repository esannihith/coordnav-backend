import { prisma } from "./prisma.js";

const connectDB = async (): Promise<void> => {
  await prisma.$connect();
  console.log("Connected to the database");
};

export { connectDB };
