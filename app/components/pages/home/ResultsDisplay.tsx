// @/components/pages/home/ResultsDisplay.tsx
"use client";

import React from "react";
import { useProjectState } from "@/app/hooks/useProjectState";

interface Props {
  state: ReturnType<typeof useProjectState>["state"];
}

export const ResultsDisplay: React.FC<Props> = ({ state }) => {
  const { rankingResults, inputMode } = state;

  if (!rankingResults) {
    return null;
  }

  return (
    <section className="mt-8 p-6 border border-gray-300 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4">
        {inputMode === "csv" ? "7." : "6."} Hasil Ranking
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-md">
          <thead>
            <tr>
              <th className="py-3 px-4 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Rank
              </th>
              <th className="py-3 px-4 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Alternatif
              </th>
              <th className="py-3 px-4 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nilai Preferensi (C*)
              </th>
            </tr>
          </thead>
          <tbody>
            {rankingResults.map((item) => (
              <tr key={item.alternative} className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b border-gray-200 text-sm text-gray-800">
                  {item.rank}
                </td>
                <td className="py-3 px-4 border-b border-gray-200 text-sm text-gray-800">
                  {item.alternative}
                </td>
                <td className="py-3 px-4 border-b border-gray-200 text-sm text-gray-800">
                  {item.preference.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
