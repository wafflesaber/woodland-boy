export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 2400;
export const TILE_SIZE = 64;
export const PIXEL_SCALE = 4;
export const PLAYER_SPEED = 150;

export const ANIMALS = {
  bear:     { type: 'bear',     texture: 'animal-bear',     favoriteFood: 'fish',      tameable: true,  shy: false, speed: 40,  fleeSpeed: 60,  requiredFeedings: 3, count: 2 },
  wolf:     { type: 'wolf',     texture: 'animal-wolf',     favoriteFood: 'fish',      tameable: true,  shy: true,  speed: 60,  fleeSpeed: 100, requiredFeedings: 4, count: 2 },
  badger:   { type: 'badger',   texture: 'animal-badger',   favoriteFood: 'mushrooms', tameable: true,  shy: true,  speed: 50,  fleeSpeed: 80,  requiredFeedings: 3, count: 2 },
  capybara: { type: 'capybara', texture: 'animal-capybara', favoriteFood: 'berries',   tameable: true,  shy: false, speed: 30,  fleeSpeed: 50,  requiredFeedings: 3, count: 2 },
  deer:     { type: 'deer',     texture: 'animal-deer',     tameable: false, shy: true,  speed: 70,  fleeSpeed: 120, count: 4 },
  rabbit:   { type: 'rabbit',   texture: 'animal-rabbit',   tameable: false, shy: true,  speed: 80,  fleeSpeed: 140, count: 6 },
  fox:      { type: 'fox',      texture: 'animal-fox',      tameable: false, shy: true,  speed: 65,  fleeSpeed: 110, count: 3 },
  bird:     { type: 'bird',     texture: 'animal-bird',     tameable: false, shy: true,  speed: 90,  fleeSpeed: 150, count: 5 },
};

export const BUILDING_STAGES = [
  { name: 'Floor',  cost: { planks: 3 } },
  { name: 'Walls',  cost: { planks: 4, stones: 3 } },
  { name: 'Roof',   cost: { straw: 3 } },
  { name: 'Door',   cost: { planks: 2 } },
  { name: 'Window', cost: { stones: 2 } },
];

export const ITEM_SPAWN_COUNTS = {
  berries: 8,
  mushrooms: 6,
  acorns: 6,
  fish: 6,
  planks: 8,
  stones: 6,
  straw: 6,
};

export const INVENTORY_SIZE = 6;
export const INTERACTION_RANGE = 100;
export const FLEE_TRIGGER_RANGE = 120;
export const FLEE_STOP_RANGE = 250;
export const WANDER_RANGE = 130;
export const WANDER_HOME_RANGE = 300;
export const ITEM_RESPAWN_TIME = 40000; // 40 seconds
