export const PROTOCOL_VERSION = '0.1.0';
export const GAME_ROOM_NAME = 'terra_rossa_v1';
export const MAX_PLAYERS = 4;

export interface JoinOptions {
  protocolVersion: string;
  displayName?: string;
}
