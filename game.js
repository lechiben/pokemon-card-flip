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
    easy: { pairs: 6, time: 120 },
    medium: { pairs: 8, time: 90 },
    hard: { pairs: 12, time: 60 },
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

// Load theme from localStorage
function loadTheme() {
  const darkMode = localStorage.getItem("darkMode") === "true";
  if (darkMode) {
    appContainer.classList.add("dark");
    themeIcon.textContent = "☀️";
  } else {
    appContainer.classList.remove("dark");
    themeIcon.textContent = "🌙";
  }
}

// Toggle theme
function toggleTheme() {
  const isDark = appContainer.classList.toggle("dark");
  themeIcon.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("darkMode", isDark);
}

// Start the game
async function startGame() {
  try {
    // Reset game state
    resetGameState();

    // Update UI
    showLoading("Loading Pokémon...");
    startButton.disabled = true;
    resetButton.disabled = false;
    difficultySelect.disabled = true;

    // Get difficulty settings
    const difficulty = difficultySelect.value;
    gameState.totalPairs = gameState.difficulty[difficulty].pairs;
    gameState.timeLeft = gameState.difficulty[difficulty].time;

    // Update UI
    totalPairs.textContent = gameState.totalPairs;
    timerElement.textContent = formatTime(gameState.timeLeft);

    // Fetch Pokémon data
    const pokemonData = await fetchRandomPokemon(gameState.totalPairs);

    // Create pairs of cards
    createCards(pokemonData);

    // Hide loading and show game board
    hideLoading();

    // Start timer
    startTimer();

    // Enable powerup button
    powerupButton.disabled = false;

    // Mark game as started
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

  // Show loading message
  loadingElement.textContent = "Select difficulty and press Start to begin...";
  loadingElement.classList.remove("hidden");
  gameBoard.classList.add("hidden");

  // Reset timer display
  timerElement.textContent = "00:00";

  // Mark game as not started
  gameState.gameStarted = false;
}

// Fetch random unique Pokémon
// async function fetchRandomPokemon(count) {
//   // Show loading indicator
//   showLoading("Fetching Pokémon...");

//   try {
//     // First, get the total count of available Pokémon
//     const response = await axios.get(
//       "https://pokeapi.co/api/v2/pokemon?"
//     );
//     const totalPokemon = response.data.count;

//     // Generate unique random IDs
//     const uniqueIds = new Set();
//     while (uniqueIds.size < count) {
//       // Generate IDs between 1 and totalPokemon
//       const id = Math.floor(Math.random() * totalPokemon) + 1;
//       uniqueIds.add(id);
//     }

//     // Convert Set to Array
//     const pokemonIds = Array.from(uniqueIds);

//     // Create an array of promises for fetching Pokémon data
//     const pokemonPromises = pokemonIds.map((id) =>
//       axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`)
//     );

//     // Wait for all promises to resolve
//     const responses = await Promise.all(pokemonPromises);

//     // Extract relevant data from responses
//     return responses.map((response) => {
//       const { id, name, sprites } = response.data;

//       // Get the sprite URL (use official artwork if available, otherwise use default sprite)
//       const spriteUrl =
//         sprites.other?.["official-artwork"]?.front_default ||
//         sprites.front_default;

//       return { id, name, spriteUrl };
//     });
//   } catch (error) {
//     console.error("Error fetching Pokémon:", error);
//     throw new Error("Failed to fetch Pokémon data");
//   }
// }
async function fetchRandomPokemon(count) {
  showLoading("Fetching Pokémon...");
  try {
    const response = await axios.get(
      "https://pokeapi.co/api/v2/pokemon?limit=151"
    );
    const totalPokemon = response.data.count;

    const uniqueIds = new Set();
    while (uniqueIds.size < count) {
      const id = Math.floor(Math.random() * Math.min(totalPokemon, 151)) + 1; // Cap at 1000
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
        "https://via.placeholder.com/100"; // Fallback image
      if (!spriteUrl) {
        throw new Error(`No valid sprite for Pokémon ID ${id}`);
      }
      return { id, name, spriteUrl };
    });
  } catch (error) {
    console.error("Error fetching Pokémon:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: error.config,
    });
    throw new Error("Failed to fetch Pokémon data");
  }
}

// Create cards and add them to the game board
function createCards(pokemonData) {
  // Double the array to create pairs
  const pairedPokemon = [...pokemonData, ...pokemonData];

  // Shuffle the array
  const shuffledPokemon = shuffleArray(pairedPokemon);

  // Create a document fragment to minimize DOM operations
  const fragment = document.createDocumentFragment();

  // Create cards for each Pokémon
  shuffledPokemon.forEach((pokemon, index) => {
    const card = document.createElement("div");
    card.className = "memory-card";
    card.dataset.id = pokemon.id;
    card.dataset.index = index;

    // Create card front (Pokémon image)
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

    // Create card back (Pokéball image)
    const cardBack = document.createElement("div");
    cardBack.className = "card-back";

    // Add front and back to card
    card.appendChild(cardFront);
    card.appendChild(cardBack);

    // Add click event listener
    card.addEventListener("click", () => handleCardClick(card));

    // Add card to fragment
    fragment.appendChild(card);

    // Add card to game state
    gameState.cards.push(card);
  });

  // Add all cards to game board at once
  gameBoard.innerHTML = "";
  gameBoard.appendChild(fragment);
  gameBoard.classList.remove("hidden");
}

// Handle card click
function handleCardClick(card) {
  // Ignore clicks if game is locked, card is already flipped or matched
  if (
    gameState.isLocked ||
    card.classList.contains("flipped") ||
    card.classList.contains("matched") ||
    !gameState.gameStarted
  ) {
    return;
  }

  // Increment click counter
  gameState.clicks++;
  clicksCount.textContent = gameState.clicks;

  // Flip the card
  card.classList.add("flipped");

  // Add card to flipped cards array
  gameState.flippedCards.push(card);

  // Check if we have flipped two cards
  if (gameState.flippedCards.length === 2) {
    // Lock the game temporarily
    gameState.isLocked = true;

    // Check for a match
    setTimeout(checkForMatch, 500);
  }
}

// Check if the two flipped cards match
function checkForMatch() {
  const [card1, card2] = gameState.flippedCards;

  // Get Pokémon IDs from the cards
  const id1 = card1.dataset.id;
  const id2 = card2.dataset.id;

  // Check if IDs match
  if (id1 === id2) {
    // Cards match
    card1.classList.add("matched", "matched-animation");
    card2.classList.add("matched", "matched-animation");

    // Increment matched pairs counter
    gameState.matchedPairs++;
    pairsMatched.textContent = gameState.matchedPairs;

    // Check if game is won
    if (gameState.matchedPairs === gameState.totalPairs) {
      gameWon();
    }
  } else {
    // Cards don't match, flip them back
    card1.classList.add("shake");
    card2.classList.add("shake");

    setTimeout(() => {
      card1.classList.remove("flipped", "shake");
      card2.classList.remove("flipped", "shake");
    }, 500);
  }

  // Clear flipped cards array
  gameState.flippedCards = [];

  // Unlock the game
  setTimeout(() => {
    gameState.isLocked = false;
  }, 500);
}

// Handle game won
function gameWon() {
  // Stop the timer
  clearInterval(gameState.timer);

  // Show win message
  const timeUsed =
    gameState.difficulty[difficultySelect.value].time - gameState.timeLeft;
  showMessage(
    "Congratulations!",
    `You've matched all ${gameState.totalPairs} pairs in ${
      gameState.clicks
    } clicks and ${formatTime(timeUsed)}!`,
    "Play Again"
  );

  // Reset game state for next game
  gameState.gameStarted = false;
  resetButton.disabled = false;
  startButton.disabled = false;
  difficultySelect.disabled = false;
  powerupButton.disabled = true;
}

// Handle game over (time's up)
function gameOver() {
  // Stop the timer
  clearInterval(gameState.timer);

  // Show game over message
  showMessage(
    "Time's Up!",
    `You matched ${gameState.matchedPairs} out of ${gameState.totalPairs} pairs.`,
    "Try Again"
  );

  // Reset game state for next game
  gameState.gameStarted = false;
  resetButton.disabled = false;
  startButton.disabled = false;
  difficultySelect.disabled = false;
  powerupButton.disabled = true;
}

// Start the timer
function startTimer() {
  // Clear any existing timer
  if (gameState.timer) {
    clearInterval(gameState.timer);
  }

  // Update timer display
  timerElement.textContent = formatTime(gameState.timeLeft);

  // Start the timer
  gameState.timer = setInterval(() => {
    // Decrement time left
    gameState.timeLeft--;

    // Update timer display
    timerElement.textContent = formatTime(gameState.timeLeft);

    // Check if time's up
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
  if (!gameState.powerupAvailable || !gameState.gameStarted) {
    return;
  }

  // Disable powerup button
  powerupButton.disabled = true;
  gameState.powerupAvailable = false;

  // Add power-up effect to button
  powerupButton.classList.add("power-up");

  // Flip all cards that aren't already matched
  gameState.cards.forEach((card) => {
    if (!card.classList.contains("matched")) {
      card.classList.add("flipped");
    }
  });

  // Show cards for 3 seconds
  setTimeout(() => {
    // Flip back all cards that aren't matched or in the flippedCards array
    gameState.cards.forEach((card) => {
      if (
        !card.classList.contains("matched") &&
        !gameState.flippedCards.includes(card)
      ) {
        card.classList.remove("flipped");
      }
    });

    // Remove power-up effect
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
