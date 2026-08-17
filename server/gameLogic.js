// Generate the full deck of cards (128 cards total)
function generateDeck() {
  const deck = [];

  // 112 vegetable cards (28 of each type)
  const vegetables = ['tomato', 'pepper', 'cauliflower', 'salad'];

  vegetables.forEach(vegetable => {
    for (let i = 0; i < 28; i++) {
      deck.push({
        id: `${vegetable}-${i}`,
        type: 'vegetable',
        vegetable: vegetable
      });
    }
  });

  // 16 taboo cockroach cards (4 of each vegetable variant)
  vegetables.forEach(vegetable => {
    for (let i = 0; i < 4; i++) {
      deck.push({
        id: `taboo-${vegetable}-${i}`,
        type: 'taboo',
        vegetable: vegetable
      });
    }
  });

  return deck;
}

// Fisher-Yates shuffle algorithm
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

module.exports = {
  generateDeck,
  shuffleDeck
};
