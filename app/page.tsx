// app/page.tsx
"use client";

import React, { useState, useRef } from "react";
import Papa from "papaparse";
import {
  CriteriaType,
  RankingResult,
  QualitativeMapping,
  RawDataRow,
} from "@/types";
import CriteriaConfig from "@/components/CriteriaConfig";

// Untuk input manual
interface ManualDataRow {
  id: number;
  alternativeName: string;
  [key: string]: string | number; // Kriteria bisa string (untuk input awal) atau number
}

export default function HomePage() {
  const [inputMode, setInputMode] = useState<"manual" | "csv">("csv"); // Default ke CSV
  const [parsedRawData, setParsedRawData] = useState<RawDataRow[] | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]); // Menyimpan semua header dari CSV
  const [selectedAltCol, setSelectedAltCol] = useState<string | null>(null); // Kolom yang dipilih untuk nama alternatif
  const [selectedCritCols, setSelectedCritCols] = useState<string[]>([]); // Kolom yang dipilih untuk kriteria

  const [criteria, setCriteria] = useState<string[]>([]); // Kriteria yang sudah difilter
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [matrixValues, setMatrixValues] = useState<number[][]>([]);
  const [criteriaTypes, setCriteriaTypes] = useState<{
    [key: string]: CriteriaType;
  }>({});
  const [prioritizedCriteria, setPrioritizedCriteria] = useState<string[]>([]);
  const [rankingResults, setRankingResults] = useState<RankingResult[] | null>(
    null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [qualitativeMapping, setQualitativeMapping] =
    useState<QualitativeMapping>({});
  const [needsQualitativeMapping, setNeedsQualitativeMapping] = useState(false);

  // State untuk input manual
  const [manualData, setManualData] = useState<ManualDataRow[]>([
    { id: Date.now(), alternativeName: "", },
  ]);
  const [manualCriteriaNames, setManualCriteriaNames] = useState<string[]>([]);
  let nextManualRowId = useRef(Date.now());


  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Utility functions ---
  const resetAllDataStates = () => {
    setParsedRawData(null);
    setCsvHeaders([]);
    setSelectedAltCol(null);
    setSelectedCritCols([]);
    setCriteria([]);
    setAlternatives([]);
    setMatrixValues([]);
    setCriteriaTypes({});
    setPrioritizedCriteria([]);
    setRankingResults(null);
    setUploadError(null);
    setQualitativeMapping({});
    setNeedsQualitativeMapping(false);
    setManualData([{ id: Date.now(), alternativeName: "" }]);
    setManualCriteriaNames([]);
    nextManualRowId.current = Date.now();
  };

  // --- Fungsi Pemrosesan Data (setelah CSV di-parse atau data manual di-confirm) ---
   const processFinalData = (
    data: RawDataRow[],
    altCol: string,
    critCols: string[]
  ) => {
    const newAlternatives: string[] = [];
    const newMatrixValuesTemp: (number | string)[][] = [];
    const newQualitativeMapping: QualitativeMapping = {};
    let hasQualitativeData = false;

    critCols.forEach((crit) => {
      newQualitativeMapping[crit] = { uniqueValues: [], mapping: {} };
    });

    data.forEach((row: RawDataRow) => {
      const alternativeName = row[altCol];
      if (!alternativeName || alternativeName.trim() === "") return; // Skip empty alt names

      newAlternatives.push(alternativeName);
      const currentRowValues: (number | string)[] = [];

      critCols.forEach((crit) => {
        const value = row[crit];
        const numericValue = parseFloat(value);

        if (isNaN(numericValue) || value === undefined || value === null || value.toString().trim() === "") {
          hasQualitativeData = true;
          if (value !== undefined && value !== null && value.toString().trim() !== "") {
            const trimmedValue = value.toString().trim();
            if (!newQualitativeMapping[crit].uniqueValues.includes(trimmedValue)) {
              newQualitativeMapping[crit].uniqueValues.push(trimmedValue);
              newQualitativeMapping[crit].mapping[trimmedValue] = "";
            }
          }
          currentRowValues.push(value !== undefined && value !== null ? value.toString().trim() : "");
        } else {
          currentRowValues.push(numericValue);
        }
      });
      newMatrixValuesTemp.push(currentRowValues);
    });

    setAlternatives(newAlternatives);
    setCriteria(critCols); // Kriteria sekarang adalah kolom yang dipilih
    setQualitativeMapping(newQualitativeMapping);
    setNeedsQualitativeMapping(hasQualitativeData);

    if (!hasQualitativeData) {
      setMatrixValues(newMatrixValuesTemp as number[][]);
    } else {
      setMatrixValues([]);
    }

    const initialTypes: { [key: string]: CriteriaType } = {};
    critCols.forEach((crit) => (initialTypes[crit] = "benefit"));
    setCriteriaTypes(initialTypes);
    setPrioritizedCriteria([...critCols]); // Urutan awal sesuai kriteria yang dipilih
    setUploadError(null); // Clear errors if initial processing is fine
  };

  // --- CSV Upload & Column Selection Handlers ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetAllDataStates(); // Reset all states on new file upload

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setUploadError("File CSV kosong atau tidak memiliki data yang valid setelah header.");
          return;
        }

        const headers = Object.keys(results.data[0] as object);
        if (headers.length === 0) {
          setUploadError("File CSV tidak memiliki header kolom yang valid.");
          return;
        }

        setParsedRawData(results.data as RawDataRow[]);
        setCsvHeaders(headers);
        // Default select first column as alternative, others as criteria (user can change)
        if (headers.length > 0) {
          setSelectedAltCol(headers[0]);
          setSelectedCritCols(headers.slice(1));
        }
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        setUploadError(`Gagal membaca file CSV: ${error.message}. Pastikan formatnya benar.`);
      },
    });
  };

  const handleColumnSelectionConfirm = () => {
    if (!parsedRawData || !selectedAltCol || selectedCritCols.length === 0) {
      setUploadError("Harap pilih kolom untuk nama alternatif dan setidaknya satu kolom kriteria.");
      return;
    }

    // Filter parsedRawData based on selected columns
    const filteredData: RawDataRow[] = parsedRawData.map(row => {
      const newRow: RawDataRow = { [selectedAltCol]: row[selectedAltCol] };
      selectedCritCols.forEach(critCol => {
        newRow[critCol] = row[critCol];
      });
      return newRow;
    });

    processFinalData(filteredData, selectedAltCol, selectedCritCols);
  };

  // --- Manual Input Handlers ---
  const handleAddManualRow = () => {
    setManualData((prev) => [
      ...prev,
      { id: nextManualRowId.current++, alternativeName: "", },
    ]);
  };

  const handleDeleteManualRow = (id: number) => {
    setManualData((prev) => prev.filter((row) => row.id !== id));
  };

  const handleManualRowChange = (
    id: number,
    field: string,
    value: string | number
  ) => {
    setManualData((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleManualCriteriaNameChange = (index: number, newName: string) => {
    setManualCriteriaNames(prev => {
      const updatedNames = [...prev];
      updatedNames[index] = newName;
      return updatedNames;
    });
  };

  const handleAddManualCriteria = () => {
    setManualCriteriaNames(prev => [...prev, `Kriteria ${prev.length + 1}`]);
    // Also add to existing manualData rows
    setManualData(prev => prev.map(row => ({ ...row, [`Kriteria ${manualCriteriaNames.length + 1}`]: "" })));
  };

  const handleRemoveManualCriteria = () => {
    if (manualCriteriaNames.length === 0) return;
    const lastCrit = manualCriteriaNames[manualCriteriaNames.length - 1];
    setManualCriteriaNames(prev => prev.slice(0, -1));
    setManualData(prev => prev.map(row => {
      const newRow = { ...row };
      delete newRow[lastCrit];
      return newRow;
    }));
  };


  const handleManualDataConfirm = () => {
    if (manualData.length === 0 || manualCriteriaNames.length === 0) {
        setUploadError("Harap masukkan setidaknya satu alternatif dan satu kriteria untuk input manual.");
        return;
    }

    // Convert manualData to RawDataRow[] format for processFinalData
    const mappedRawData: RawDataRow[] = manualData.map(row => {
        const newRow: RawDataRow = { "Alternatif": row.alternativeName }; // Use a generic key for alternative name
        manualCriteriaNames.forEach(critName => {
            newRow[critName] = row[critName]?.toString() || ""; // Ensure it's string
        });
        return newRow;
    });

    processFinalData(mappedRawData, "Alternatif", manualCriteriaNames);
  };

  // --- Qualitative Mapping Handlers ---
  const handleQualitativeMapChange = (
    criteriaName: string,
    qualitativeValue: string,
    numericValue: string
  ) => {
    setQualitativeMapping((prev) => {
      const newMapping = { ...prev };
      if (newMapping[criteriaName]) {
        newMapping[criteriaName].mapping[qualitativeValue] =
          numericValue === "" ? "" : parseFloat(numericValue);
      }
      return newMapping;
    });
  };

  const convertMatrixAfterMapping = (): boolean => {
    if (!parsedRawData || !criteria || !qualitativeMapping) { // parsedRawData for CSV, but manual input needs mappedRawData (requires adjustment)
      setUploadError(
        "Data mentah atau pemetaan kualitatif tidak lengkap untuk konversi."
      );
      return false;
    }

    // Determine the source of raw data (CSV or Manual)
    const sourceData = inputMode === "csv" && parsedRawData ? parsedRawData :
                       inputMode === "manual" ? manualData.map(row => {
                         const obj: RawDataRow = { "Alternatif": row.alternativeName.toString() };
                         manualCriteriaNames.forEach(critName => {
                           obj[critName] = row[critName]?.toString() || "";
                         });
                         return obj;
                       }) : [];

    if (sourceData.length === 0) {
        setUploadError("Tidak ada data valid yang tersedia untuk konversi.");
        return false;
    }

    const finalMatrixValues: number[][] = [];
    let conversionError = false;
    const errors: string[] = [];

    sourceData.forEach((row: RawDataRow, rowIndex: number) => {
      const currentRowNumericValues: number[] = [];
      criteria.forEach((crit) => {
        const rawValue = row[crit];
        let numericVal: number | undefined;

        const parsedNum = parseFloat(rawValue);
        if (!isNaN(parsedNum)) {
          numericVal = parsedNum;
        } else {
          const mappedVal = qualitativeMapping[crit]?.mapping[rawValue.toString().trim()]; // Ensure rawValue is string
          if (
            mappedVal !== undefined &&
            mappedVal !== "" &&
            !isNaN(mappedVal as number)
          ) {
            numericVal = mappedVal as number;
          } else {
            errors.push(
              `Baris ${
                rowIndex + 1
              }, kolom '${crit}': Nilai '${rawValue}' tidak dapat dikonversi ke angka dan tidak ada dalam pemetaan kualitatif atau pemetaan belum lengkap.`
            );
            conversionError = true;
          }
        }
        currentRowNumericValues.push(
          numericVal !== undefined ? numericVal : NaN
        );
      });
      finalMatrixValues.push(currentRowNumericValues);
    });

    if (conversionError) {
      setUploadError(
        `Beberapa nilai tidak dapat dikonversi ke angka setelah pemetaan:\n${errors.join(
          "\n"
        )}\nHarap lengkapi semua pemetaan atau perbaiki data di file.`
      );
      setMatrixValues([]);
      return false;
    } else {
      setMatrixValues(finalMatrixValues);
      setNeedsQualitativeMapping(false);
      setUploadError(null);
      return true;
    }
  };

  const handleProceedAfterQualitativeMapping = () => {
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
      alert(
        "Harap lengkapi semua pemetaan nilai kualitatif ke kuantitatif sebelum melanjutkan."
      );
      return;
    }

    const conversionSuccessful = convertMatrixAfterMapping();

    if (conversionSuccessful) {
      // Logic will proceed automatically as needsQualitativeMapping becomes false
    }
  };

  // --- Criteria Configuration & Priority Handlers (passed to CriteriaConfig) ---
  const handleCriteriaTypeChange = (critName: string, type: CriteriaType) => {
    setCriteriaTypes((prev) => ({ ...prev, [critName]: type }));
  };

  const handlePriorityChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
    index: number
  ) => {
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
    setPrioritizedCriteria(newPriority);
  };

  // --- Calculate Handler ---
  const handleCalculate = async () => {
    setRankingResults(null);
    setUploadError(null);

    if (needsQualitativeMapping) {
      alert(
        "Harap selesaikan pemetaan nilai kualitatif terlebih dahulu menggunakan tombol 'Lanjutkan ke Konfigurasi Kriteria'."
      );
      return;
    }

    if (
      !matrixValues ||
      matrixValues.length === 0 ||
      matrixValues[0].length === 0
    ) {
      alert(
        "Matriks data kosong atau tidak valid. Harap unggah data CSV yang valid atau selesaikan pemetaan."
      );
      return;
    }

    const allCriteriaTyped = criteria.every(
      (crit) =>
        criteriaTypes[crit] !== undefined &&
        (criteriaTypes[crit] === "benefit" || criteriaTypes[crit] === "cost")
    );
    if (!allCriteriaTyped) {
      alert(
        "Harap tentukan tipe (benefit/cost) untuk semua kriteria sebelum perhitungan."
      );
      return;
    }

    const filledPrioritizedCriteria = prioritizedCriteria.filter(
      (p) => p !== ""
    );
    if (filledPrioritizedCriteria.length !== criteria.length) {
      alert(
        "Harap lengkapi urutan prioritas untuk semua kriteria. Setiap kriteria harus unik."
      );
      return;
    }
    const uniquePrioritized = new Set(filledPrioritizedCriteria);
    if (uniquePrioritized.size !== criteria.length) {
      alert(
        "Urutan prioritas kriteria harus unik dan mencakup semua kriteria."
      );
      return;
    }
    const missingPriorities = filledPrioritizedCriteria.filter(
      (pc) => !criteria.includes(pc)
    );
    if (missingPriorities.length > 0) {
      alert(
        `Kriteria prioritas tidak valid: ${missingPriorities.join(
          ", "
        )}. Pastikan sama dengan kriteria di data.`
      );
      return;
    }

    try {
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alternatives,
          criteria,
          values: matrixValues,
          criteriaTypes: criteria.map((crit) => criteriaTypes[crit]),
          prioritizedCriteria,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Terjadi kesalahan pada server.");
      }

      const data = await response.json();
      setRankingResults(data.ranking);
    } catch (error: unknown) {
      console.error("Error during calculation:", error);
      let clientErrorMessage = "An unknown error occurred during calculation.";
      if (error instanceof Error) {
        clientErrorMessage = error.message;
      } else if (typeof error === "string") {
        clientErrorMessage = error;
      }
      setUploadError(
        `Terjadi kesalahan saat perhitungan: ${clientErrorMessage}. Cek konsol browser dan server untuk detail.`
      );
    }
  };

  return (
    <div className="container mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold text-center mb-8">
        Sistem Pengambilan Keputusan (ROC-TOPSIS)
      </h1>

      {/* Bagian Pemilihan Mode Input */}
      <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-semibold mb-4">1. Pilih Mode Input Data</h2>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => { resetAllDataStates(); setInputMode("csv"); }}
            className={`px-6 py-3 text-lg font-semibold rounded-full transition duration-200 ${
              inputMode === "csv"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            Upload File CSV
          </button>
          <button
            onClick={() => { resetAllDataStates(); setInputMode("manual"); }}
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

      {/* Bagian Input CSV */}
      {inputMode === "csv" && (
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
            <small>
              Unggah file CSV Anda. Kolom pertama biasanya adalah nama alternatif.
            </small>
          </p>

          {uploadError && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              <p className="font-bold">Kesalahan/Peringatan:</p>
              <p className="whitespace-pre-line">{uploadError}</p>
              <p className="mt-2">
                <small>
                  Harap perbaiki file CSV Anda atau lengkapi pemetaan nilai.
                </small>
              </p>
            </div>
          )}

          {parsedRawData && csvHeaders.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl font-medium mb-3">3. Pilih Kolom Data</h3>
              <div className="mb-4">
                <label htmlFor="alt-col-select" className="block text-gray-700 text-sm font-bold mb-2">
                  Kolom Nama Alternatif:
                </label>
                <select
                  id="alt-col-select"
                  value={selectedAltCol || ""}
                  onChange={(e) => setSelectedAltCol(e.target.value)}
                  className="block w-full mt-1 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">-- Pilih Kolom --</option>
                  {csvHeaders.map((header) => (
                    <option key={header} value={header}>{header}</option>
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
                            setSelectedCritCols((prev) => [...prev, header]);
                          } else {
                            setSelectedCritCols((prev) =>
                              prev.filter((col) => col !== header)
                            );
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
                            className="py-3 px-4 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
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
                              className="py-3 px-4 border-b border-gray-200 text-sm text-gray-800">
                              {row[header] as React.ReactNode}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {parsedRawData.length > 5 && (
                        <tr>
                          <td
                            colSpan={csvHeaders.length}
                            className="py-3 px-4 border-b border-gray-200 text-sm text-gray-500 text-center">
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
      )}

      {/* Bagian Input Manual */}
      {inputMode === "manual" && (
        <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">2. Input Data Manual</h2>
          <div className="mb-4">
            <button onClick={handleAddManualCriteria} className="mr-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
              Tambah Kolom Kriteria
            </button>
            <button onClick={handleRemoveManualCriteria} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
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
                    <th key={index} className="py-2 px-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
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
                      <td key={index} className="py-2 px-3 border-b border-gray-200 text-sm text-gray-800">
                        <input
                          type="text" // Type text to allow qualitative values initially
                          value={row[critName]?.toString() || ""}
                          onChange={(e) => handleManualRowChange(row.id, critName, e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded"
                          placeholder="Nilai"
                        />
                      </td>
                    ))}
                    <td className="py-2 px-3 border-b border-gray-200">
                      <button onClick={() => handleDeleteManualRow(row.id)} className="text-red-500 hover:text-red-700">
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-center">
            <button onClick={handleAddManualRow} className="mr-4 px-6 py-3 text-lg font-semibold rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700">
              Tambah Baris Alternatif
            </button>
            <button onClick={handleManualDataConfirm} className="px-6 py-3 text-lg font-semibold rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700">
              Konfirmasi Data Manual
            </button>
          </div>
        </section>
      )}

      {/* Bagian 3: Pemetaan Nilai Kualitatif (Hanya tampil jika ada data dan perlu pemetaan) */}
      { (inputMode === "csv" && parsedRawData && needsQualitativeMapping) || (inputMode === "manual" && manualData.length > 0 && needsQualitativeMapping) ? (
        <section className="mb-8 p-6 border border-yellow-300 bg-yellow-50 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-yellow-800">
            {inputMode === "csv" ? "4." : "3."} Pemetaan Nilai Kualitatif
          </h2>
          <p className="mb-4 text-yellow-700">
            Kami mendeteksi nilai non-angka pada beberapa kriteria. Harap
            tentukan nilai kuantitatif untuk setiap nilai kualitatif di bawah
            ini.
          </p>
          {Object.keys(qualitativeMapping).map((critName) => {
            const qualData = qualitativeMapping[critName];
            if (qualData.uniqueValues.length === 0) return null;

            return (
              <div
                key={critName}
                className="mb-6 p-4 border border-yellow-200 rounded-md bg-white">
                <h3 className="text-xl font-medium mb-3 text-yellow-800">
                  Kriteria: {critName}
                </h3>
                <div className="grid gap-3 grid-cols-2">
                  {qualData.uniqueValues.map((val) => (
                    <div key={val} className="flex items-center gap-2">
                      <label className="text-gray-700">{val}:</label>
                      <input
                        type="number"
                        value={qualData.mapping[val]}
                        onChange={(e) =>
                          handleQualitativeMapChange(
                            critName,
                            val,
                            e.target.value
                          )
                        }
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
              className="px-6 py-3 text-lg font-semibold rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition duration-200">
              Lanjutkan ke Konfigurasi Kriteria
            </button>
          </div>
        </section>
      ) : null}

      {/* Bagian 4/5: Konfigurasi Kriteria (Hanya tampil jika matriks sudah dikonversi & tidak ada pemetaan tertunda) */}
      {matrixValues.length > 0 && !needsQualitativeMapping && (
        <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">
            {inputMode === "csv" ? "4." : "3."} Konfigurasi Kriteria
          </h2>
          <CriteriaConfig
            criteria={criteria}
            criteriaTypes={criteriaTypes}
            onCriteriaTypeChange={handleCriteriaTypeChange}
            prioritizedCriteria={prioritizedCriteria}
            onPriorityChange={handlePriorityChange}
          />
        </section>
      )}

      {/* Bagian 5/6: Tombol Hitung (Hanya tampil jika matriks sudah dikonversi & tidak ada pemetaan tertunda) */}
      {matrixValues.length > 0 && !needsQualitativeMapping && (
        <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-semibold mb-4">{inputMode === "csv" ? "5." : "4."} Hitung Ranking</h2>
          <button
            onClick={handleCalculate}
            className="px-6 py-3 text-lg font-semibold rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200">
            Mulai Perhitungan ROC & TOPSIS
          </button>
        </section>
      )}

      {/* Bagian 6/7: Hasil Ranking */}
      {rankingResults && (
        <section className="mt-8 p-6 border border-gray-300 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">{inputMode === "csv" ? "6." : "5."} Hasil Ranking</h2>
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
      )}
    </div>
  );
}