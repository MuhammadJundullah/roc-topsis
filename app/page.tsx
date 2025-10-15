// app/page.tsx
"use client";

import React, { useCallback } from "react";
import { useProjectState, ProjectDataType } from "@/app/hooks/useProjectState";
import { RawDataRow, CriteriaType, QualitativeMapping } from "@/types";
import { ProjectManagement } from "@/app/components/pages/home/ProjectManagement";
import { InputModeSelector } from "@/app/components/pages/home/InputModeSelector";
import { CsvInput } from "@/app/components/pages/home/CsvInput";
import { ManualInput } from "@/app/components/pages/home/ManualInput";
import { QualitativeMapper } from "@/app/components/pages/home/QualitativeMapper";
import CriteriaConfig from "@/components/CriteriaConfig";
import { CalculationRunner } from "@/app/components/pages/home/CalculationRunner";
import { ResultsDisplay } from "@/app/components/pages/home/ResultsDisplay";

export default function HomePage() {
  const { state, setState, resetState, loadProject, setInputMode } = useProjectState();

  const processFinalData = useCallback(
    (data: RawDataRow[], altCol: string, critCols: string[]) => {
      const newAlternatives: string[] = [];
      const newMatrixValuesTemp: (number | string)[][] = [];
      const newQualitativeMapping: QualitativeMapping = {};
      let hasQualitativeData = false;

      critCols.forEach((crit) => {
        newQualitativeMapping[crit] = { uniqueValues: [], mapping: {} };
      });

      data.forEach((row: RawDataRow) => {
        const alternativeName = row[altCol];
        if (!alternativeName || alternativeName.toString().trim() === "") return;

        newAlternatives.push(alternativeName.toString().trim());
        const currentRowValues: (number | string)[] = [];

        critCols.forEach((crit) => {
          const value = row[crit];
          const numericValue = parseFloat(value as string);
          if (value === undefined || value === null || value.toString().trim() === "" || isNaN(numericValue)) {
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

      const initialTypes: { [key: string]: CriteriaType } = {};
      critCols.forEach((crit) => (initialTypes[crit] = "benefit"));

      setState({
        alternatives: newAlternatives,
        criteria: critCols,
        qualitativeMapping: newQualitativeMapping,
        needsQualitativeMapping: hasQualitativeData,
        matrixValues: hasQualitativeData ? [] : (newMatrixValuesTemp as number[][]),
        criteriaTypes: initialTypes,
        prioritizedCriteria: Array(critCols.length).fill(""),
        uploadError: null,
      });
    },
    [setState]
  );

  const convertMatrixAfterMapping = useCallback((): boolean => {
    const sourceData =
      state.inputMode === "csv"
        ? state.parsedRawData
        : state.inputMode === "manual"
        ? state.manualData.map((row) => {
            const obj: RawDataRow = {
              Alternatif: row.alternativeName.toString().trim(),
            };
            state.manualCriteriaNames.forEach((critName) => {
              obj[critName] = row[critName]?.toString().trim() || "";
            });
            return obj;
          })
        : null;

    if (!sourceData || sourceData.length === 0) {
      setState({ uploadError: "Tidak ada data valid yang tersedia untuk konversi." });
      return false;
    }

    const finalMatrixValues: number[][] = [];
    let conversionError = false;
    const errors: string[] = [];

    sourceData.forEach((row: RawDataRow, rowIndex: number) => {
      const currentRowNumericValues: number[] = [];
      state.criteria.forEach((crit) => {
        const rawValue = row[crit];
        let numericVal: number | undefined;

        const parsedNum = parseFloat(rawValue as string);
        if (!isNaN(parsedNum)) {
          numericVal = parsedNum;
        } else {
          const mappedVal = state.qualitativeMapping[crit]?.mapping[rawValue.toString().trim()];
          if (mappedVal !== undefined && mappedVal !== "" && !isNaN(mappedVal as number)) {
            numericVal = mappedVal as number;
          } else {
            errors.push(
              `Baris ${rowIndex + 1}, kolom '${crit}': Nilai '${rawValue}' tidak dapat dikonversi ke angka dan tidak ada dalam pemetaan kualitatif atau pemetaan belum lengkap.`
            );
            conversionError = true;
          }
        }
        currentRowNumericValues.push(numericVal !== undefined ? numericVal : NaN);
      });
      finalMatrixValues.push(currentRowNumericValues);
    });

    if (conversionError) {
      setState({
        uploadError: `Beberapa nilai tidak dapat dikonversi ke angka setelah pemetaan:\n${errors.join("\n")}\nHarap lengkapi semua pemetaan atau perbaiki data di file.`,
        matrixValues: [],
      });
      return false;
    } else {
      setState({ matrixValues: finalMatrixValues, needsQualitativeMapping: false, uploadError: null });
      return true;
    }
  }, [state.inputMode, state.parsedRawData, state.manualData, state.manualCriteriaNames, state.criteria, state.qualitativeMapping, setState]);

  const handleSaveProject = async () => {
    if (!state.projectName.trim()) {
      alert("Nama proyek tidak boleh kosong!");
      return;
    }
    if (!state.projectId) {
      alert("Tidak ada proyek yang sedang aktif untuk disimpan. Harap mulai proyek baru atau muat proyek.");
      return;
    }
    const hasMeaningfulData =
      state.matrixValues.length > 0 ||
      (state.inputMode === "csv" && state.parsedRawData && state.selectedAltCol && state.selectedCritCols.length > 0) ||
      (state.inputMode === "manual" && state.manualData.length > 0 && state.manualData[0].alternativeName.trim() !== "");

    if (!hasMeaningfulData) {
      alert("Tidak ada data proyek untuk disimpan! Harap input data terlebih dahulu.");
      return;
    }

    setState({ uploadError: null });

    try {
      const projectData: Partial<ProjectDataType> = { ...state };
      delete projectData.savedProjects;
      delete projectData.showLoadProjectModal;
      delete projectData.loadProjectError;

      const response = await fetch(`/api/projects/${state.projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: state.projectName, projectData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menyimpan proyek.");
      }

      const savedProj = await response.json();
      alert(`Proyek "${savedProj.name}" berhasil disimpan/diperbarui!`);
    } catch (error: unknown) {
      console.error("Error saving project:", error);
      let clientErrorMessage = "Gagal menyimpan proyek.";
      if (error instanceof Error) clientErrorMessage = error.message;
      setState({ uploadError: clientErrorMessage });
    }
  };

  const handleCalculate = async () => {
    setState({ rankingResults: null, uploadError: null });

    if (state.needsQualitativeMapping) {
      alert("Harap selesaikan pemetaan nilai kualitatif terlebih dahulu menggunakan tombol 'Lanjutkan ke Konfigurasi Kriteria'.");
      return;
    }

    if (!state.matrixValues || state.matrixValues.length === 0 || state.matrixValues[0].length === 0) {
      alert("Matriks data kosong atau tidak valid. Harap unggah data CSV yang valid atau selesaikan pemetaan.");
      return;
    }

    const allCriteriaTyped = state.criteria.every(
      (crit) => state.criteriaTypes[crit] !== undefined && (state.criteriaTypes[crit] === "benefit" || state.criteriaTypes[crit] === "cost")
    );
    if (!allCriteriaTyped) {
      alert("Harap tentukan tipe (benefit/cost) untuk semua kriteria sebelum perhitungan.");
      return;
    }

    const filledPrioritizedCriteria = state.prioritizedCriteria.filter((p) => p !== "");
    if (filledPrioritizedCriteria.length !== state.criteria.length) {
      alert("Harap lengkapi urutan prioritas untuk semua kriteria. Setiap kriteria harus unik.");
      return;
    }
    const uniquePrioritized = new Set(filledPrioritizedCriteria);
    if (uniquePrioritized.size !== state.criteria.length) {
      alert("Urutan prioritas kriteria harus unik dan mencakup semua kriteria.");
      return;
    }
    const missingPriorities = filledPrioritizedCriteria.filter((pc) => !state.criteria.includes(pc));
    if (missingPriorities.length > 0) {
      alert(`Kriteria prioritas tidak valid: ${missingPriorities.join(", ")}. Pastikan sama dengan kriteria di data.`);
      return;
    }

    try {
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alternatives: state.alternatives,
          criteria: state.criteria,
          values: state.matrixValues,
          criteriaTypes: state.criteria.map((crit) => state.criteriaTypes[crit]),
          prioritizedCriteria: state.prioritizedCriteria,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Terjadi kesalahan pada server.");
      }

      const data = await response.json();
      setState({ rankingResults: data.ranking });
    } catch (error: unknown) {
      console.error("Error during calculation:", error);
      let clientErrorMessage = "An unknown error occurred during calculation.";
      if (error instanceof Error) {
        clientErrorMessage = error.message;
      } else if (typeof error === "string") {
        clientErrorMessage = error;
      }
      setState({ uploadError: `Terjadi kesalahan saat perhitungan: ${clientErrorMessage}. Cek konsol browser dan server untuk detail.` });
    }
  };

  return (
    <div className="container mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold text-center mb-8">Sistem Pengambilan Keputusan (ROC-TOPSIS)</h1>

      <ProjectManagement state={state} setState={setState} resetState={resetState} loadProject={loadProject} />

      {state.projectId && (
        <>
          <div className="mb-4 text-center text-xl font-semibold text-gray-800">
            Proyek Aktif: <span className="text-blue-700">{state.projectName}</span> ({state.projectId})
            <button
              onClick={() => resetState(false)}
              className="ml-4 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
            >
              Ganti Proyek
            </button>
          </div>

          <InputModeSelector state={state} setInputMode={setInputMode} />

          {state.inputMode === "csv" && <CsvInput state={state} setState={setState} processFinalData={processFinalData} />}
          {state.inputMode === "manual" && <ManualInput state={state} setState={setState} processFinalData={processFinalData} />}

          <QualitativeMapper state={state} setState={setState} convertMatrixAfterMapping={convertMatrixAfterMapping} />

          <CriteriaConfig state={state} setState={setState} />

          <CalculationRunner state={state} setState={setState} handleCalculate={handleCalculate} handleSaveProject={handleSaveProject} />

          <ResultsDisplay state={state} />
        </>
      )}
    </div>
  );
}