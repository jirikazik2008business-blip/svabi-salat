import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CockroachIcon,
  CopyIcon,
  CrownIcon,
  CheckIcon
} from './icons';
import { savePlayer, getPlayer } from '../storage';

function Lobby({ socket }) {
  const [playerName, setPlayerName] = useState('');
  const [playerAge, setPlayerAge] = useState('');
  const [lobbyId, setLobbyId] = useState('');
  const [joined, setJoined] = useState(false);
  const [currentLobbyId, setCurrentLobbyId] = useState('');
  const [players, setPlayers] = useState([]);
  const [hostId, setHostId] = useState(null);
  const [expectedPlayerCount, setExpectedPlayerCount] = useState(2);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [connected, setConnected] = useState(socket.connected);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoJoinedRef = useRef(false);

  const showError = useCallback((message) => {
    setError(message);
    window.setTimeout(() => setError(''), 4000);
  }, []);

  const showNotice = useCallback((message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 4000);
  }, []);

  useEffect(() => {
    const urlLobbyId = searchParams.get('room');
    const urlName = searchParams.get('name');
    const urlAge = searchParams.get('age');

    if (urlLobbyId) setLobbyId(urlLobbyId.toUpperCase());
    if (urlName) setPlayerName(urlName);
    if (urlAge) setPlayerAge(urlAge);

    if (urlLobbyId && urlName && urlAge && !autoJoinedRef.current) {
      autoJoinedRef.current = true;
      savePlayer({ lobbyId: urlLobbyId.toUpperCase(), name: urlName, age: urlAge });
      window.setTimeout(() => {
        socket.emit('join_lobby', { lobbyId: urlLobbyId.toUpperCase(), playerName: urlName, age: urlAge });
      }, 100);
    }

    const onConnect = () => {
      setConnected(true);
      const stored = getPlayer();
      if (stored && stored.lobbyId) {
        socket.emit('join_lobby', {
          lobbyId: stored.lobbyId,
          playerName: stored.name,
          age: stored.age
        });
      }
    };
    const onDisconnect = () => setConnected(false);

    const onLobbyJoined = ({ lobbyId: id }) => {
      setCurrentLobbyId(id);
      setJoined(true);
      window.history.pushState({}, '', `/game/${id}`);
    };

    const onGameState = (game) => {
      setPlayers(game.players);
      setHostId(game.hostId);
      if (game.expectedPlayerCount) setExpectedPlayerCount(game.expectedPlayerCount);
      if (game.gameState === 'PLAYING' || game.gameState === 'ENDED') {
        navigate(`/game/${game.lobbyId}`);
      }
    };

    const onError = ({ message }) => showError(message);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('lobby_joined', onLobbyJoined);
    socket.on('game_state_update', onGameState);
    socket.on('error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('lobby_joined', onLobbyJoined);
      socket.off('game_state_update', onGameState);
      socket.off('error', onError);
    };
  }, [socket, navigate, searchParams, showError]);

  const handleJoin = (e) => {
    e.preventDefault();
    const name = playerName.trim();
    if (!name) {
      showError('Zadej prosím své jméno.');
      return;
    }
    if (!playerAge.trim() || parseInt(playerAge, 10) < 1 || parseInt(playerAge, 10) > 120) {
      showError('Zadej platný věk (1–120).');
      return;
    }
    const target = lobbyId.trim().toUpperCase() || null;
    savePlayer({ lobbyId: target || undefined, name, age: playerAge });
    socket.emit('join_lobby', { lobbyId: target, playerName: name, age: playerAge });
  };

  const handleStartGame = () => {
    socket.emit('start_game', { lobbyId: currentLobbyId });
  };

  const handleSetPlayerCount = (count) => {
    setExpectedPlayerCount(count);
    socket.emit('set_player_count', { lobbyId: currentLobbyId, count });
  };

  const handleToggleReady = () => {
    socket.emit('toggle_ready', { lobbyId: currentLobbyId });
  };

  const getCurrentPlayer = () => players.find((p) => p.id === socket.id);

  const handleCreateNew = () => {
    if (currentLobbyId) {
      socket.emit('leave_lobby', { lobbyId: currentLobbyId });
    }
    setLobbyId('');
    setJoined(false);
    setCurrentLobbyId('');
    setPlayers([]);
    setHostId(null);
    setError('');
    setNotice('');
    navigate('/');
  };

  const handleCopyInviteLink = () => {
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return;
    const inviteUrl = `${window.location.origin}/?room=${currentLobbyId}&name=${encodeURIComponent(playerName)}&age=${playerAge}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      showNotice('Pozvánka byla zkopírována.');
    }).catch(() => {
      showNotice('Zkopíruj adresu z řádku prohlížeče.');
    });
  };

  const isHost = hostId === socket.id;

  if (joined) {
    return (
      <div className="min-h-screen bg-white p-4">
        <div className="mx-auto max-w-md">
          <header className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-white">
              <CockroachIcon className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-ink">ŠVÁBÍ SALÁT</h1>
            <p className="mt-1 text-xs text-gray-500">Čekárna</p>
          </header>

          {!connected && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-700 animate-pulse-soft">
              Ztratili jsme spojení, snažíme se připojit…
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-primary-dark">
              {notice}
            </div>
          )}

          <div className="card-flat p-4 mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="label mb-1">Kód lobby</p>
                <p className="font-mono text-2xl font-bold tracking-widest text-ink">{currentLobbyId}</p>
              </div>
              <button
                onClick={handleCopyInviteLink}
                className="btn-secondary flex !w-auto items-center gap-2 whitespace-nowrap !px-3 !py-2 text-sm"
              >
                <CopyIcon className="h-4 w-4" />
                Pozvánka
              </button>
            </div>
          </div>

          {isHost && (
            <div className="card-flat p-4 mb-4">
              <p className="label mb-3">Počet hráčů</p>
              <div className="grid grid-cols-5 gap-2">
                {[2, 3, 4, 5, 6].map((count) => (
                  <button
                    key={count}
                    onClick={() => handleSetPlayerCount(count)}
                    className={`rounded-lg py-2 text-sm font-bold transition-colors ${
                      expectedPlayerCount === count
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card-flat p-4 mb-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="label">Hráči</p>
              <span className="text-xs font-semibold text-gray-500">
                {players.length}/{expectedPlayerCount || '—'}
              </span>
            </div>
            <ul className="space-y-2">
              {players.map((player) => (
                <li
                  key={player.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                    player.ready ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {player.id === hostId && <CrownIcon className="h-4 w-4 shrink-0 text-amber-500" />}
                    <span className="truncate text-sm font-semibold text-ink">{player.name}</span>
                    <span className="shrink-0 text-xs text-gray-400">{player.age} let</span>
                    {player.id === socket.id && <span className="shrink-0 text-xs font-semibold text-primary">(ty)</span>}
                  </div>
                  {player.ready ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-green-600">
                      <CheckIcon className="h-3.5 w-3.5" />
                      Připraven
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-gray-400">čeká…</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleToggleReady}
            disabled={!getCurrentPlayer()}
            className={`btn-primary mb-4 ${getCurrentPlayer()?.ready ? '!bg-gray-200 !text-gray-500 hover:!bg-gray-200' : ''}`}
          >
            {getCurrentPlayer()?.ready ? 'Nejsem připraven' : 'Připravit se'}
          </button>

          {isHost &&
            (players.length === expectedPlayerCount && players.every((p) => p.ready) ? (
              <button onClick={handleStartGame} className="btn-primary mb-4">
                Spustit hru
              </button>
            ) : (
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-500">
                {players.length !== expectedPlayerCount
                  ? `Čeká se na ${expectedPlayerCount - players.length} dalších hráčů…`
                  : 'Čeká se, až budou všichni připraveni…'}
              </div>
            ))}

          {!isHost && (
            <p className="mb-4 text-center text-sm text-gray-500">Čeká se, až hostitel spustí hru…</p>
          )}

          <button onClick={handleCreateNew} className="btn-secondary">
            Vytvořit nové lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900 text-white">
            <CockroachIcon className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">ŠVÁBÍ SALÁT</h1>
          <p className="mt-1 text-sm text-gray-500">Karetní hra pro 2–6 hráčů</p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="card-flat space-y-4 p-6">
          <div>
            <label className="label mb-1.5" htmlFor="playerName">Tvoje jméno</label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="input-flat"
              placeholder="Zadej jméno"
              maxLength={20}
            />
          </div>

          <div>
            <label className="label mb-1.5" htmlFor="playerAge">Tvůj věk</label>
            <input
              id="playerAge"
              type="number"
              value={playerAge}
              onChange={(e) => setPlayerAge(e.target.value)}
              className="input-flat"
              placeholder="Zadej věk"
              min={1}
              max={120}
            />
          </div>

          <div>
            <label className="label mb-1.5" htmlFor="lobbyId">Kód lobby (volitelné)</label>
            <input
              id="lobbyId"
              type="text"
              value={lobbyId}
              onChange={(e) => setLobbyId(e.target.value.toUpperCase())}
              className="input-flat font-mono"
              placeholder="Prázdné = vytvoří nové"
              maxLength={5}
            />
          </div>

          <button type="submit" className="btn-primary">
            {lobbyId ? 'Připojit se' : 'Vytvořit lobby'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          Pro hru si s přáteli otevři hlasový hovor.
        </p>
      </div>
    </div>
  );
}

export default Lobby;