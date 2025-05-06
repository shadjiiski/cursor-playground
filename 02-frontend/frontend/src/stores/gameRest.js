import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';

const API = 'http://localhost:3001/api/rooms';

export const useGameRestStore = defineStore('gameRest', () => {
  // Persistent player/room
  const playerId = ref(localStorage.getItem('playerId') || uuidv4());
  const roomName = ref(localStorage.getItem('roomName') || '');
  const username = ref(localStorage.getItem('username') || '');

  // Game state
  const playerType = ref(null); // 'host' or 'guest'
  const host = ref(null);
  const guest = ref(null);
  const status = ref('waiting');
  const choices = ref({ host: false, guest: false });
  const wantsToPlayAgain = ref({ host: false, guest: false });
  const error = ref(null);
  const polling = ref(null);
  const result = ref(null);

  // Computed
  const isAuthenticated = computed(() => !!username.value);
  const isReady = computed(() => playerType.value && (playerType.value === 'host' ? host.value?.ready : guest.value?.ready));
  const opponentReady = computed(() => playerType.value && (playerType.value === 'host' ? guest.value?.ready : host.value?.ready));
  const opponent = computed(() => playerType.value === 'host' ? guest.value?.username : host.value?.username);
  const gameStarted = computed(() => status.value === 'playing');
  const resultMessage = computed(() => {
    if (!result.value) return '';
    if (result.value === 'tie') return "It's a draw!";
    if ((result.value === 'host' && playerType.value === 'host') || (result.value === 'guest' && playerType.value === 'guest')) {
      return 'You won!';
    } else {
      return 'You lost!';
    }
  });

  // Persistence helpers
  function persist() {
    localStorage.setItem('playerId', playerId.value);
    localStorage.setItem('roomName', roomName.value);
    localStorage.setItem('username', username.value);
  }

  // API helpers
  async function fetchState() {
    if (!roomName.value || !playerId.value) return;
    try {
      const res = await fetch(`${API}/${roomName.value}/state?playerId=${playerId.value}`);
      if (!res.ok) throw new Error('Failed to fetch state');
      const data = await res.json();
      playerType.value = data.playerType;
      host.value = data.host;
      guest.value = data.guest;
      status.value = data.status;
      choices.value = data.choices;
      wantsToPlayAgain.value = data.wantsToPlayAgain;
      result.value = data.result;
      error.value = null;
    } catch (e) {
      error.value = e.message;
    }
  }

  function startPolling() {
    if (polling.value) return;
    polling.value = setInterval(fetchState, 1500);
  }
  function stopPolling() {
    if (polling.value) clearInterval(polling.value);
    polling.value = null;
  }

  // Actions
  async function setUsername(name) {
    username.value = name;
    persist();
  }

  async function createRoom(room, password = '') {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: room, password, playerId: playerId.value, username: username.value })
      });
      const data = await res.json();
      if (res.ok) {
        roomName.value = room;
        persist();
        await fetchState();
        startPolling();
      } else {
        error.value = data.error;
      }
    } catch (e) {
      error.value = e.message;
    }
  }

  async function joinRoom(room, password = '') {
    try {
      const res = await fetch(`${API}/${room}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: playerId.value, username: username.value, password })
      });
      const data = await res.json();
      if (res.ok) {
        roomName.value = room;
        persist();
        await fetchState();
        startPolling();
      } else {
        error.value = data.error;
      }
    } catch (e) {
      error.value = e.message;
    }
  }

  async function setReady() {
    try {
      const res = await fetch(`${API}/${roomName.value}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: playerId.value })
      });
      if (!res.ok) {
        const data = await res.json();
        error.value = data.error;
      } else {
        await fetchState();
      }
    } catch (e) {
      error.value = e.message;
    }
  }

  async function makeChoice(choice) {
    try {
      const res = await fetch(`${API}/${roomName.value}/choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: playerId.value, choice })
      });
      if (!res.ok) {
        const data = await res.json();
        error.value = data.error;
      } else {
        await fetchState();
      }
    } catch (e) {
      error.value = e.message;
    }
  }

  async function playAgain() {
    try {
      const res = await fetch(`${API}/${roomName.value}/play-again`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: playerId.value })
      });
      if (!res.ok) {
        const data = await res.json();
        error.value = data.error;
      } else {
        await fetchState();
      }
    } catch (e) {
      error.value = e.message;
    }
  }

  function resetGame() {
    stopPolling();
    roomName.value = '';
    playerType.value = null;
    host.value = null;
    guest.value = null;
    status.value = 'waiting';
    choices.value = { host: false, guest: false };
    wantsToPlayAgain.value = { host: false, guest: false };
    error.value = null;
    localStorage.removeItem('roomName');
  }

  // On load, restore state if possible
  if (roomName.value && playerId.value) {
    fetchState();
    startPolling();
  }

  return {
    playerId,
    roomName,
    username,
    playerType,
    host,
    guest,
    status,
    choices,
    wantsToPlayAgain,
    error,
    isAuthenticated,
    isReady,
    opponentReady,
    opponent,
    gameStarted,
    result,
    resultMessage,
    setUsername,
    createRoom,
    joinRoom,
    setReady,
    makeChoice,
    playAgain,
    fetchState,
    resetGame
  };
}); 