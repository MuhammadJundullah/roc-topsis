// app/page.tsx
"use client";

import React, { useState, useRef } from "react";
import Papa from "papaparse";
import {
  CriteriaType,
  RankingResult,
  QualitativeMapping,
  RawDataRow,
} from "@/types"; // Import RawDataRow
import CriteriaConfig from "@/components/CriteriaConfig";

export default function HomePage() {
  const [parsedRawData, setParsedRawData] = useState<RawDataRow[] | null>(null); // Ganti any[] menjadi RawDataRow[]
  const [criteria, setCriteria] = useState<string[]>([]);
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fungsi untuk memproses data setelah parsing CSV
  const processParsedData = (
    data: RawDataRow[], // Ganti any[] menjadi RawDataRow[]
    headers: string[],
    altColName: string,
    rawCriteria: string[]
  ) => {
    const newAlternatives: string[] = [];
    const newMatrixValuesTemp: (number | string)[][] = [];
    const newQualitativeMapping: QualitativeMapping = {};
    let hasQualitativeData = false;

    rawCriteria.forEach((crit) => {
      newQualitativeMapping[crit] = { uniqueValues: [], mapping: {} };
    });

    data.forEach((row: RawDataRow) => {
      // Ganti any menjadi RawDataRow
      const alternativeName = row[altColName];
      if (!alternativeName) return;

      newAlternatives.push(alternativeName);
      const currentRowValues: (number | string)[] = [];

      rawCriteria.forEach((crit) => {
        const value = row[crit];
        const numericValue = parseFloat(value);

        if (isNaN(numericValue) || value.trim() === "") {
          hasQualitativeData = true;
          if (value.trim() !== "") {
            if (
              !newQualitativeMapping[crit].uniqueValues.includes(value.trim())
            ) {
              newQualitativeMapping[crit].uniqueValues.push(value.trim());
              newQualitativeMapping[crit].mapping[value.trim()] = "";
            }
          }
          currentRowValues.push(value.trim());
        } else {
          currentRowValues.push(numericValue);
        }
      });
      newMatrixValuesTemp.push(currentRowValues);
    });

    setAlternatives(newAlternatives);
    setCriteria(rawCriteria);
    setParsedRawData(data);
    setQualitativeMapping(newQualitativeMapping);
    setNeedsQualitativeMapping(hasQualitativeData);

    if (!hasQualitativeData) {
      setMatrixValues(newMatrixValuesTemp as number[][]);
    } else {
      setMatrixValues([]);
    }

    const initialTypes: { [key: string]: CriteriaType } = {};
    rawCriteria.forEach((crit) => (initialTypes[crit] = "benefit"));
    setCriteriaTypes(initialTypes);
    setPrioritizedCriteria([...rawCriteria]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setParsedRawData(null);
    setCriteria([]);
    setAlternatives([]);
    setMatrixValues([]);
    setCriteriaTypes({});
    setPrioritizedCriteria([]);
    setRankingResults(null);
    setQualitativeMapping({});
    setNeedsQualitativeMapping(false);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setUploadError(
            "File CSV kosong atau tidak memiliki data yang valid setelah header."
          );
          return;
        }

        const headers = Object.keys(results.data[0] as object);
        if (headers.length === 0) {
          setUploadError("File CSV tidak memiliki header kolom yang valid.");
          return;
        }

        const altColName = headers[0];
        const rawCriteria = headers.slice(1);

        if (rawCriteria.length === 0) {
          setUploadError(
            "File CSV tidak memiliki kolom kriteria yang valid (hanya ada kolom alternatif)."
          );
          return;
        }

        processParsedData(
          results.data as RawDataRow[], // Ganti any[] menjadi RawDataRow[]
          headers,
          altColName,
          rawCriteria
        );
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        setUploadError(
          `Gagal membaca file CSV: ${error.message}. Pastikan formatnya benar.`
        );
      },
    });
  };

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
    if (!parsedRawData || !criteria || !qualitativeMapping) {
      setUploadError(
        "Data mentah atau pemetaan kualitatif tidak lengkap untuk konversi."
      );
      return false;
    }

    const finalMatrixValues: number[][] = [];
    let conversionError = false;
    const errors: string[] = [];

    parsedRawData.forEach((row: RawDataRow, rowIndex: number) => {
      // Ganti any menjadi RawDataRow
      const currentRowNumericValues: number[] = [];
      criteria.forEach((crit) => {
        const rawValue = row[crit];
        let numericVal: number | undefined;

        const parsedNum = parseFloat(rawValue);
        if (!isNaN(parsedNum)) {
          numericVal = parsedNum;
        } else {
          const mappedVal = qualitativeMapping[crit]?.mapping[rawValue.trim()];
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
      // Ganti 'any' dengan 'unknown'
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

      {/* Bagian 1: Unggah Data CSV */}
      <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">1. Unggah Data CSV</h2>
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
            Asumsikan kolom pertama adalah nama alternatif, kolom selanjutnya
            adalah kriteria.
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

        {parsedRawData && (
          <div className="mt-6">
            <h3 className="text-xl font-medium mb-3">Pratinjau Data Asli:</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-md">
                <thead>
                  <tr>
                    {parsedRawData.length > 0 &&
                      Object.keys(parsedRawData[0] as object).map(
                        (header, idx) => (
                          <th
                            key={idx}
                            className="py-3 px-4 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            {header}
                          </th>
                        )
                      )}
                  </tr>
                </thead>
                <tbody>
                  {parsedRawData.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {Object.values(row).map((val, colIndex) => (
                        <td
                          key={colIndex}
                          className="py-3 px-4 border-b border-gray-200 text-sm text-gray-800">
                          {val as React.ReactNode}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {parsedRawData.length > 5 && (
                    <tr>
                      <td
                        colSpan={Object.keys(parsedRawData[0] as object).length}
                        className="py-3 px-4 border-b border-gray-200 text-sm text-gray-500 text-center">
                        ... {parsedRawData.length - 5} baris lainnya
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Bagian 2: Pemetaan Nilai Kualitatif */}
      {needsQualitativeMapping && (
        <section className="mb-8 p-6 border border-yellow-300 bg-yellow-50 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-yellow-800">
            2. Pemetaan Nilai Kualitatif
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
      )}

      {/* Bagian 3: Konfigurasi Kriteria (Hanya tampil jika tidak ada pemetaan kualitatif yang tertunda) */}
      {criteria.length > 0 && !needsQualitativeMapping && (
        <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md">
          <CriteriaConfig
            criteria={criteria}
            criteriaTypes={criteriaTypes}
            onCriteriaTypeChange={handleCriteriaTypeChange}
            prioritizedCriteria={prioritizedCriteria}
            onPriorityChange={handlePriorityChange}
          />
        </section>
      )}

      {/* Bagian 4: Tombol Hitung (Hanya tampil jika tidak ada pemetaan kualitatif yang tertunda) */}
      {criteria.length > 0 && !needsQualitativeMapping && (
        <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-semibold mb-4">4. Hitung Ranking</h2>
          <button
            onClick={handleCalculate}
            className="px-6 py-3 text-lg font-semibold rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200">
            Mulai Perhitungan ROC & TOPSIS
          </button>
        </section>
      )}

      {/* Bagian 5: Hasil Ranking */}
      {rankingResults && (
        <section className="mt-8 p-6 border border-gray-300 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">5. Hasil Ranking</h2>
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
