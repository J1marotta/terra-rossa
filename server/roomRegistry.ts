import { randomBytes } from 'node:crypto';

interface PrivateRoomRecord {
  readonly roomId: string;
  playerCount: number;
  closed: boolean;
}

const rooms = new Map<string, PrivateRoomRecord>();
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createRoomCode(roomId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const bytes = randomBytes(6);
    let code = '';
    for (const byte of bytes)
      code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    if (!rooms.has(code)) {
      rooms.set(code, { roomId, playerCount: 0, closed: false });
      return code;
    }
  }
  throw new Error('Could not allocate a unique private room code.');
}

export function updatePrivateRoom(
  code: string,
  update: Partial<Pick<PrivateRoomRecord, 'playerCount' | 'closed'>>,
) {
  const room = rooms.get(code);
  if (room !== undefined) Object.assign(room, update);
}

export function resolvePrivateRoom(code: string) {
  return rooms.get(code.toUpperCase()) ?? null;
}

export function removePrivateRoom(code: string) {
  rooms.delete(code);
}

export function clearPrivateRoomsForTests() {
  rooms.clear();
}
