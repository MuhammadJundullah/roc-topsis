// @/components/pages/home/CsvInput.tsx
"use client";

import React, { useRef, useCallback } from "react";
import Papa from "papaparse";
import { useProjectState } from "@/app/hooks/useProjectState";
import { RawDataRow } from "@/types";

interface Props {
  state: ReturnType<typeof useProjectState>["state"];
  setState: ReturnType<typeof useProjectState>["setState"];
  processFinalData: (data: RawDataRow[], altCol: string, critCols: string[]) => void;
}

export const CsvInput: React.FC<Props> = ({ state, setState, processFinalData }) => {
  const { parsedRawData, csvHeaders, selectedAltCol, selectedCritCols, criteria, uploadError } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setState({ parsedRawData: null, csvHeaders: [], selectedAltCol: null, selectedCritCols: [], criteria: [], uploadError: null });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setState({ uploadError: "File CSV kosong atau tidak memiliki data yang valid setelah header." });
          return;
        }

        const headers = Object.keys(results.data[0] as object);
        if (headers.length === 0) {
          setState({ uploadError: "File CSV tidak memiliki header kolom yang valid." });
          return;
        }

        setState({ parsedRawData: results.data as RawDataRow[], csvHeaders: headers });
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        setState({ uploadError: `Gagal membaca file CSV: ${error.message}. Pastikan formatnya benar.` });
      },
    });
  };

  const handleColumnSelectionConfirm = useCallback(() => {
    if (!parsedRawData) {
      setState({ uploadError: "Harap unggah file CSV terlebih dahulu." });
      return;
    }
    if (!selectedAltCol) {
      setState({ uploadError: "Harap pilih kolom untuk nama alternatif." });
      return;
    }
    if (selectedCritCols.length === 0) {
      setState({ uploadError: "Harap pilih setidaknya satu kolom kriteria." });
      return;
    }

    const filteredData: RawDataRow[] = parsedRawData.map((row) => {
      const newRow: RawDataRow = { [selectedAltCol]: row[selectedAltCol] };
      selectedCritCols.forEach((critCol) => {
        newRow[critCol] = row[critCol];
      });
      return newRow;
    });

    processFinalData(filteredData, selectedAltCol, selectedCritCols);
  }, [parsedRawData, selectedAltCol, selectedCritCols, processFinalData, setState]);

  return (
    <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4">2. Unggah File CSV</h2>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        ref={fileInputRef}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
      />
      <p className="mt-2 text-sm text-gray-600">
        <small>Unggah file CSV Anda. Kolom pertama biasanya adalah nama alternatif.</small>
      </p>

      {uploadError && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p className="font-bold">Kesalahan/Peringatan:</p>
          <p className="whitespace-pre-line">{uploadError}</p>
          <p className="mt-2">
            <small>Harap perbaiki file CSV Anda atau lengkapi pemetaan nilai.</small>
          </p>
        </div>
      )}

      {parsedRawData && csvHeaders.length > 0 && criteria.length === 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-medium mb-3">3. Pilih Kolom Data</h3>
          <div className="mb-4">
            <label htmlFor="alt-col-select" className="block text-gray-700 text-sm font-bold mb-2">
              Kolom Nama Alternatif:
            </label>
            <select
              id="alt-col-select"
              value={selectedAltCol || ""}
              onChange={(e) => setState({ selectedAltCol: e.target.value })}
              className="block w-full mt-1 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">-- Pilih Kolom --</option>
              {csvHeaders.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Kolom Kriteria (Pilih Lebih Dari Satu):
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {csvHeaders.map((header) => (
                <label key={header} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    value={header}
                    checked={selectedCritCols.includes(header)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setState({ selectedCritCols: [...selectedCritCols, header] });
                      } else {
                        setState({ selectedCritCols: selectedCritCols.filter((col) => col !== header) });
                      }
                    }}
                    className="form-checkbox h-5 w-5 text-blue-600 rounded"
                  />
                  <span className="ml-2 text-gray-700">{header}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleColumnSelectionConfirm}
              className="px-6 py-3 text-lg font-semibold rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200"
            >
              Konfirmasi Pilihan Kolom
            </button>
          </div>

          <div className="mt-6">
            <h3 className="text-xl font-medium mb-3">Pratinjau Data Asli:</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-md">
                <thead>
                  <tr>
                    {csvHeaders.map((header, idx) => (
                      <th
                        key={idx}
                        className="py-3 px-4 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRawData.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {csvHeaders.map((header, colIndex) => (
                        <td
                          key={colIndex}
                          className="py-3 px-4 border-b border-gray-200 text-sm text-gray-800"
                        >
                          {row[header] as React.ReactNode}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {parsedRawData.length > 5 && (
                    <tr>
                      <td
                        colSpan={csvHeaders.length}
                        className="py-3 px-4 border-b border-gray-200 text-sm text-gray-500 text-center"
                      >
                        ... {parsedRawData.length - 5} baris lainnya
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
