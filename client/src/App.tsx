import { useEffect, useMemo, useState } from 'react';

import { clientConfig } from './config';
import { GameCanvas } from './game/GameCanvas';
import { GameConnection } from './multiplayer/GameConnection';
import type { ConnectionSnapshot } from './multiplayer/types';

export function App() {
  const connection = useMemo(
    () => new GameConnection(clientConfig.colyseusUrl),
    [],
  );
  const [snapshot, setSnapshot] = useState<ConnectionSnapshot>(() =>
    connection.getSnapshot(),
  );
  const [displayName, setDisplayName] = useState('Scout');
  const [roomCode, setRoomCode] = useState('');

  useEffect(() => {
    const unsubscribe = connection.subscribe(setSnapshot);
    return () => {
      unsubscribe();
      connection.disconnect();
    };
  }, [connection]);

  const localPlayer = snapshot.room?.players.find((player) => player.isLocal);
  const room = snapshot.room;
  const inLobby = snapshot.status === 'connected' && room?.phase === 'lobby';
  const inResults =
    snapshot.status === 'connected' && room?.phase === 'round_over';
  const canStart =
    room !== null &&
    room !== undefined &&
    localPlayer?.id === room.hostPlayerId &&
    room.players.length >= 2 &&
    room.players.every((player) => player.ready);

  return (
    <main className="app-shell">
      {room !== null && room !== undefined && !inLobby && (
        <GameCanvas
          players={room.players.filter((player) => player.positionVisible)}
          creatures={room.creatures.filter(
            (creature) => creature.positionVisible,
          )}
          creatureProjectiles={room.creatureProjectiles.filter(
            (projectile) => projectile.positionVisible,
          )}
          pickups={room.pickups.filter((pickup) => pickup.positionVisible)}
          visibilityRadiusMetres={room.visibilityRadiusMetres}
          darknessStage={room.darknessStage}
          darknessDamagePerSecond={room.darknessDamagePerSecond}
          sendMovement={connection.sendMovement}
          sendDash={connection.sendDash}
          sendAim={connection.sendAim}
          sendFire={connection.sendFire}
          sendReloadStart={connection.sendReloadStart}
          sendReloadAttempt={connection.sendReloadAttempt}
          sendMelee={connection.sendMelee}
          sendInteract={connection.sendInteract}
        />
      )}
      {snapshot.status !== 'connected' && (
        <section className="lobby-panel" aria-labelledby="lobby-title">
          <p className="eyebrow">Terra Rossa</p>
          <h1 id="lobby-title">Enter the night.</h1>
          <label>
            Dog name
            <input
              maxLength={20}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          <div className="lobby-actions">
            <button
              disabled={snapshot.status === 'connecting'}
              onClick={() => void connection.createPrivate(displayName)}
              type="button"
            >
              Create private room
            </button>
            <label>
              Friend code
              <input
                maxLength={6}
                value={roomCode}
                onChange={(event) =>
                  setRoomCode(event.target.value.toUpperCase())
                }
              />
            </label>
            <button
              disabled={snapshot.status === 'connecting'}
              onClick={() => void connection.joinPrivate(displayName, roomCode)}
              type="button"
            >
              Join room
            </button>
          </div>
          <p className="connection-status">Server: {snapshot.status}</p>
          {snapshot.error !== null && (
            <p className="connection-error" role="alert">
              {snapshot.error}
            </p>
          )}
        </section>
      )}
      {inLobby && room !== null && room !== undefined && (
        <section className="lobby-panel" aria-labelledby="room-title">
          <p className="eyebrow">Private room</p>
          <h1 id="room-title">Code {room.roomCode}</h1>
          <ul className="roster">
            {room.players.map((player) => (
              <li key={player.id}>
                <span>
                  {player.displayName}
                  {player.id === room.hostPlayerId ? ' · host' : ''}
                  {!player.connected ? ' · disconnected' : ''}
                </span>
                <strong>{player.ready ? 'Ready' : 'Waiting'}</strong>
              </li>
            ))}
          </ul>
          <div className="lobby-actions row">
            <button
              onClick={() => connection.sendReady(!localPlayer?.ready)}
              type="button"
            >
              {localPlayer?.ready ? 'Not ready' : 'Ready up'}
            </button>
            {localPlayer?.id === room.hostPlayerId && (
              <button
                disabled={!canStart}
                onClick={() => connection.sendStart()}
                type="button"
              >
                Start
              </button>
            )}
            <button onClick={() => connection.disconnect()} type="button">
              Leave
            </button>
          </div>
          <p>Two to four dogs. Everyone must be ready.</p>
        </section>
      )}
      {inResults && room !== null && room !== undefined && (
        <section className="lobby-panel" aria-labelledby="results-title">
          <p className="eyebrow">Round over</p>
          <h1 id="results-title">
            {room.resultKind === 'draw'
              ? 'The night takes everyone.'
              : `${room.players.find((player) => player.id === room.winnerPlayerId)?.displayName ?? 'One dog'} survives.`}
          </h1>
          {localPlayer?.id === room.hostPlayerId ? (
            <button onClick={() => connection.sendRematch()} type="button">
              Return to lobby
            </button>
          ) : (
            <p>Waiting for the host.</p>
          )}
        </section>
      )}
      {snapshot.status === 'connected' &&
        room?.phase === 'countdown' &&
        !inLobby &&
        !inResults && (
          <section className="title-panel">
            <p className="eyebrow">Terra Rossa</p>
            <h1>
              Go in {Math.max(1, Math.ceil(room.countdownTicksRemaining / 30))}
            </h1>
            <p>Four dogs will enter. Only one leaves the dark.</p>
            <p className="connection-status" data-status={snapshot.status}>
              {snapshot.status === 'connected' && localPlayer !== undefined
                ? `Connected as ${localPlayer.displayName} · ${localPlayer.id.slice(0, 8)}`
                : `Server: ${snapshot.status}`}
            </p>
            {snapshot.error !== null && (
              <p className="connection-error" role="alert">
                {snapshot.error}
              </p>
            )}
          </section>
        )}
    </main>
  );
}
