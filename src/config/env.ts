import dotenv from 'dotenv'

dotenv.config()

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

export const env = {
    DATABASE_URL : required("DATABASE_URL"),
    GOOGLE_WEB_CLIENT_ID : required("GOOGLE_WEB_CLIENT_ID"),
    JWT_ACCESS_SECRET : required("JWT_ACCESS_SECRET"),
    ACCESS_TOKEN_TTL : required("ACCESS_TOKEN_TTL"),
    REFRESH_TOKEN_TTL_DAYS : Number(required("REFRESH_TOKEN_TTL_DAYS")),
    PORT : Number(required("PORT"))
}