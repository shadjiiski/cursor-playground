<script>
import { defineComponent } from 'vue';
import WelcomeScreen from './components/WelcomeScreen';
import Lobby from './components/Lobby';
import Game from './components/Game';

export default defineComponent({
  name: 'App',
  components: {
    WelcomeScreen,
    Lobby,
    Game
  }
});
</script>

<template>
  <div id="app">
    <nav>
      <router-link to="/">Home</router-link>
      <router-link to="/lobby">Lobby</router-link>
      <router-link to="/game">Game</router-link>
    </nav>
    <router-view></router-view>
  </div>
</template>

<style>
:root {
  --primary-color: #2196f3;
  --accent-color: #4caf50;
  --background-color: #f5f5f5;
  --text-color: #333;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background: var(--background-color);
  min-height: 100vh;
  display: flex;
  justify-content: center;
}

#app {
  width: 100%;
  max-width: 1200px;
  padding: 2rem;
}

nav {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

nav a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: bold;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.3s ease;
}

nav a:hover {
  background: var(--primary-color);
  color: white;
}

nav a.router-link-active {
  background: var(--primary-color);
  color: white;
}

h1, h2, h3 {
  margin-bottom: 1rem;
  text-align: center;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  margin-bottom: 1rem;
}

input:focus {
  outline: none;
  border-color: var(--primary-color);
}

button {
  width: 100%;
  padding: 0.75rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>
