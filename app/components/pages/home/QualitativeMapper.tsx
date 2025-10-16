// @/components/pages/home/QualitativeMapper.tsx
"use client";

import React, { useCallback } from "react";
import { useProjectState } from "@/app/hooks/useProjectState";


interface Props {
  state: ReturnType<typeof useProjectState>["state"];
  setState: ReturnType<typeof useProjectState>["setState"];
  convertMatrixAfterMapping: () => boolean;
}

export const QualitativeMapper: React.FC<Props> = ({ state, setState, convertMatrixAfterMapping }) => {
  const { criteria, needsQualitativeMapping, qualitativeMapping, inputMode } = state;

  const handleQualitativeMapChange = useCallback(
    (criteriaName: string, qualitativeValue: string, numericValue: string) => {
      const newMapping = { ...qualitativeMapping };
      if (newMapping[criteriaName]) {
        newMapping[criteriaName].mapping[qualitativeValue] = numericValue === "" ? "" : parseFloat(numericValue);
      }
      setState({ qualitativeMapping: newMapping });
    },
    [qualitativeMapping, setState]
  );

  const handleProceedAfterQualitativeMapping = useCallback(() => {
    let allMapped = true;
    for (const critName in qualitativeMapping) {
      const currentMapping = qualitativeMapping[critName];
      const hasUnmappedValue = currentMapping.uniqueValues.some(
        (val) =>
          currentMapping.mapping[val] === "" ||
          isNaN(currentMapping.mapping[val] as number)
      );
      if (hasUnmappedValue) {
        allMapped = false;
        break;
      }
    }

    if (!allMapped) {
      alert("Harap lengkapi semua pemetaan nilai kualitatif ke kuantitatif sebelum melanjutkan.");
      return;
    }

    convertMatrixAfterMapping();
  }, [qualitativeMapping, convertMatrixAfterMapping]);

  if (!needsQualitativeMapping || criteria.length === 0) {
    return null;
  }

  return (
    <section className="mb-8 p-6 border border-yellow-300 bg-yellow-50 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-yellow-800">
        {inputMode === "csv" ? "4." : "3."} Pemetaan Nilai Kualitatif
      </h2>
      <p className="mb-4 text-yellow-700">
        Kami mendeteksi nilai non-angka pada beberapa kriteria. Harap tentukan nilai kuantitatif untuk setiap nilai kualitatif di bawah ini.
      </p>
      {Object.keys(qualitativeMapping).map((critName) => {
        const qualData = qualitativeMapping[critName];
        if (qualData.uniqueValues.length === 0 || qualData.uniqueValues.every((val) => qualData.mapping[val] !== "" && !isNaN(qualData.mapping[val] as number))) {
          return null;
        }

        return (
          <div key={critName} className="mb-6 p-4 border border-yellow-200 rounded-md bg-white">
            <h3 className="text-xl font-medium mb-3 text-yellow-800">Kriteria: {critName}</h3>
            <div className="grid gap-3 grid-cols-2">
              {qualData.uniqueValues.map((val) => (
                <div key={val} className="flex items-center gap-2">
                  <label className="text-gray-700">{val}:</label>
                  <input
                    type="number"
                    value={qualData.mapping[val]}
                    onChange={(e) => handleQualitativeMapChange(critName, val, e.target.value)}
                    className="flex-grow py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Masukkan nilai angka"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div className="text-center mt-6">
        <button
          onClick={handleProceedAfterQualitativeMapping}
          className="px-6 py-3 text-lg font-semibold rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition duration-200"
        >
          Lanjutkan ke Konfigurasi Kriteria
        </button>
      </div>
    </section>
  );
};
