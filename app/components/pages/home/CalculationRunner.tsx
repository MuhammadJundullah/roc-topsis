// @/components/pages/home/CalculationRunner.tsx
"use client";

import React from "react";
import { useProjectState } from "@/app/hooks/useProjectState";

interface Props {
  state: ReturnType<typeof useProjectState>["state"];
  setState: ReturnType<typeof useProjectState>["setState"];
  handleCalculate: () => void;
  handleSaveProject: () => void;
}

export const CalculationRunner: React.FC<Props> = ({ state, setState, handleCalculate, handleSaveProject }) => {
  const { matrixValues, needsQualitativeMapping, inputMode, projectId } = state;

  if (matrixValues.length === 0 || needsQualitativeMapping) {
    return null;
  }

  return (
    <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md text-center">
      <h2 className="text-2xl font-semibold mb-4">
        {inputMode === "csv" ? "6." : "5."} Simpan & Hitung Ranking
      </h2>
      <div className="flex justify-center gap-4">
        <button
          onClick={handleSaveProject}
          className="px-6 py-3 text-lg font-semibold rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition duration-200"
        >
          {projectId ? "Simpan Proyek" : "Simpan Proyek"}
        </button>
        <button
          onClick={handleCalculate}
          className="px-6 py-3 text-lg font-semibold rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200"
        >
          Mulai Perhitungan ROC & TOPSIS
        </button>
      </div>
    </section>
  );
};
