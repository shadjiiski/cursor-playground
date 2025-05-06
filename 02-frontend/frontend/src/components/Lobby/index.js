import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useGameRestStore } from '../../stores/gameRest';
import template from './template.html?raw';
import './styles.css';

export default {
  name: 'Lobby',
  template,
  setup() {
    const router = useRouter();
    const store = useGameRestStore();
    const { roomName, isReady, opponentReady, error, gameStarted } = storeToRefs(store);

    const activeTab = ref('host');
    const room = ref('');
    const password = ref('');
    const joinRoomName = ref('');
    const joinRoomPassword = ref('');

    const opponent = computed(() => store.playerType === 'host' ? store.guest?.username : store.host?.username);

    // Watch for game start and navigate both players
    watch(gameStarted, (newValue) => {
      if (newValue) {
        router.push('/game');
      }
    });

    async function createRoom() {
      await store.createRoom(room.value, password.value);
    }

    async function joinRoomAction() {
      await store.joinRoom(joinRoomName.value, joinRoomPassword.value);
    }

    async function setReady() {
      await store.setReady();
    }

    return {
      activeTab,
      room,
      password,
      joinRoomName,
      joinRoomPassword,
      roomName,
      isReady,
      opponentReady,
      error,
      gameStarted,
      opponent,
      createRoom,
      joinRoom: joinRoomAction,
      setReady
    };
  }
}; 