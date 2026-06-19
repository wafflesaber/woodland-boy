// Woodland biome configuration — extracted from original hardcoded values
export default {
  id: 'woodland',
  name: 'Woodland',
  nextBiome: 'desert',
  backgroundColor: '#87CEEB',

  terrain: {
    base: 'terrain-grass',     // terrain-grass-0..2
    baseVariants: 3,
    water: 'water',            // terrain-water-0..2
    waterVariants: 3,
    waterType: 'oasis',        // 'river' or 'oasis' (ponds, stamped as blobs)
    clearingTile: 'terrain-dirt',
    bankTile: 'terrain-sand',
  },

  decorations: {
    trees: { count: 80, minDist: 100, wholeTrees: ['woods-tree-broadleaf-a', 'woods-tree-broadleaf-b', 'woods-tree-medium', 'woods-tree-pine-tall', 'woods-tree-pine-small', 'woods-tree-old'] },
    bushes: { count: 40, berryChance: 0.3, plain: 'woods-bush-1', berry: 'woods-bush-2' },
    rocks: { count: 20, texture: 'woods-rock-cluster' },
    flowers: { count: 60, variants: ['woods-flower-pink', 'woods-flower-yellow', 'woods-flower-blue', 'woods-flower-white', 'woods-flower-red', 'woods-mushroom-red', 'woods-grass-tuft-1', 'woods-grass-tuft-2'] },
  },

  animals: {
    bear:     { type: 'bear',     texture: 'animal-bear',     favoriteFood: 'fish',      tameable: true, shy: false, speed: 35, fleeSpeed: 50, requiredFeedings: 2, count: 2 },
    wolf:     { type: 'wolf',     texture: 'animal-wolf',     favoriteFood: 'fish',      tameable: true, shy: true,  speed: 40, fleeSpeed: 65, requiredFeedings: 2, count: 2 },
    badger:   { type: 'badger',   texture: 'animal-badger',   favoriteFood: 'mushrooms', tameable: true, shy: true,  speed: 35, fleeSpeed: 55, requiredFeedings: 2, count: 2 },
    capybara: { type: 'capybara', texture: 'animal-capybara', favoriteFood: 'berries',   tameable: true, shy: false, speed: 25, fleeSpeed: 40, requiredFeedings: 2, count: 2 },
    deer:     { type: 'deer',     texture: 'animal-deer',     favoriteFood: 'berries',   tameable: true, shy: true,  speed: 45, fleeSpeed: 70, requiredFeedings: 2, count: 4 },
    rabbit:   { type: 'rabbit',   texture: 'animal-rabbit',   favoriteFood: 'mushrooms', tameable: true, shy: true,  speed: 50, fleeSpeed: 80, requiredFeedings: 2, count: 6 },
    fox:      { type: 'fox',      texture: 'animal-fox',      favoriteFood: 'fish',      tameable: true, shy: true,  speed: 40, fleeSpeed: 65, requiredFeedings: 2, count: 3 },
    bird:     { type: 'bird',     texture: 'animal-bird',     favoriteFood: 'acorns',    tameable: true, shy: true,  speed: 50, fleeSpeed: 80, requiredFeedings: 2, count: 5 },
  },

  itemSpawnCounts: {
    berries: 10,
    mushrooms: 8,
    acorns: 8,
    fish: 8,
    planks: 16,
    stones: 14,
    straw: 12,
  },

  portalStages: [
    { name: 'Magic Circle',     cost: { planks: 3 } },
    { name: 'Base & Arch',      cost: { planks: 3, stones: 3 } },
    { name: 'Runes & Activate', cost: { straw: 3 } },
  ],
};
