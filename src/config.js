export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 2400;
export const TILE_SIZE = 64;
export const PIXEL_SCALE = 4;
export const PLAYER_SPEED = 150;

export const ANIMALS = {
  bear:     { type: 'bear',     texture: 'animal-bear',     favoriteFood: 'fish',      tameable: true,  shy: false, speed: 35,  fleeSpeed: 50,  requiredFeedings: 2, count: 2 },
  wolf:     { type: 'wolf',     texture: 'animal-wolf',     favoriteFood: 'fish',      tameable: true,  shy: true,  speed: 40,  fleeSpeed: 65,  requiredFeedings: 2, count: 2 },
  badger:   { type: 'badger',   texture: 'animal-badger',   favoriteFood: 'mushrooms', tameable: true,  shy: true,  speed: 35,  fleeSpeed: 55,  requiredFeedings: 2, count: 2 },
  capybara: { type: 'capybara', texture: 'animal-capybara', favoriteFood: 'berries',   tameable: true,  shy: false, speed: 25,  fleeSpeed: 40,  requiredFeedings: 2, count: 2 },
  deer:     { type: 'deer',     texture: 'animal-deer',     favoriteFood: 'berries',   tameable: true,  shy: true,  speed: 45,  fleeSpeed: 70,  requiredFeedings: 2, count: 4 },
  rabbit:   { type: 'rabbit',   texture: 'animal-rabbit',   favoriteFood: 'mushrooms', tameable: true,  shy: true,  speed: 50,  fleeSpeed: 80,  requiredFeedings: 2, count: 6 },
  fox:      { type: 'fox',      texture: 'animal-fox',      favoriteFood: 'fish',      tameable: true,  shy: true,  speed: 40,  fleeSpeed: 65,  requiredFeedings: 2, count: 3 },
  bird:     { type: 'bird',     texture: 'animal-bird',     favoriteFood: 'acorns',    tameable: true,  shy: true,  speed: 50,  fleeSpeed: 80,  requiredFeedings: 2, count: 5 },
};

export const BUILDING_STAGES = [
  { name: 'Floor',  cost: { planks: 3 } },
  { name: 'Walls',  cost: { planks: 3, stones: 3 } },
  { name: 'Roof',   cost: { straw: 3 } },
  { name: 'Door',   cost: { planks: 2 } },
  { name: 'Window', cost: { stones: 2 } },
];

export const ITEM_SPAWN_COUNTS = {
  berries: 10,
  mushrooms: 8,
  acorns: 8,
  fish: 8,
  planks: 16,
  stones: 14,
  straw: 12,
};

export const INVENTORY_SIZE = 6;
export const INTERACTION_RANGE = 100;
export const FLEE_TRIGGER_RANGE = 80;
export const FLEE_STOP_RANGE = 200;
export const WANDER_RANGE = 130;
export const WANDER_HOME_RANGE = 300;
export const ITEM_RESPAWN_TIME = 40000; // 40 seconds
