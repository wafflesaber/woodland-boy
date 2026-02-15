import woodland from './woodland.js';
import desert from './desert.js';

const biomes = { woodland, desert };

/**
 * Get a biome config by id.
 */
export function getBiome(id) {
  return biomes[id] || woodland;
}

/**
 * Get the next biome after the given one (or null if none).
 */
export function getNextBiome(currentId) {
  const current = getBiome(currentId);
  return current.nextBiome ? getBiome(current.nextBiome) : null;
}

/**
 * Search ALL biomes for an animal config by type name.
 * Used to restore tamed animals that originated in a different biome.
 */
export function findAnimalConfig(type) {
  for (const biome of Object.values(biomes)) {
    if (biome.animals[type]) {
      return biome.animals[type];
    }
  }
  return null;
}
