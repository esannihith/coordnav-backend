interface UserPresence {
  sockets: Set<string>;
  lat?: number;
  lng?: number;
  updatedAt?: Date;
}

// Registry layout: roomId -> Map<userId, UserPresence>
const registry = new Map<string, Map<string, UserPresence>>();

// Adds a socket to the registry. Returns true if this is the user's first socket (going online).
export const addSocket = async (
  roomId: string,
  userId: string,
  socketId: string,
): Promise<boolean> => {
  let room = registry.get(roomId);
  if (!room) {
    room = new Map<string, UserPresence>();
    registry.set(roomId, room);
  }

  let user = room.get(userId);
  if (!user) {
    user = { sockets: new Set<string>() };
    room.set(userId, user);
  }

  const wasEmpty = user.sockets.size === 0;
  user.sockets.add(socketId);
  return wasEmpty;
};

// Removes a socket from the registry. Returns true if this was the user's last socket (going offline).
export const removeSocket = async (
  roomId: string,
  userId: string,
  socketId: string,
): Promise<boolean> => {
  const room = registry.get(roomId);
  if (!room) return false;

  const user = room.get(userId);
  if (!user) return false;

  user.sockets.delete(socketId);

  if (user.sockets.size === 0) {
    room.delete(userId);
    if (room.size === 0) {
      registry.delete(roomId);
    }
    return true;
  }

  return false;
};

// Updates user location coordinates.
export const setLocation = async (
  roomId: string,
  userId: string,
  lat: number,
  lng: number,
): Promise<void> => {
  const room = registry.get(roomId);
  if (!room) return;

  const user = room.get(userId);
  if (!user) return;

  user.lat = lat;
  user.lng = lng;
  user.updatedAt = new Date();
};

// Clears user location coordinates.
export const clearLocation = async (
  roomId: string,
  userId: string,
): Promise<void> => {
  const room = registry.get(roomId);
  if (!room) return;

  const user = room.get(userId);
  if (!user) return;

  delete user.lat;
  delete user.lng;
  delete user.updatedAt;
};


// Returns active user locations in a room.
export const getRoomLocations = async (
  roomId: string,
): Promise<Array<{ userId: string; lat: number; lng: number; updatedAt?: string }>> => {
  const room = registry.get(roomId);
  if (!room) return [];

  const locations: Array<{ userId: string; lat: number; lng: number; updatedAt?: string }> = [];
  for (const [userId, user] of room.entries()) {
    if (user.lat !== undefined && user.lng !== undefined && user.updatedAt !== undefined) {
      locations.push({
        userId,
        lat: user.lat,
        lng: user.lng,
        updatedAt: user.updatedAt.toISOString(),
      });
    }
  }

  return locations;
};
