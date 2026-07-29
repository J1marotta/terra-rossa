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

  useEffect(() => {
    const unsubscribe = connection.subscribe(setSnapshot);
    void connection.connect('Scout');
    return () => {
      unsubscribe();
      connection.disconnect();
    };
  }, [connection]);

  const localPlayer = snapshot.room?.players.find((player) => player.isLocal);

  return (
    <main className="app-shell">
      <GameCanvas
        players={snapshot.room?.players ?? []}
        sendMovement={connection.sendMovement}
        sendDash={connection.sendDash}
        sendAim={connection.sendAim}
        sendFire={connection.sendFire}
        sendReloadStart={connection.sendReloadStart}
        sendReloadAttempt={connection.sendReloadAttempt}
      />
      <section className="title-panel">
        <p className="eyebrow">Terra Rossa</p>
        <h1>The night is gathering.</h1>
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
    </main>
  );
}
