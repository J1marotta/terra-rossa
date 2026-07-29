export type ConnectionStatus =
  'idle' | 'connecting' | 'connected' | 'failed' | 'closed';

export interface PlayerView {
  readonly id: string;
  readonly displayName: string;
  readonly isLocal: boolean;
  readonly x: number;
  readonly z: number;
  readonly lastProcessedSequence: number;
  readonly dashTicksRemaining: number;
  readonly dashCooldownTicksRemaining: number;
  readonly dashRecoveryTicksRemaining: number;
  readonly dashX: number;
  readonly dashZ: number;
  readonly dashEvent: number;
}

export interface RoomView {
  readonly protocolVersion: string;
  readonly phase: string;
  readonly players: readonly PlayerView[];
}

export interface ConnectionSnapshot {
  readonly status: ConnectionStatus;
  readonly room: RoomView | null;
  readonly error: string | null;
}
