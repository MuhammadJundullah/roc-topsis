// lib/roc.ts

/**
 * Menghitung bobot kriteria menggunakan metode Rank Order Centroid (ROC).
 * @param {string[]} prioritizedCriteria - Array string kriteria yang sudah diurutkan dari paling penting ke paling tidak penting.
 * @returns {Object.<string, number>} Objek yang berisi bobot setiap kriteria.
 */

export function calculateROCBobots(prioritizedCriteria: string[]): {
  [key: string]: number;
} {
  const n = prioritizedCriteria.length;
  const weights: { [key: string]: number } = {};

  if (n === 0) {
    console.warn("No prioritized criteria provided for ROC calculation.");
    return {};
  }

  prioritizedCriteria.forEach((criteria, index) => {
    // Rank dimulai dari 1
    const j = index + 1;
    let sumTerm = 0;
    for (let i = j; i <= n; i++) {
      sumTerm += 1 / i;
    }
    weights[criteria] = (1 / n) * sumTerm;
  });

  // Normalisasi bobot (pastikan totalnya 1, meskipun ROC cenderung sudah ternormalisasi)
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) {
    // Avoid division by zero if all weights somehow sum to 0
    console.warn("Total ROC weights sum to 0. Returning unnormalized weights.");
    return weights;
  }
  for (const criteria in weights) {
    weights[criteria] /= totalWeight;
  }

  return weights;
}
