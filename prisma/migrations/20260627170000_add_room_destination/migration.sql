-- CreateTable
CREATE TABLE "room_destinations" (
    "room_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formatted_address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "room_destinations_pkey" PRIMARY KEY ("room_id")
);

-- AddForeignKey
ALTER TABLE "room_destinations" ADD CONSTRAINT "room_destinations_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
