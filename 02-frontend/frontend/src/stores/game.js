import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useGameStore = defineStore('game', () => {
  const username = ref(localStorage.getItem('username') || '');
  const ws = ref(null);
  const currentRoom = ref(null);
  const isHost = ref(false);
  const opponent = ref(null);
  const isReady = ref(false);
  const opponentReady = ref(false);
  const gameStarted = ref(false);
  const myChoice = ref(null);
  const opponentChoice = ref(null);
  const gameResult = ref(null);
  const canStartGame = ref(false);
  const messageQueue = ref([]);
  const isConnecting = ref(false);
  const error = ref(null);
  const wantsToPlayAgain = ref(false);
  const opponentWantsToPlayAgain = ref(false);

  const isAuthenticated = computed(() => !!username.value);

  function setUsername(newUsername) {
    username.value = newUsername;
    localStorage.setItem('username', newUsername);
  }

  function connectWebSocket() {
    if (ws.value || isConnecting.value) return;
    
    isConnecting.value = true;
    ws.value = new WebSocket('ws://localhost:3002');
    
    ws.value.onopen = () => {
      isConnecting.value = false;
      error.value = null;
      // Send any queued messages
      while (messageQueue.value.length > 0) {
        const message = messageQueue.value.shift();
        ws.value.send(JSON.stringify(message));
      }
    };
    
    ws.value.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'room_created':
        case 'room_joined':
          currentRoom.value = data.roomId;
          error.value = null;
          break;
          
        case 'player_joined':
          opponent.value = data.username;
          error.value = null;
          break;
          
        case 'player_ready_update':
          if (data.player === (isHost.value ? 'guest' : 'host')) {
            opponentReady.value = data.ready;
          }
          break;
          
        case 'game_can_start':
          canStartGame.value = true;
          break;
          
        case 'game_started':
          gameStarted.value = true;
          break;
          
        case 'game_result':
          opponentChoice.value = isHost.value ? data.guestChoice : data.hostChoice;
          // Determine the result message based on who won
          if (data.result === 'tie') {
            gameResult.value = "It's a tie!";
          } else if ((data.result === 'host' && isHost.value) || (data.result === 'guest' && !isHost.value)) {
            gameResult.value = 'You won! 🎉';
          } else {
            gameResult.value = 'You lost! Better luck next time!';
          }
          break;
          
        case 'player_disconnected':
          resetGame();
          error.value = data.message || 'Opponent disconnected';
          break;

        case 'error':
          error.value = data.message;
          if (data.message.includes('Invalid room') || data.message.includes('Room is full')) {
            resetGame();
          }
          break;

        case 'play_again_request':
          opponentWantsToPlayAgain.value = true;
          break;

        case 'game_restart':
          resetRound();
          break;
      }
    };

    ws.value.onerror = (error) => {
      console.error('WebSocket error:', error);
      isConnecting.value = false;
      error.value = 'Connection error. Please try again.';
    };

    ws.value.onclose = () => {
      ws.value = null;
      isConnecting.value = false;
      error.value = 'Connection lost. Please refresh the page.';
    };
  }

  function sendMessage(message) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message));
    } else {
      messageQueue.value.push(message);
      if (!ws.value) {
        connectWebSocket();
      }
    }
  }

  function createRoom(roomName, password = '') {
    isHost.value = true;
    error.value = null;
    sendMessage({
      type: 'create_room',
      roomName,
      password,
      playerId: crypto.randomUUID(),
      username: username.value
    });
  }

  function joinRoom(roomName, password = '') {
    isHost.value = false;
    error.value = null;
    sendMessage({
      type: 'join_room',
      roomName,
      password,
      playerId: crypto.randomUUID(),
      username: username.value
    });
  }

  function setReady() {
    isReady.value = true;
    error.value = null;
    sendMessage({
      type: 'player_ready'
    });
  }

  function startGame() {
    error.value = null;
    sendMessage({
      type: 'start_game'
    });
  }

  function makeChoice(choice) {
    myChoice.value = choice;
    sendMessage({
      type: 'make_choice',
      choice
    });
  }

  function playAgain() {
    wantsToPlayAgain.value = true;
    sendMessage({
      type: 'play_again',
      player: isHost.value ? 'host' : 'guest'
    });
  }

  function resetRound() {
    myChoice.value = null;
    opponentChoice.value = null;
    gameResult.value = null;
    isReady.value = false;
    opponentReady.value = false;
    gameStarted.value = false;
    canStartGame.value = false;
    wantsToPlayAgain.value = false;
    opponentWantsToPlayAgain.value = false;
  }

  function resetGame() {
    resetRound();
    currentRoom.value = null;
    opponent.value = null;
    isHost.value = false;
  }

  return {
    username,
    isAuthenticated,
    currentRoom,
    isHost,
    opponent,
    isReady,
    opponentReady,
    gameStarted,
    myChoice,
    opponentChoice,
    gameResult,
    canStartGame,
    error,
    wantsToPlayAgain,
    opponentWantsToPlayAgain,
    setUsername,
    createRoom,
    joinRoom,
    setReady,
    startGame,
    makeChoice,
    playAgain,
    resetGame
  };
}); 