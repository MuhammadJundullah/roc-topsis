// lib/topsis.ts
import { CriteriaType, TOPSISInputData, RankingResult } from "@/types";

/**
 * Menormalisasi matriks keputusan.
 * @param {number[][]} matrix - Matriks nilai alternatif x kriteria.
 * @returns {number[][]} Matriks ternormalisasi.
 */
function normalizeMatrix(matrix: number[][]): number[][] {
  console.log("--- Inside normalizeMatrix ---");
  console.log("  Input 'matrix' (raw values):", matrix);

  const numAlternatives = matrix.length;
  if (numAlternatives === 0) {
    console.warn(
      "Input 'matrix' to normalizeMatrix is empty! Returning empty array."
    );
    return [];
  }

  const numCriteria = matrix[0]?.length; // Use optional chaining to prevent error if matrix[0] is undefined
  if (numCriteria === undefined || numCriteria === 0) {
    console.warn(
      "Input 'matrix' has 0 columns or malformed first row! Returning an array of empty arrays."
    );
    return Array(numAlternatives)
      .fill(0)
      .map(() => []);
  }

  const normalizedMatrix: number[][] = Array(numAlternatives)
    .fill(0)
    .map(() => Array(numCriteria).fill(0));

  for (let j = 0; j < numCriteria; j++) {
    let sumOfSquares = 0;
    for (let i = 0; i < numAlternatives; i++) {
      if (typeof matrix[i][j] !== "number" || isNaN(matrix[i][j])) {
        console.error(
          `Invalid non-numeric value at matrix[${i}][${j}]:`,
          matrix[i][j]
        );
        throw new Error(
          `Data contains non-numeric values at row ${i + 1}, column ${
            j + 1
          }. Please check your input file.`
        );
      }
      sumOfSquares += Math.pow(matrix[i][j], 2);
    }
    const divisor = Math.sqrt(sumOfSquares);

    if (divisor === 0) {
      console.warn(
        `Column ${j} (criteria) has a sum of squares of 0. Normalized values will be 0.`
      );
      for (let i = 0; i < numAlternatives; i++) {
        normalizedMatrix[i][j] = 0;
      }
    } else {
      for (let i = 0; i < numAlternatives; i++) {
        normalizedMatrix[i][j] = matrix[i][j] / divisor;
      }
    }
  }
  console.log("  Output 'normalizedMatrix':", normalizedMatrix);
  return normalizedMatrix;
}

/**
 * Memboboti matriks ternormalisasi.
 * @param {number[][]} normalizedMatrix - Matriks ternormalisasi.
 * @param {number[]} weights - Array bobot kriteria.
 * @returns {number[][]} Matriks ternormalisasi terbobot.
 */
function weightNormalizedMatrix(
  normalizedMatrix: number[][],
  weights: number[]
): number[][] {
  console.log("--- Inside weightNormalizedMatrix ---");
  console.log("  Input normalizedMatrix:", normalizedMatrix);
  console.log("  Input weights:", weights);

  const numAlternatives = normalizedMatrix.length;
  if (numAlternatives === 0) {
    console.warn("Input 'normalizedMatrix' is empty. Returning empty array.");
    return [];
  }

  const numCriteria = normalizedMatrix[0]?.length; // Use optional chaining
  if (numCriteria === undefined || numCriteria === 0) {
    console.warn(
      "Input 'normalizedMatrix' has 0 columns or malformed first row. Returning array of empty arrays."
    );
    return Array(numAlternatives)
      .fill(0)
      .map(() => []);
  }

  const weightedMatrix: number[][] = Array(numAlternatives)
    .fill(0)
    .map(() => Array(numCriteria).fill(0));

  for (let i = 0; i < numAlternatives; i++) {
    for (let j = 0; j < numCriteria; j++) {
      // PERBAIKAN: Pastikan akses weights[j] itu valid
      if (weights[j] === undefined || isNaN(weights[j])) {
        console.error(`Invalid weight at index ${j}:`, weights[j]);
        throw new Error(
          `Invalid weight for criterion ${
            j + 1
          }. Check ROC calculation or priority order.`
        );
      }
      weightedMatrix[i][j] = normalizedMatrix[i][j] * weights[j];
    }
  }
  console.log("  Output weightedMatrix:", weightedMatrix);
  return weightedMatrix;
}

/**
 * Menentukan solusi ideal positif (A+) dan negatif (A-).
 * @param {number[][]} weightedMatrix - Matriks ternormalisasi terbobot.
 * @param {string[]} criteriaTypes - Array tipe kriteria ('benefit' atau 'cost').
 * @returns {{idealPositive: number[], idealNegative: number[]}} Objek berisi A+ dan A-.
 */
function calculateIdealSolutions(
  weightedMatrix: number[][],
  criteriaTypes: CriteriaType[]
): { idealPositive: number[]; idealNegative: number[] } {
  console.log("--- Inside calculateIdealSolutions ---");
  console.log("  Input weightedMatrix:", weightedMatrix);
  console.log("  Input criteriaTypes:", criteriaTypes);

  const numCriteria = weightedMatrix[0]?.length; // Use optional chaining
  if (numCriteria === undefined || numCriteria === 0) {
    console.error(
      "weightedMatrix has no columns or malformed first row. Cannot calculate ideal solutions."
    );
    // Mengembalikan array kosong jika tidak ada kriteria
    return { idealPositive: [], idealNegative: [] };
  }

  if (criteriaTypes.length !== numCriteria) {
    console.error(
      `Mismatch between number of criteria (${numCriteria}) and criteriaTypes length (${criteriaTypes.length}).`
    );
    throw new Error(
      "Mismatch in criteria types configuration. Ensure all criteria have a type (benefit/cost)."
    );
  }

  const idealPositive: number[] = Array(numCriteria).fill(0);
  const idealNegative: number[] = Array(numCriteria).fill(0);

  for (let j = 0; j < numCriteria; j++) {
    const columnValues = weightedMatrix.map((row) => row[j]);
    if (criteriaTypes[j] === "benefit") {
      idealPositive[j] = Math.max(...columnValues);
      idealNegative[j] = Math.min(...columnValues);
    } else if (criteriaTypes[j] === "cost") {
      // Tambahkan else if untuk kejelasan
      idealPositive[j] = Math.min(...columnValues);
      idealNegative[j] = Math.max(...columnValues);
    } else {
      // Ini seharusnya tidak terjadi jika validasi di client/API sudah bagus
      console.error(`Invalid criteria type for column ${j}:`, criteriaTypes[j]);
      throw new Error(`Invalid criteria type found for criterion ${j + 1}.`);
    }
  }
  console.log("  Output idealPositive:", idealPositive);
  console.log("  Output idealNegative:", idealNegative);
  return { idealPositive, idealNegative };
}

/**
 * Menghitung jarak Euclidean ke solusi ideal.
 * @param {number[][]} weightedMatrix - Matriks ternormalisasi terbobot.
 * @param {number[]} idealPositive - Solusi ideal positif (A+).
 * @param {number[]} idealNegative - Solusi ideal negatif (A-).
 * @returns {{distancesPositive: number[], distancesNegative: number[]}} Jarak ke A+ dan A-.
 */
function calculateDistances(
  weightedMatrix: number[][],
  idealPositive: number[],
  idealNegative: number[]
): { distancesPositive: number[]; distancesNegative: number[] } {
  console.log("--- Inside calculateDistances ---");
  console.log("  Input weightedMatrix:", weightedMatrix);
  console.log("  Input idealPositive:", idealPositive);
  console.log("  Input idealNegative:", idealNegative);

  const numAlternatives = weightedMatrix.length;
  const numCriteria = weightedMatrix[0]?.length; // Use optional chaining

  if (numAlternatives === 0 || numCriteria === undefined || numCriteria === 0) {
    console.warn(
      "weightedMatrix is empty or malformed. Cannot calculate distances."
    );
    return { distancesPositive: [], distancesNegative: [] };
  }

  const distancesPositive: number[] = Array(numAlternatives).fill(0);
  const distancesNegative: number[] = Array(numAlternatives).fill(0);

  for (let i = 0; i < numAlternatives; i++) {
    let sumSqPositive = 0;
    let sumSqNegative = 0;
    for (let j = 0; j < numCriteria; j++) {
      // PERBAIKAN: Pastikan akses idealPositive[j] dan idealNegative[j] valid
      if (
        idealPositive[j] === undefined ||
        isNaN(idealPositive[j]) ||
        idealNegative[j] === undefined ||
        isNaN(idealNegative[j])
      ) {
        console.error(
          `Invalid ideal solution value for criterion ${j}: IdealPositive[${j}]=${idealPositive[j]}, IdealNegative[${j}]=${idealNegative[j]}`
        );
        throw new Error(
          "Invalid ideal solution values. Check previous calculation steps."
        );
      }
      sumSqPositive += Math.pow(weightedMatrix[i][j] - idealPositive[j], 2);
      sumSqNegative += Math.pow(weightedMatrix[i][j] - idealNegative[j], 2);
    }
    distancesPositive[i] = Math.sqrt(sumSqPositive);
    distancesNegative[i] = Math.sqrt(sumSqNegative);
  }
  console.log("  Output distancesPositive:", distancesPositive);
  console.log("  Output distancesNegative:", distancesNegative);
  return { distancesPositive, distancesNegative };
}

/**
 * Menghitung nilai preferensi relatif (C*) dan melakukan perankingan.
 * @param {number[]} distancesPositive - Jarak ke solusi ideal positif.
 * @param {number[]} distancesNegative - Jarak ke solusi ideal negatif.
 * @returns {number[]} Array nilai preferensi relatif.
 */
function calculatePreference(
  distancesPositive: number[],
  distancesNegative: number[]
): number[] {
  console.log("--- Inside calculatePreference ---");
  console.log("  Input distancesPositive:", distancesPositive);
  console.log("  Input distancesNegative:", distancesNegative);

  const numAlternatives = distancesPositive.length;
  const preferences: number[] = Array(numAlternatives).fill(0);

  for (let i = 0; i < numAlternatives; i++) {
    const sumDistances = distancesPositive[i] + distancesNegative[i];
    if (sumDistances === 0) {
      preferences[i] = 0; // Alternatif sangat dekat dengan kedua ideal, atau tidak ada jarak sama sekali.
      console.warn(
        `Sum of distances for alternative ${i} is 0. Preference set to 0.`
      );
    } else {
      preferences[i] = distancesNegative[i] / sumDistances;
    }
  }
  console.log("  Output preferences:", preferences);
  return preferences;
}

/**
 * Fungsi utama untuk menjalankan perhitungan TOPSIS.
 * @param {Object} data - Objek data keputusan.
 * @param {string[]} data.alternatives - Array nama alternatif.
 * @param {string[]} data.criteria - Array nama kriteria.
 * @param {number[][]} data.values - Matriks nilai alternatif x kriteria.
 * @param {CriteriaType[]} data.criteriaTypes - Array tipe kriteria ('benefit' atau 'cost').
 * @param {Object.<string, number>} data.weights - Objek bobot kriteria (dari ROC).
 * @returns {Array<{alternative: string, preference: number, rank: number}>} Hasil ranking.
 */
export function runTOPSIS(data: TOPSISInputData): RankingResult[] {
  console.log("--- Inside runTOPSIS ---");
  console.log("  Input data:", data);

  const { alternatives, criteria, values, criteriaTypes, weights } = data;

  // Initial validation: Ensure core data is present
  if (!alternatives || alternatives.length === 0)
    throw new Error("No alternatives provided.");
  if (!criteria || criteria.length === 0)
    throw new Error("No criteria provided.");
  if (!values || values.length === 0 || values[0].length === 0)
    throw new Error("Input decision matrix is empty or invalid.");
  if (!criteriaTypes || criteriaTypes.length !== criteria.length)
    throw new Error(
      "Criteria types are missing or do not match criteria count."
    );
  if (!weights || Object.keys(weights).length === 0)
    throw new Error("Weights are missing or empty.");

  // Map string criteria names to array of weights in the correct order
  // PERBAIKAN: Pastikan semua kriteria memiliki bobot dari ROC
  const orderedWeights: number[] = criteria.map((crit) => {
    const weight = weights[crit];
    if (weight === undefined || isNaN(weight)) {
      console.error(
        `Weight for criterion '${crit}' is missing or invalid:`,
        weight
      );
      throw new Error(
        `Weight for criterion '${crit}' is missing or invalid. Check ROC calculation and priority order.`
      );
    }
    return weight;
  });
  console.log("  Ordered Weights:", orderedWeights);

  // 1. Normalisasi Matriks
  const normalizedMatrix = normalizeMatrix(values);

  // Validasi normalizedMatrix sebelum diteruskan
  if (
    !normalizedMatrix ||
    normalizedMatrix.length === 0 ||
    normalizedMatrix[0].length === 0
  ) {
    console.error(
      "Normalized matrix is empty or malformed after normalization:",
      normalizedMatrix
    );
    throw new Error(
      "Normalization failed: resulting matrix is empty or invalid."
    );
  }

  // 2. Bobot Matriks Ternormalisasi
  const weightedMatrix = weightNormalizedMatrix(
    normalizedMatrix,
    orderedWeights
  );

  // Validasi weightedMatrix sebelum diteruskan
  if (
    !weightedMatrix ||
    weightedMatrix.length === 0 ||
    weightedMatrix[0].length === 0
  ) {
    console.error(
      "Weighted matrix is empty or malformed after weighting:",
      weightedMatrix
    );
    throw new Error("Weighting failed: resulting matrix is empty or invalid.");
  }

  // 3. Tentukan Solusi Ideal Positif dan Negatif
  const { idealPositive, idealNegative } = calculateIdealSolutions(
    weightedMatrix,
    criteriaTypes
  );

  // Validasi idealPositive/Negative
  if (
    !idealPositive ||
    idealPositive.length === 0 ||
    !idealNegative ||
    idealNegative.length === 0
  ) {
    console.error("Ideal solutions are empty or malformed:", {
      idealPositive,
      idealNegative,
    });
    throw new Error("Calculation of ideal solutions failed.");
  }

  // 4. Hitung Jarak ke Solusi Ideal
  const { distancesPositive, distancesNegative } = calculateDistances(
    weightedMatrix,
    idealPositive,
    idealNegative
  );

  // Validasi distances
  if (
    !distancesPositive ||
    distancesPositive.length === 0 ||
    !distancesNegative ||
    distancesNegative.length === 0
  ) {
    console.error("Distances are empty or malformed:", {
      distancesPositive,
      distancesNegative,
    });
    throw new Error("Calculation of distances failed.");
  }

  // 5. Hitung Nilai Preferensi dan Ranking
  const preferences = calculatePreference(distancesPositive, distancesNegative);

  // Validasi preferences
  if (!preferences || preferences.length === 0) {
    console.error("Preferences are empty or malformed:", preferences);
    throw new Error("Calculation of preferences failed.");
  }

  // Gabungkan dengan nama alternatif dan urutkan
  const results: RankingResult[] = alternatives.map((alt, index) => ({
    alternative: alt,
    preference: preferences[index],
    rank: 0 // Rank akan diisi setelah sorting
  }));

  // Urutkan dari nilai preferensi tertinggi
  results.sort((a, b) => b.preference - a.preference);

  // Tambahkan rank
  results.forEach((item, index) => {
    item.rank = index + 1;
  });

  console.log("  Final Ranking Results:", results);
  return results;
}
