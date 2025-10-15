// components/CriteriaConfig.tsx
// components/CriteriaConfig.tsx
import React, { useCallback } from "react";
import { CriteriaType } from "@/types";
import { useProjectState } from "@/app/hooks/useProjectState";

interface Props {
  state: ReturnType<typeof useProjectState>["state"];
  setState: ReturnType<typeof useProjectState>["setState"];
}

const CriteriaConfig: React.FC<Props> = ({ state, setState }) => {
  const { criteria, criteriaTypes, prioritizedCriteria, matrixValues, needsQualitativeMapping, inputMode } = state;

  const handleCriteriaTypeChange = useCallback(
    (critName: string, type: CriteriaType) => {
      setState({ criteriaTypes: { ...criteriaTypes, [critName]: type } });
    },
    [criteriaTypes, setState]
  );

  const handlePriorityChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>, index: number) => {
      const newPriority = [...prioritizedCriteria];
      const selectedCrit = e.target.value;

      if (selectedCrit === "") {
        newPriority[index] = "";
      } else {
        const isDuplicate = newPriority.some(
          (item, i) => item === selectedCrit && i !== index
        );
        if (isDuplicate) {
          alert(
            `Kriteria '${selectedCrit}' sudah dipilih pada urutan lain. Harap pilih kriteria unik.`
          );
          return;
        }
        if (!criteria.includes(selectedCrit)) {
          alert(
            `Kriteria '${selectedCrit}' tidak ditemukan dalam data asli Anda.`
          );
          return;
        }
        newPriority[index] = selectedCrit;
      }
      setState({ prioritizedCriteria: newPriority });
    },
    [criteria, prioritizedCriteria, setState]
  );
  
  if (matrixValues.length === 0 || needsQualitativeMapping) {
    return null;
  }

  return (
    <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4">
        {inputMode === "csv" ? "5." : "4."} Konfigurasi Kriteria
      </h2>
      <div>
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-3">Tipe Kriteria</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {criteria.map((crit) => (
              <div key={crit} className="flex flex-col">
                <label className="font-semibold text-gray-700">{crit}</label>
                <select
                  value={criteriaTypes[crit] || "benefit"}
                  onChange={(e) =>
                    handleCriteriaTypeChange(crit, e.target.value as CriteriaType)
                  }
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="benefit">Benefit</option>
                  <option value="cost">Cost</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-medium mb-3">Prioritas Kriteria</h3>
          <p className="text-sm text-gray-600 mb-4">
            Urutkan kriteria dari yang paling penting (Prioritas 1) hingga yang
            kurang penting.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {criteria.map((_, index) => (
              <div key={index} className="flex items-center">
                <label className="mr-3 font-bold text-gray-700">
                  Prioritas {index + 1}:
                </label>
                <select
                  value={prioritizedCriteria[index] || ""}
                  onChange={(e) => handlePriorityChange(e, index)}
                  className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Pilih Kriteria --</option>
                  {criteria.map((crit) => (
                    <option
                      key={crit}
                      value={crit}
                      disabled={
                        prioritizedCriteria.includes(crit) &&
                        prioritizedCriteria[index] !== crit
                      }
                    >
                      {crit}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CriteriaConfig;