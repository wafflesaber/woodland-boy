// Desert biome configuration
export default {
  id: 'desert',
  name: 'Desert',
  nextBiome: null, // end of the line (for now)
  backgroundColor: '#F0E68C',

  terrain: {
    base: 'desert-sand',          // desert-sand-0..2
    baseVariants: 3,
    water: 'water',               // reuse water textures
    waterVariants: 3,
    waterType: 'oasis',           // small ponds instead of river
    clearingTile: 'desert-packed', // packed sand clearing
    bankTile: 'desert-oasis-bank', // green oasis bank
  },

  decorations: {
    trees: { count: 35, minDist: 100, trunk: 'palm-trunk', canopies: ['palm-canopy-1', 'palm-canopy-2'] },
    bushes: { count: 35, berryChance: 0.25, plain: 'cactus', berry: 'cactus-fruit' },
    rocks: { count: 30, texture: 'sandstone-rock' },
    flowers: { count: 40, variants: ['desert-flower-orange', 'desert-flower-pink', 'tumbleweed'] },
  },

  animals: {
    camel:      { type: 'camel',      texture: 'animal-camel',      favoriteFood: 'dates',        tameable: true, shy: false, speed: 30, fleeSpeed: 45, requiredFeedings: 2, count: 5 },
    crocodile:  { type: 'crocodile',  texture: 'animal-crocodile',  favoriteFood: 'desert-fish',  tameable: true, shy: false, speed: 25, fleeSpeed: 40, requiredFeedings: 2, count: 2 },
    snake:      { type: 'snake',      texture: 'animal-snake',      favoriteFood: 'beetles',      tameable: true, shy: true,  speed: 45, fleeSpeed: 70, requiredFeedings: 2, count: 3 },
    scorpion:   { type: 'scorpion',   texture: 'animal-scorpion',   favoriteFood: 'beetles',      tameable: true, shy: true,  speed: 35, fleeSpeed: 55, requiredFeedings: 2, count: 3 },
    lizard:     { type: 'lizard',     texture: 'animal-lizard',     favoriteFood: 'beetles',      tameable: true, shy: true,  speed: 50, fleeSpeed: 75, requiredFeedings: 2, count: 4 },
    vulture:    { type: 'vulture',    texture: 'animal-vulture',    favoriteFood: 'desert-fish',  tameable: true, shy: true,  speed: 40, fleeSpeed: 65, requiredFeedings: 2, count: 3 },
    fennec:     { type: 'fennec',     texture: 'animal-fennec',     favoriteFood: 'dates',        tameable: true, shy: true,  speed: 50, fleeSpeed: 80, requiredFeedings: 2, count: 4 },
    roadrunner: { type: 'roadrunner', texture: 'animal-roadrunner', favoriteFood: 'cactus-fruit', tameable: true, shy: true,  speed: 55, fleeSpeed: 85, requiredFeedings: 2, count: 5 },
  },

  itemSpawnCounts: {
    dates: 16,
    beetles: 16,
    'cactus-fruit': 14,
    'desert-fish': 14,
    urns: 16,
    mummies: 14,
    scepters: 12,
  },

  portalStages: [
    { name: 'Magic Circle',     cost: { urns: 3 } },
    { name: 'Base & Arch',      cost: { urns: 3, mummies: 3 } },
    { name: 'Runes & Activate', cost: { scepters: 3 } },
  ],
};
