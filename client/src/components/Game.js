import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CockroachIcon,
  CrownIcon,
  WarningIcon,
  RefreshIcon,
  TrophyIcon,
  CardIcon,
  LeaveIcon,
  EyeIcon
} from './icons';
import { getPlayer } from '../storage';

const CARD_IMAGES = {
  tomato: '/cards/rajce.webp',
  pepper: '/cards/paprika.webp',
  cauliflower: '/cards/kvetak.webp',
  salad: '/cards/salat.webp',
  'taboo-tomato': '/cards/svab-rajce.webp',
  'taboo-pepper': '/cards/svab-paprika.webp',
  'taboo-cauliflower': '/cards/svab-kvetak.webp',
  'taboo-salad': '/cards/svab-salat.webp'
};

function CardFace({ card }) {
  const src =
    card.type === 'taboo'
      ? CARD_IMAGES[`taboo-${card.vegetable}`]
      : CARD_IMAGES[card.vegetable];
  return (
    <div className="h-40 w-28 animate-card-pop overflow-hidden rounded-lg border border-black/10 shadow-sm md:h-44 md:w-32">
      <img src={src} alt="" draggable={false} className="h-full w-full select-none object-cover" />
    </div>
  );
}

function EmptyCard({ dashed }) {
  return (
    <div
      className={`h-40 w-28 rounded-lg md:h-44 md:w-32 flex flex-col items-center justify-center border ${
        dashed ? 'border-dashed border-gray-300 bg-gray-50' : 'border border-gray-200 bg-white'
      }`}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Prázdno</span>
    </div>
  );
}

function Game({ socket }) {
  const { lobbyId } = useParams();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [selectedPlayerForPenalty, setSelectedPlayerForPenalty] = useState('');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(socket.connected);
  const [peekCard, setPeekCard] = useState(null);

  useEffect(() => {
    const rejoin = () => {
      const stored = getPlayer();
      if (stored && stored.name) {
        socket.emit('join_lobby', { lobbyId, playerName: stored.name, age: stored.age });
      }
    };

    const onGameState = (game) => {
      setGameState(game);
      setCurrentPlayer(game.players.find((p) => p.id === socket.id) || null);
    };

    const onError = ({ message }) => {
      setError(message);
      window.setTimeout(() => setError(''), 4000);
    };

    const onConnect = () => {
      setConnected(true);
      rejoin();
    };
    const onDisconnect = () => setConnected(false);

    socket.on('game_state_update', onGameState);
    socket.on('error', onError);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      rejoin();
    }

    return () => {
      socket.off('game_state_update', onGameState);
      socket.off('error', onError);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket, lobbyId]);

  const handlePeek = () => {
    if (peekCard) {
      setPeekCard(null);
      return;
    }
    if (!currentPlayer) return;
    setPeekCard(currentPlayer.deck[1] || null);
  };

  const myDeckLength = currentPlayer?.deck.length ?? 0;
  useEffect(() => {
    setPeekCard(null);
  }, [myDeckLength]);

  const handleFlipCard = () => {
    if (gameState && gameState.players[gameState.activePlayerIndex]?.id === socket.id) {
      socket.emit('flip_card', { lobbyId });
    }
  };

  const handlePlayerError = () => {
    if (selectedPlayerForPenalty && gameState) {
      socket.emit('player_error', { lobbyId, penalizedPlayerId: selectedPlayerForPenalty });
      setSelectedPlayerForPenalty('');
    }
  };

  const handleEndGame = () => {
    socket.emit('end_game', { lobbyId });
  };

  const handleRestart = () => {
    socket.emit('restart_game', { lobbyId });
  };

  const handleLeave = () => {
    socket.emit('leave_lobby', { lobbyId });
    navigate('/');
  };

  if (!gameState) {
    const stored = getPlayer();
    const canRejoin = Boolean(stored && stored.name);
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
          <p className="text-sm font-semibold text-gray-500">
            {canRejoin ? 'Připojování ke hře…' : 'Nenašli jsme tě ve hře.'}
          </p>
          {!canRejoin && (
            <button onClick={() => navigate(`/?room=${lobbyId}`)} className="btn-primary mt-5">
              Zadat jméno a připojit se
            </button>
          )}
        </div>
      </div>
    );
  }

  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const isMyTurn = activePlayer?.id === socket.id;
  const isHost = gameState.hostId === socket.id;
  const topCard = gameState.discardPile[0];
  const secondaryTop = gameState.secondaryDiscardPile[0];
  const pilesEmpty = gameState.discardPile.length === 0 && gameState.secondaryDiscardPile.length === 0;
  const opponents = gameState.players.filter((p) => p.id !== socket.id);
  const activePileIndex = gameState.activePileIndex ?? 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl animate-fade-in-up p-4 pb-10">
        <header className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
              <CockroachIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-extrabold leading-tight tracking-tight text-ink">ŠVÁBÍ SALÁT</h1>
              <p className="font-mono text-xs text-gray-400">LOBBY {lobbyId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHost && (
              <span className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600">
                <CrownIcon className="h-3.5 w-3.5 text-amber-500" />
                Hostitel
              </span>
            )}
            <button
              onClick={handleLeave}
              className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
            >
              <LeaveIcon className="h-3.5 w-3.5" />
              Odejít
            </button>
          </div>
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

        <div
          className={`mb-4 rounded-xl px-4 py-3 text-center ${
            isMyTurn
              ? 'animate-pulse-soft border border-primary bg-primary text-white'
              : 'border border-gray-200 bg-gray-50 text-gray-600'
          }`}
        >
          <p className="text-sm font-bold uppercase tracking-wider">
            {isMyTurn ? 'Jsi na tahu — otoč kartu' : `Na tahu: ${activePlayer?.name || '…'}`}
          </p>
        </div>

        {opponents.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
            {opponents.map((player) => {
              const isActive = activePlayer?.id === player.id;
              return (
                <div
                  key={player.id}
                  className={`animate-fade-in-up rounded-xl border p-3 text-center ${
                    isActive ? 'border-primary bg-green-50' : 'border-gray-200 bg-white'
                  } ${!player.connected ? 'opacity-50' : ''}`}
                >
                  <p className={`truncate text-sm font-bold ${player.connected ? 'text-ink' : 'text-gray-400'}`}>
                    {player.name}
                  </p>
                  <div className="mx-auto mt-2 flex max-w-fit items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-white">
                    <CardIcon className="h-3.5 w-3.5 opacity-70" />
                    <span className="text-base font-bold tabular-nums leading-none">{player.deck.length}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    {!player.connected ? 'odpojen' : isActive ? 'na tahu' : 'karet'}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="mb-5 flex justify-center gap-3 md:gap-6">
          <div className="flex flex-col items-center">
            <p
              className={`label mb-2 ${activePileIndex === 0 ? 'text-gray-900' : 'text-gray-400'}`}
            >
              Hromádka 1 ({gameState.discardPile.length})
              {activePileIndex === 0 && (
                <span className="ml-1.5 animate-badge-pulse rounded bg-primary px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-white">
                  aktivní
                </span>
              )}
            </p>
            {topCard ? (
              <CardFace key={topCard.id} card={topCard} />
            ) : (
              <EmptyCard />
            )}
          </div>

          <div className="flex flex-col items-center">
            <p
              className={`label mb-2 ${activePileIndex === 1 ? 'text-gray-900' : 'text-gray-400'}`}
            >
              Hromádka 2 ({gameState.secondaryDiscardPile.length})
              {activePileIndex === 1 && (
                <span className="ml-1.5 animate-badge-pulse rounded bg-primary px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-white">
                  aktivní
                </span>
              )}
            </p>
            {secondaryTop ? (
              <CardFace key={secondaryTop.id} card={secondaryTop} />
            ) : (
              <EmptyCard dashed />
            )}
          </div>
        </div>

        <div className="card-flat mb-4 flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-bold text-ink">Tvůj balíček</p>
            <p className="text-xs text-gray-500">karet na otočení</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-white">
            <CardIcon className="h-4 w-4 opacity-70" />
            <span className="text-2xl font-bold tabular-nums leading-none">
              {currentPlayer?.deck.length || 0}
            </span>
          </div>
        </div>

        <div className="card-flat mb-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">Náhled karty</p>
              <p className="text-xs text-gray-500">karta v balíčku pod vrchní</p>
            </div>
            <button
              onClick={handlePeek}
              disabled={!currentPlayer || currentPlayer.deck.length < 2}
              className="btn-secondary flex !w-auto shrink-0 items-center gap-2 !px-3 !py-2 text-sm"
            >
              <EyeIcon className="h-4 w-4" />
              {peekCard ? 'Skrýt' : 'Nakouknout'}
            </button>
          </div>
          {peekCard ? (
            <div className="mt-4 flex justify-center">
              <CardFace key={peekCard.id} card={peekCard} />
            </div>
          ) : (
            <p className="mt-4 text-center text-xs text-gray-400">
              {currentPlayer && currentPlayer.deck.length < 2
                ? 'Nemáš žádnou kartu pod vrchní.'
                : 'Odhalí se jen karta, která přijde po té, co položíš.'}
            </p>
          )}
        </div>

        <button
          onClick={handleFlipCard}
          disabled={!isMyTurn || !currentPlayer || currentPlayer.deck.length === 0}
          className={`mb-5 w-full rounded-xl py-4 text-lg font-bold transition-colors active:scale-[0.98] ${
            isMyTurn && currentPlayer && currentPlayer.deck.length > 0
              ? 'bg-primary text-white hover:bg-primary-dark'
              : 'cursor-not-allowed bg-gray-100 text-gray-400'
          }`}
        >
          {isMyTurn ? 'OTOČIT KARTU' : `Čeká se na ${activePlayer?.name || '…'}`}
        </button>

        <div className="card-flat border-red-200 bg-red-50/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <WarningIcon className="h-5 w-5 text-danger" />
            <p className="text-sm font-bold uppercase tracking-wider text-danger">Hlásit chybu</p>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            Pletl se někdo v řeči? Zvol hráče, který hromádku přebere.
          </p>
          <select
            value={selectedPlayerForPenalty}
            onChange={(e) => setSelectedPlayerForPenalty(e.target.value)}
            className="input-flat mb-3"
          >
            <option value="">Vyber hráče…</option>
            {gameState.players
              .filter((p) => p.id !== socket.id)
              .map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
          </select>
          <button
            onClick={handlePlayerError}
            disabled={!selectedPlayerForPenalty || pilesEmpty}
            className={`w-full rounded-xl py-3 text-base font-bold transition-colors ${
              selectedPlayerForPenalty && !pilesEmpty
                ? 'bg-danger text-white hover:bg-red-700'
                : 'cursor-not-allowed bg-gray-100 text-gray-400'
            }`}
          >
            Nahlásit přeřeknutí
          </button>
          {pilesEmpty && <p className="mt-2 text-center text-xs text-gray-500">Hromádky jsou prázdné.</p>}
        </div>

        {isHost && gameState.gameState === 'PLAYING' && (
          <button onClick={handleEndGame} className="btn-secondary mt-4 !py-2 text-sm">
            Ukončit hru a vyhlásit vítěze
          </button>
        )}

        {gameState.gameState === 'ENDED' && gameState.standings && (
          <div className="mt-6 animate-fade-in-up rounded-xl border-2 border-gray-900 p-5">
            <div className="mb-4 flex items-center gap-2">
              <TrophyIcon className="h-6 w-6 text-amber-500" />
              <h2 className="text-lg font-extrabold tracking-tight text-ink">Konec hry</h2>
            </div>
            <ul className="space-y-2">
              {gameState.standings.map((entry) => {
                const isWinner = entry.id === gameState.winnerId;
                const isMe = entry.id === socket.id;
                return (
                  <li
                    key={entry.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                      isWinner ? 'border-primary bg-green-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isWinner ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {entry.rank}
                      </span>
                      <span className={`truncate text-sm font-bold ${isWinner ? 'text-ink' : 'text-gray-700'}`}>
                        {entry.name}
                        {isMe && <span className="ml-1 text-xs font-semibold text-primary">(ty)</span>}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-gray-500">{entry.cards} karet</span>
                  </li>
                );
              })}
            </ul>
            {isHost && (
              <button onClick={handleRestart} className="btn-primary mt-4 flex items-center justify-center gap-2">
                <RefreshIcon className="h-4 w-4" />
                Nový zápas
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Game;
