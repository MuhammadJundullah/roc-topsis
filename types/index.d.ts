// types/index.d.ts

export type CriteriaType = "benefit" | "cost";

export interface Criterion {
  name: string;
  type: CriteriaType;
}

export interface Alternative {
  name: string;
  values: number[]; // Nilai kriteria sesuai urutan kriteria
}

export interface TOPSISInputData {
  alternatives: string[]; // Nama alternatif
  criteria: string[]; // Nama kriteria
  values: number[][]; // Matriks nilai [alternatif][kriteria]
  criteriaTypes: CriteriaType[]; // Tipe kriteria ('benefit' atau 'cost')
  weights: { [key: string]: number }; // Bobot kriteria dari ROC
}

export interface RankingResult {
  alternative: string;
  preference: number;
  rank: number;
}

export type CriteriaType = "benefit" | "cost";

export interface Criterion {
  name: string;
  type: CriteriaType;
}

export interface Alternative {
  name: string;
  values: number[]; // Nilai kriteria sesuai urutan kriteria
}

export interface TOPSISInputData {
  alternatives: string[]; // Nama alternatif
  criteria: string[]; // Nama kriteria
  values: number[][]; // Matriks nilai [alternatif][kriteria]
  criteriaTypes: CriteriaType[]; // Tipe kriteria ('benefit' atau 'cost')
  weights: { [key: string]: number }; // Bobot kriteria dari ROC
}

export interface RankingResult {
  alternative: string;
  preference: number;
  rank: number;
}

// Tipe baru untuk pemetaan kualitatif
export interface QualitativeMapping {
  [criteriaName: string]: {
    uniqueValues: string[]; // Daftar nilai teks unik di kriteria ini
    mapping: { [qualitativeValue: string]: number | "" }; // Pemetaan: "Baik": 4, "Kurang": 2
  };
}

export type CriteriaType = "benefit" | "cost";

export interface Criterion {
  name: string;
  type: CriteriaType;
}

export interface Alternative {
  name: string;
  values: number[]; // Nilai kriteria sesuai urutan kriteria
}

export interface TOPSISInputData {
  alternatives: string[]; // Nama alternatif
  criteria: string[]; // Nama kriteria
  values: number[][]; // Matriks nilai [alternatif][kriteria]
  criteriaTypes: CriteriaType[]; // Tipe kriteria ('benefit' atau 'cost')
  weights: { [key: string]: number }; // Bobot kriteria dari ROC
}

export interface RankingResult {
  alternative: string;
  preference: number;
  rank: number;
}

export interface QualitativeMapping {
  [criteriaName: string]: {
    uniqueValues: string[];
    mapping: { [qualitativeValue: string]: number | "" };
  };
}

// Tipe baru untuk data mentah yang di-parse dari CSV
export interface RawDataRow {
  [key: string]: string; // Kunci adalah nama kolom (header), nilai adalah string dari sel
}