const KEY = 'svabi_player';

export function savePlayer({ lobbyId, name, age }) {
  sessionStorage.setItem(KEY, JSON.stringify({ lobbyId, name, age }));
}

export function getPlayer() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPlayer() {
  sessionStorage.removeItem(KEY);
}