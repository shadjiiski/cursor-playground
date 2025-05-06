import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameRestStore } from '../../stores/gameRest';
import { storeToRefs } from 'pinia';
import template from './template.html?raw';
import './styles.css';

export default {
  name: 'WelcomeScreen',
  template,
  setup() {
    const router = useRouter();
    const store = useGameRestStore();
    const { isAuthenticated } = storeToRefs(store);
    const username = ref(store.username);

    const startPlaying = async () => {
      if (username.value) {
        await store.setUsername(username.value);
        router.push('/lobby');
      }
    };

    return {
      username,
      startPlaying,
      isAuthenticated
    };
  }
}; 