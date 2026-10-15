import { randomUUID } from 'node:crypto';

const rooms = new Map();
const roomBySession = new Map();

export class RoomError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function validateRoomName(value) {
  if (typeof value !== 'string') return { code: 'INVALID_ROOM_NAME', message: 'Escribe un nombre de sala de 2 a 40 caracteres.' };
  const name = value.trim();
  const length = Array.from(name).length;
  if (length < 2 || length > 40 || /[\u0000-\u001f\u007f-\u009f]/u.test(name)) {
    return { code: 'INVALID_ROOM_NAME', message: 'Escribe un nombre de sala de 2 a 40 caracteres, sin caracteres de control.' };
  }
  return { name };
}

function publicRoom(room) {
  return {
    id: room.id,
    name: room.name,
    hostName: room.hostName,
    guestName: room.guestName,
    status: room.status,
    players: room.guestSessionId ? 2 : 1,
    hostColor: 'Blancas',
    guestColor: 'Negras',
  };
}

function activeRoom(session) {
  const id = roomBySession.get(session.id);
  return id ? rooms.get(id) ?? null : null;
}

export function createRoom(session, value) {
  const validation = validateRoomName(value);
  if (validation.code) throw new RoomError(validation.code, validation.message, 400);
  const existing = activeRoom(session);
  if (existing) {
    if (existing.hostSessionId === session.id) return publicRoom(existing);
    throw new RoomError('SESSION_IN_ROOM', 'Ya estás en una sala. Sal antes de crear otra.');
  }

  const room = {
    id: randomUUID(),
    name: validation.name,
    hostSessionId: session.id,
    hostName: session.name,
    guestSessionId: null,
    guestName: null,
    status: 'waiting',
  };
  rooms.set(room.id, room);
  roomBySession.set(session.id, room.id);
  return publicRoom(room);
}

export function listRooms() {
  return [...rooms.values()].filter((room) => room.status === 'waiting').map(publicRoom);
}

export function getRoomForSession(session) {
  const room = activeRoom(session);
  if (!room) return null;
  if (room.hostSessionId !== session.id && room.guestSessionId !== session.id) {
    roomBySession.delete(session.id);
    return null;
  }
  return publicRoom(room);
}

export function joinRoom(session, id) {
  const room = rooms.get(id);
  if (!room) throw new RoomError('ROOM_NOT_FOUND', 'La sala ya no existe. Actualiza la lista e inténtalo de nuevo.', 404);
  if (room.hostSessionId === session.id) throw new RoomError('HOST_CANNOT_JOIN', 'Ya eres anfitrión de esta sala.');
  if (room.guestSessionId === session.id) return publicRoom(room);
  if (activeRoom(session)) throw new RoomError('SESSION_IN_ROOM', 'Ya estás en otra sala. Sal antes de unirte.');
  if (room.status !== 'waiting' || room.guestSessionId) {
    throw new RoomError('ROOM_FULL', 'La sala ya está completa. Elige otra sala.', 409);
  }

  room.guestSessionId = session.id;
  room.guestName = session.name;
  room.status = 'ready';
  roomBySession.set(session.id, room.id);
  return publicRoom(room);
}

function removeRoom(room) {
  rooms.delete(room.id);
  roomBySession.delete(room.hostSessionId);
  if (room.guestSessionId) roomBySession.delete(room.guestSessionId);
}

export function leaveRoom(session, id) {
  const room = activeRoom(session);
  if (!room) return null;
  if (id && room.id !== id) throw new RoomError('ROOM_NOT_FOUND', 'La sala ya no está disponible.', 404);
  if (room.hostSessionId === session.id) {
    removeRoom(room);
    return null;
  }

  room.guestSessionId = null;
  room.guestName = null;
  room.status = 'waiting';
  roomBySession.delete(session.id);
  return publicRoom(room);
}

export function cancelRoom(session, id) {
  const room = rooms.get(id);
  if (!room) throw new RoomError('ROOM_NOT_FOUND', 'La sala ya no existe.', 404);
  if (room.hostSessionId !== session.id) throw new RoomError('NOT_ROOM_HOST', 'Solo el anfitrión puede cancelar esta sala.', 403);
  if (room.status !== 'waiting') throw new RoomError('ROOM_STARTED', 'La sala ya está lista y no se puede cancelar. Sal de la sala para volver al lobby.');
  removeRoom(room);
  return null;
}
