import { defineComponent, ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useGameRestStore } from '../../stores/gameRest';
import { storeToRefs } from 'pinia';
import template from './template.html?raw';
import './styles.css';

export default defineComponent({
  name: 'Game',
  template,
  setup() {
    const router = useRouter();
    const store = useGameRestStore();
    const { isReady, opponentReady, gameStarted, error, choices, wantsToPlayAgain, opponentWantsToPlayAgain, playerType, host, guest, status, result, resultMessage } = storeToRefs(store);
    const showResult = ref(false);
    const showPlayAgain = ref(false);
    const wantsAgain = ref(false);

    const myChoice = computed(() => {
      if (playerType.value === 'host') return choices.value.host;
      if (playerType.value === 'guest') return choices.value.guest;
      return null;
    });
    const opponentChoice = computed(() => {
      if (playerType.value === 'host') return choices.value.guest;
      if (playerType.value === 'guest') return choices.value.host;
      return null;
    });

    // Watch for state changes
    watch(gameStarted, (started) => {
      if (!started) {
        showResult.value = false;
        showPlayAgain.value = false;
      }
    });

    // Watch for choices to determine result
    watch([choices, status, result], async () => {
      if (choices.value.host && choices.value.guest && status.value === 'playing' && result.value) {
        showResult.value = true;
        showPlayAgain.value = true;
      }
    });

    async function makeChoice(choice) {
      await store.makeChoice(choice);
      await store.fetchState();
      // showResult/showPlayAgain will be set by watcher
    }

    async function handlePlayAgain() {
      wantsAgain.value = true;
      await store.playAgain();
      await store.fetchState();
    }

    function handleLeaveGame() {
      store.resetGame();
      router.push('/');
    }

    return {
      isReady,
      opponentReady,
      gameStarted,
      error,
      choices,
      wantsToPlayAgain,
      opponentWantsToPlayAgain,
      playerType,
      host,
      guest,
      status,
      myChoice,
      opponentChoice,
      showResult,
      showPlayAgain,
      wantsAgain,
      result,
      resultMessage,
      makeChoice,
      handlePlayAgain,
      handleLeaveGame
    };
  }
}); 