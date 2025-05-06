import { createRouter, createWebHistory } from 'vue-router';
import WelcomeScreen from './components/WelcomeScreen';
import Lobby from './components/Lobby';
import Game from './components/Game';

const routes = [
  {
    path: '/',
    name: 'Welcome',
    component: WelcomeScreen
  },
  {
    path: '/lobby',
    name: 'Lobby',
    component: Lobby
  },
  {
    path: '/game',
    name: 'Game',
    component: Game
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router; 