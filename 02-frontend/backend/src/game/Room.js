export class Room {
  constructor(id, name, password, host) {
    this.id = id;
    this.name = name;
    this.password = password;
    this.host = host;
    this.guest = null;
    this.status = 'waiting';
    this.result = null; // winner: 'host', 'guest', or 'tie'
  }

  addGuest(guest) {
    if (this.guest) {
      throw new Error('Room is full');
    }
    this.guest = guest;
  }

  removeGuest() {
    this.guest = null;
  }

  isFull() {
    return !!this.guest;
  }

  hasPassword() {
    return !!this.password;
  }

  checkPassword(password) {
    return !this.password || this.password === password;
  }

  getPlayer(playerType) {
    return this[playerType];
  }

  setPlayerReady(playerType) {
    if (this[playerType]) {
      this[playerType].ready = true;
    }
  }

  areBothPlayersReady() {
    return this.host.ready && this.guest?.ready;
  }

  setPlayerChoice(playerType, choice) {
    if (this[playerType]) {
      this[playerType].choice = choice;
    }
  }

  haveBothPlayersChosen() {
    return this.host.choice && this.guest?.choice;
  }

  setResult(result) {
    this.result = result;
  }

  resetChoicesAndResult() {
    this.host.choice = null;
    if (this.guest) {
      this.guest.choice = null;
    }
    this.result = null;
  }

  setPlayerWantsToPlayAgain(playerType) {
    if (this[playerType]) {
      this[playerType].wantsToPlayAgain = true;
    }
  }

  doBothPlayersWantToPlayAgain() {
    return this.host.wantsToPlayAgain && this.guest?.wantsToPlayAgain;
  }

  resetPlayAgainState() {
    this.host.wantsToPlayAgain = false;
    if (this.guest) {
      this.guest.wantsToPlayAgain = false;
    }
  }

  toPublicRoom() {
    return {
      id: this.id,
      name: this.name,
      host: this.host.username
    };
  }
} 