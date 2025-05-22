// Game state variables
const gameState = {
  cards: [],
  flippedCards: [],
  matchedPairs: 0,
  totalPairs: 0,
  clicks: 0,
  isLocked: false,
  gameStarted: false,
  timer: null,
  timeLeft: 0,
  difficulty: {
    easy: { pairs: 3, rows: 2, columns: 3, time: 120 }, // 2x3 grid
    medium: { pairs: 6, rows: 3, columns: 4, time: 90 }, // 3x4 grid
    hard: { pairs: 12, rows: 4, columns: 6, time: 60 }, // 4x6 grid
  },
  powerupAvailable: true,
};

// DOM elements
const gameBoard = document.getElementById("game-board");
const loadingElement = document.getElementById("loading");
const clicksCount = document.getElementById("clicks-count");
const pairsMatched = document.getElementById("pairs-matched");
const totalPairs = document.getElementById("total-pairs");
const timerElement = document.getElementById("timer");
const difficultySelect = document.getElementById("difficulty");
const startButton = document.getElementById("start-btn");
const resetButton = document.getElementById("reset-btn");
const powerupButton = document.getElementById("powerup-btn");
const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const appContainer = document.getElementById("app-container");
const gameMessage = document.getElementById("game-message");
const messageTitle = document.getElementById("message-title");
const messageContent = document.getElementById("message-content");
const messageButton = document.getElementById("message-btn");

// Initialize the game
function init() {
  loadTheme();
  setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
  startButton.addEventListener("click", startGame);
  resetButton.addEventListener("click", resetGame);
  powerupButton.addEventListener("click", activatePowerup);
  themeToggle.addEventListener("click", toggleTheme);
  messageButton.addEventListener("click", closeMessage);
}

// Load theme from memory (no localStorage in artifacts)
function loadTheme() {
  // Default to light mode since we can't use localStorage
  appContainer.classList.remove("dark");
  themeIcon.textContent = "🌙";
}

// Toggle theme
function toggleTheme() {
  const isDark = appContainer.classList.toggle("dark");
  themeIcon.textContent = isDark ? "☀️" : "🌙";
}

// Start the game
async function startGame() {
  try {
    resetGameState();

    showLoading("Loading Pokémon...");
    startButton.disabled = true;
    resetButton.disabled = false;
    difficultySelect.disabled = true;

    // Get difficulty settings
    const difficulty = difficultySelect.value;
    const { pairs, rows, columns, time } = gameState.difficulty[difficulty];
    gameState.totalPairs = pairs;
    gameState.timeLeft = time;

    // Update UI
    totalPairs.textContent = gameState.totalPairs;
    timerElement.textContent = formatTime(gameState.timeLeft);

    // Set grid layout dynamically
    gameBoard.style.display = "grid";
    gameBoard.className = `grid gap-4 justify-items-center grid-${difficulty}`;

    // Fetch Pokémon data
    const pokemonData = await fetchRandomPokemon(gameState.totalPairs);

    // Create pairs of cards
    createCards(pokemonData);

    hideLoading();
    startTimer();
    powerupButton.disabled = false;
    gameState.gameStarted = true;
  } catch (error) {
    console.error("Error starting game:", error);
    showMessage(
      "Error",
      "Failed to load Pokémon data. Please try again.",
      "Try Again"
    );
    resetButton.disabled = false;
    startButton.disabled = false;
    difficultySelect.disabled = false;
  }
}

// Reset game state
function resetGameState() {
  gameState.cards = [];
  gameState.flippedCards = [];
  gameState.matchedPairs = 0;
  gameState.clicks = 0;
  gameState.isLocked = false;
  gameState.powerupAvailable = true;

  // Clear game board
  gameBoard.innerHTML = "";

  // Reset UI
  clicksCount.textContent = "0";
  pairsMatched.textContent = "0";

  // Clear timer if it exists
  if (gameState.timer) {
    clearInterval(gameState.timer);
    gameState.timer = null;
  }
}

// Reset the game
function resetGame() {
  resetGameState();

  // Enable start button and difficulty selector
  startButton.disabled = false;
  difficultySelect.disabled = false;
  resetButton.disabled = true;
  powerupButton.disabled = true;
  loadingElement.innerHTML =
    '<p class="text-xl">Select difficulty and press Start to begin...</p>';
  loadingElement.classList.remove("hidden");
  gameBoard.classList.add("hidden");
  timerElement.textContent = "00:00";
  gameState.gameStarted = false;
}

// Fetch random unique Pokémon (first 151)
async function fetchRandomPokemon(count) {
  showLoading("Fetching Pokémon...");
  try {
    const response = await axios.get(
      "https://pokeapi.co/api/v2/pokemon?limit=151"
    );
    const totalPokemon = response.data.count;

    const uniqueIds = new Set();
    while (uniqueIds.size < count) {
      const id = Math.floor(Math.random() * Math.min(totalPokemon, 151)) + 1;
      uniqueIds.add(id);
    }

    const pokemonIds = Array.from(uniqueIds);
    const pokemonPromises = pokemonIds.map((id) =>
      axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`)
    );

    const responses = await Promise.all(pokemonPromises);
    return responses.map((response) => {
      const { id, name, sprites } = response.data;
      const spriteUrl =
        sprites.other?.["official-artwork"]?.front_default ||
        sprites.front_default ||
        "https://via.placeholder.com/100";
      if (!spriteUrl) {
        throw new Error(`No valid sprite for Pokémon ID ${id}`);
      }
      return { id, name, spriteUrl };
    });
  } catch (error) {
    console.error("Error fetching Pokémon:", error);
    throw new Error("Failed to fetch Pokémon data");
  }
}

// Create cards and add them to the game board
function createCards(pokemonData) {
  const pairedPokemon = [...pokemonData, ...pokemonData];
  const shuffledPokemon = shuffleArray(pairedPokemon);
  const fragment = document.createDocumentFragment();

  shuffledPokemon.forEach((pokemon, index) => {
    const card = document.createElement("div");
    card.className = "memory-card";
    card.dataset.id = pokemon.id;
    card.dataset.index = index;

    // Card front (Pokémon image)
    const cardFront = document.createElement("div");
    cardFront.className = "card-front";
    const pokemonImage = document.createElement("img");
    pokemonImage.src = pokemon.spriteUrl;
    pokemonImage.alt = pokemon.name;
    const pokemonName = document.createElement("div");
    pokemonName.className = "pokemon-name";
    pokemonName.textContent = pokemon.name;
    cardFront.appendChild(pokemonImage);
    cardFront.appendChild(pokemonName);

    // Card back (Pokéball or placeholder)
    const cardBack = document.createElement("div");
    cardBack.className = "card-back";

    card.appendChild(cardFront);
    card.appendChild(cardBack);

    card.addEventListener("click", () => handleCardClick(card));
    fragment.appendChild(card);
    gameState.cards.push(card);
  });

  gameBoard.innerHTML = "";
  gameBoard.appendChild(fragment);
  gameBoard.classList.remove("hidden");
}

// Handle card click
function handleCardClick(card) {
  if (
    gameState.isLocked ||
    card.classList.contains("flipped") ||
    card.classList.contains("matched") ||
    !gameState.gameStarted
  ) {
    return;
  }
  gameState.clicks++;
  clicksCount.textContent = gameState.clicks;
  card.classList.add("flipped");
  gameState.flippedCards.push(card);

  if (gameState.flippedCards.length === 2) {
    gameState.isLocked = true;
    setTimeout(checkForMatch, 500);
  }
}

// Check if the two flipped cards match
function checkForMatch() {
  const [card1, card2] = gameState.flippedCards;
  const id1 = card1.dataset.id;
  const id2 = card2.dataset.id;

  if (id1 === id2) {
    // Cards match - keep them flipped and mark as matched
    card1.classList.add("matched", "matched-animation");
    card2.classList.add("matched", "matched-animation");
    card1.classList.remove("flipped"); // Remove flipped class since matched handles the rotation
    card2.classList.remove("flipped");
    gameState.matchedPairs++;
    pairsMatched.textContent = gameState.matchedPairs;
    if (gameState.matchedPairs === gameState.totalPairs) {
      setTimeout(gameWon, 500);
    }
  } else {
    // Cards don't match - shake and flip back
    card1.classList.add("shake");
    card2.classList.add("shake");
    setTimeout(() => {
      card1.classList.remove("flipped", "shake");
      card2.classList.remove("flipped", "shake");
    }, 500);
  }
  gameState.flippedCards = [];
  setTimeout(() => {
    gameState.isLocked = false;
  }, 500);
}

// Handle game won
function gameWon() {
  clearInterval(gameState.timer);
  const timeUsed =
    gameState.difficulty[difficultySelect.value].time - gameState.timeLeft;
  showMessage(
    "Congratulations!",
    `You've matched all ${gameState.totalPairs} pairs in ${
      gameState.clicks
    } clicks and ${formatTime(timeUsed)}!`,
    "Play Again"
  );
  gameState.gameStarted = false;
  resetButton.disabled = false;
  startButton.disabled = false;
  difficultySelect.disabled = false;
  powerupButton.disabled = true;
}

// Handle game over (time's up)
function gameOver() {
  clearInterval(gameState.timer);
  showMessage(
    "Time's Up!",
    `You matched ${gameState.matchedPairs} out of ${gameState.totalPairs} pairs.`,
    "Try Again"
  );
  gameState.gameStarted = false;
  resetButton.disabled = false;
  startButton.disabled = false;
  difficultySelect.disabled = false;
  powerupButton.disabled = true;
}

// Start the timer
function startTimer() {
  if (gameState.timer) clearInterval(gameState.timer);
  timerElement.textContent = formatTime(gameState.timeLeft);
  gameState.timer = setInterval(() => {
    gameState.timeLeft--;
    timerElement.textContent = formatTime(gameState.timeLeft);
    if (gameState.timeLeft <= 0) {
      gameOver();
    }
  }, 1000);
}

// Format time in MM:SS format
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

// Activate power-up (reveal all cards briefly)
function activatePowerup() {
  if (!gameState.powerupAvailable || !gameState.gameStarted) return;
  powerupButton.disabled = true;
  gameState.powerupAvailable = false;
  powerupButton.classList.add("power-up");
  gameState.cards.forEach((card) => {
    if (!card.classList.contains("matched")) {
      card.classList.add("flipped");
    }
  });
  setTimeout(() => {
    gameState.cards.forEach((card) => {
      if (
        !card.classList.contains("matched") &&
        !gameState.flippedCards.includes(card)
      ) {
        card.classList.remove("flipped");
      }
    });
    powerupButton.classList.remove("power-up");
  }, 3000);
}

// Show loading message
function showLoading(message) {
  loadingElement.innerHTML = `
          <div class="loading-spinner mb-4"></div>
          <p class="text-xl">${message}</p>
        `;
  loadingElement.classList.remove("hidden");
  gameBoard.classList.add("hidden");
}

// Hide loading message
function hideLoading() {
  loadingElement.classList.add("hidden");
  gameBoard.classList.remove("hidden");
}

// Show message dialog
function showMessage(title, content, buttonText) {
  messageTitle.textContent = title;
  messageContent.textContent = content;
  messageButton.textContent = buttonText;
  gameMessage.classList.remove("hidden");
}

// Close message dialog
function closeMessage() {
  gameMessage.classList.add("hidden");
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Initialize the game when the DOM is loaded
document.addEventListener("DOMContentLoaded", init);
