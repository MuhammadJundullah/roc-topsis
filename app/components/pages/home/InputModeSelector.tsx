// @/components/pages/home/InputModeSelector.tsx
"use client";

import React from "react";
import { useProjectState } from "@/app/hooks/useProjectState";

interface Props {
  state: ReturnType<typeof useProjectState>["state"];
  setInputMode: ReturnType<typeof useProjectState>["setInputMode"];
}

export const InputModeSelector: React.FC<Props> = ({ state, setInputMode }) => {
  const { inputMode } = state;

  return (
    <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md text-center">
      <h2 className="text-2xl font-semibold mb-4">1. Pilih Mode Input Data</h2>
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setInputMode("csv")}
          className={`px-6 py-3 text-lg font-semibold rounded-full transition duration-200 ${
            inputMode === "csv"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          Upload File CSV
        </button>
        <button
          onClick={() => setInputMode("manual")}
          className={`px-6 py-3 text-lg font-semibold rounded-full transition duration-200 ${
            inputMode === "manual"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          Input Data Manual
        </button>
      </div>
    </section>
  );
};
