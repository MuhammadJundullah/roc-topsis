// @/components/pages/home/ManualInput.tsx
"use client";

import React, { useCallback, useRef } from "react";
import { useProjectState, ManualDataRow } from "@/app/hooks/useProjectState";
import { RawDataRow } from "@/types";

interface Props {
  state: ReturnType<typeof useProjectState>["state"];
  setState: ReturnType<typeof useProjectState>["setState"];
  processFinalData: (data: RawDataRow[], altCol: string, critCols: string[]) => void;
}

export const ManualInput: React.FC<Props> = ({ state, setState, processFinalData }) => {
  const { manualData, manualCriteriaNames, uploadError } = state;
  const nextManualRowId = useRef(Date.now());

  const handleAddManualRow = useCallback(() => {
    setState({
      manualData: [
        ...manualData,
        {
          id: nextManualRowId.current++,
          alternativeName: "",
          ...manualCriteriaNames.reduce((acc, critName) => ({ ...acc, [critName]: "" }), {}),
        },
      ],
    });
  }, [manualData, manualCriteriaNames, setState]);

  const handleDeleteManualRow = useCallback(
    (id: number) => {
      setState({ manualData: manualData.filter((row) => row.id !== id) });
    },
    [manualData, setState]
  );

  const handleManualRowChange = useCallback(
    (id: number, field: string, value: string | number) => {
      setState({
        manualData: manualData.map((row) =>
          row.id === id ? { ...row, [field]: value } : row
        ),
      });
    },
    [manualData, setState]
  );

  const handleManualCriteriaNameChange = useCallback(
    (index: number, newName: string) => {
      const oldName = manualCriteriaNames[index];
      const updatedNames = [...manualCriteriaNames];
      updatedNames[index] = newName;

      const updatedManualData = manualData.map((row) => {
        const newRow = { ...row };
        if (oldName in newRow) {
          newRow[newName] = newRow[oldName];
          delete newRow[oldName];
        }
        return newRow;
      });

      setState({ manualCriteriaNames: updatedNames, manualData: updatedManualData });
    },
    [manualCriteriaNames, manualData, setState]
  );

  const handleAddManualCriteria = useCallback(() => {
    const newCritName = `Kriteria ${manualCriteriaNames.length + 1}`;
    setState({
      manualCriteriaNames: [...manualCriteriaNames, newCritName],
      manualData: manualData.map((row) => ({ ...row, [newCritName]: "" })),
    });
  }, [manualCriteriaNames, manualData, setState]);

  const handleRemoveManualCriteria = useCallback(() => {
    if (manualCriteriaNames.length === 0) return;
    const lastCrit = manualCriteriaNames[manualCriteriaNames.length - 1];
    const updatedNames = manualCriteriaNames.slice(0, -1);
    const updatedManualData = manualData.map((row) => {
      const newRow = { ...row };
      delete newRow[lastCrit];
      return newRow;
    });
    setState({ manualCriteriaNames: updatedNames, manualData: updatedManualData });
  }, [manualCriteriaNames, manualData, setState]);

  const handleManualDataConfirm = useCallback(() => {
    if (manualData.length === 0 || manualData.some((row) => row.alternativeName.trim() === "")) {
      setState({ uploadError: "Harap masukkan setidaknya satu nama alternatif yang tidak kosong." });
      return;
    }
    if (manualCriteriaNames.length === 0) {
      setState({ uploadError: "Harap masukkan setidaknya satu nama kriteria untuk input manual." });
      return;
    }
    if (manualCriteriaNames.some((name) => name.trim() === "")) {
      setState({ uploadError: "Nama kriteria manual tidak boleh kosong." });
      return;
    }

    const mappedRawData: RawDataRow[] = manualData.map((row) => {
      const newRow: RawDataRow = {
        Alternatif: row.alternativeName.toString().trim(),
      };
      manualCriteriaNames.forEach((critName) => {
        newRow[critName] = row[critName]?.toString().trim() || "";
      });
      return newRow;
    });

    processFinalData(mappedRawData, "Alternatif", manualCriteriaNames);
  }, [manualData, manualCriteriaNames, processFinalData, setState]);

  return (
    <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4">2. Input Data Manual</h2>
      {uploadError && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p className="font-bold">Kesalahan/Peringatan:</p>
          <p className="whitespace-pre-line">{uploadError}</p>
        </div>
      )}
      <div className="mb-4">
        <button
          onClick={handleAddManualCriteria}
          className="mr-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Tambah Kolom Kriteria
        </button>
        <button
          onClick={handleRemoveManualCriteria}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Hapus Kolom Kriteria Terakhir
        </button>
      </div>
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full bg-white border border-gray-200 rounded-md">
          <thead>
            <tr>
              <th className="py-2 px-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Alternatif
              </th>
              {manualCriteriaNames.map((critName, index) => (
                <th
                  key={index}
                  className="py-2 px-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  <input
                    type="text"
                    value={critName}
                    onChange={(e) => handleManualCriteriaNameChange(index, e.target.value)}
                    className="w-full bg-transparent border-b border-gray-400 focus:outline-none"
                    placeholder="Nama Kriteria"
                  />
                </th>
              ))}
              <th className="py-2 px-3 border-b-2 border-gray-200 bg-gray-100"></th>
            </tr>
          </thead>
          <tbody>
            {manualData.map((row) => (
              <tr key={row.id}>
                <td className="py-2 px-3 border-b border-gray-200 text-sm text-gray-800">
                  <input
                    type="text"
                    value={row.alternativeName}
                    onChange={(e) => handleManualRowChange(row.id, "alternativeName", e.target.value)}
                    className="w-full p-1 border border-gray-300 rounded"
                    placeholder="Nama Alternatif"
                  />
                </td>
                {manualCriteriaNames.map((critName, index) => (
                  <td
                    key={index}
                    className="py-2 px-3 border-b border-gray-200 text-sm text-gray-800"
                  >
                    <input
                      type="number"
                      value={row[critName]?.toString() || ""}
                      onChange={(e) =>
                        handleManualRowChange(
                          row.id,
                          critName,
                          e.target.value === "" ? "" : parseFloat(e.target.value)
                        )
                      }
                      className="w-full p-1 border border-gray-300 rounded"
                      placeholder="Nilai"
                    />
                  </td>
                ))}
                <td className="py-2 px-3 border-b border-gray-200">
                  <button
                    onClick={() => handleDeleteManualRow(row.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-center">
        <button
          onClick={handleAddManualRow}
          className="mr-4 px-6 py-3 text-lg font-semibold rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
        >
          Tambah Baris Alternatif
        </button>
        <button
          onClick={handleManualDataConfirm}
          className="px-6 py-3 text-lg font-semibold rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700"
        >
          Konfirmasi Data Manual
        </button>
      </div>
    </section>
  );
};
