// app/page.tsx
"use client";

import React, { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import ReCAPTCHA from "react-google-recaptcha";
import {
  CriteriaType,
  RankingResult,
  QualitativeMapping,
  RawDataRow,
} from "@/types";
import CriteriaConfig from "@/components/CriteriaConfig";

// --- START: Define ProjectDataType (untuk menyimpan semua state aplikasi) ---
interface ProjectDataType {
  inputMode: "manual" | "csv";
  parsedRawData: RawDataRow[] | null;
  csvHeaders: string[];
  selectedAltCol: string | null;
  selectedCritCols: string[];
  criteria: string[];
  alternatives: string[];
  matrixValues: number[][];
  criteriaTypes: { [key: string]: CriteriaType };
  prioritizedCriteria: string[];
  qualitativeMapping: QualitativeMapping;
  needsQualitativeMapping: boolean;
  manualData: {
    id: number;
    alternativeName: string;
    [key: string]: string | number;
  }[];
  manualCriteriaNames: string[];
}
// --- END: Define ProjectDataType ---

// Untuk input manual
interface ManualDataRow {
  id: number;
  alternativeName: string;
  [key: string]: string | number; // Kriteria bisa string (untuk input awal) atau number
}

// Fungsi untuk mendapatkan initial/empty state yang konsisten
const getInitialProjectDataState = (): ProjectDataType => ({
  inputMode: "csv",
  parsedRawData: null,
  csvHeaders: [],
  selectedAltCol: null,
  selectedCritCols: [],
  criteria: [],
  alternatives: [],
  matrixValues: [],
  criteriaTypes: {},
  prioritizedCriteria: [],
  qualitativeMapping: {},
  needsQualitativeMapping: false,
  manualData: [{ id: Date.now(), alternativeName: "" }],
  manualCriteriaNames: [],
});

export default function HomePage() {
  // --- START: States ---
  // Menggunakan satu state untuk data proyek utama bisa lebih rapi, tapi memerlukan update objek
  // Untuk granularity, tetap pakai state terpisah atau gunakan useReducer
  // Contoh dengan state terpisah untuk memudahkan pemahaman langsung
  const [inputMode, setInputMode] = useState<"manual" | "csv">("csv");
  const [parsedRawData, setParsedRawData] = useState<RawDataRow[] | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [selectedAltCol, setSelectedAltCol] = useState<string | null>(null);
  const [selectedCritCols, setSelectedCritCols] = useState<string[]>([]);

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

  // State untuk input manual
  const [manualData, setManualData] = useState<ManualDataRow[]>([
    { id: Date.now(), alternativeName: "" },
  ]);
  const [manualCriteriaNames, setManualCriteriaNames] = useState<string[]>([]);
  const nextManualRowId = useRef(Date.now());

  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  // States & Handlers for Project History
  const [projectName, setProjectName] = useState<string>("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [showLoadProjectModal, setShowLoadProjectModal] = useState(false);
  const [savedProjects, setSavedProjects] = useState<
    { id: string; name: string; createdAt: string; updatedAt: string }[]
  >([]);
  const [loadProjectError, setLoadProjectError] = useState<string | null>(null);
  // --- END: States ---

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Menggunakan useCallback untuk memoize fungsi agar tidak re-create setiap render
  const resetAllDataStates = useCallback(
    (keepProjectNameAndId: boolean = false) => {
      const initialData = getInitialProjectDataState();
      setInputMode(initialData.inputMode);
      setParsedRawData(initialData.parsedRawData);
      setCsvHeaders(initialData.csvHeaders);
      setSelectedAltCol(initialData.selectedAltCol);
      setSelectedCritCols(initialData.selectedCritCols);
      setCriteria(initialData.criteria);
      setAlternatives(initialData.alternatives);
      setMatrixValues(initialData.matrixValues);
      setCriteriaTypes(initialData.criteriaTypes);
      setPrioritizedCriteria(initialData.prioritizedCriteria);
      setQualitativeMapping(initialData.qualitativeMapping);
      setNeedsQualitativeMapping(initialData.needsQualitativeMapping);
      setManualData(initialData.manualData);
      setManualCriteriaNames(initialData.manualCriteriaNames);
      nextManualRowId.current = Date.now(); // Reset ID generator

      setRankingResults(null);
      setUploadError(null);
      setLoadProjectError(null);

      if (!keepProjectNameAndId) {
        setProjectName("");
        setProjectId(null);
      }
    },
    []
  ); // Dependensi kosong karena getInitialProjectDataState tidak berubah

  const handleNewProject = () => {
    resetAllDataStates(false); // Reset semua data dan state, termasuk nama/ID proyek
  };

  const getProjectDataToSave = useCallback(
    (): ProjectDataType => ({
      inputMode,
      parsedRawData,
      csvHeaders,
      selectedAltCol,
      selectedCritCols,
      criteria,
      alternatives,
      matrixValues,
      criteriaTypes,
      prioritizedCriteria,
      qualitativeMapping,
      needsQualitativeMapping,
      manualData,
      manualCriteriaNames,
    }),
    [
      inputMode,
      parsedRawData,
      csvHeaders,
      selectedAltCol,
      selectedCritCols,
      criteria,
      alternatives,
      matrixValues,
      criteriaTypes,
      prioritizedCriteria,
      qualitativeMapping,
      needsQualitativeMapping,
      manualData,
      manualCriteriaNames,
    ]
  );

  const loadProjectData = useCallback((data: ProjectDataType) => {
    setInputMode(data.inputMode);
    setParsedRawData(data.parsedRawData);
    setCsvHeaders(data.csvHeaders || []);
    setSelectedAltCol(data.selectedAltCol || null);
    setSelectedCritCols(data.selectedCritCols || []);
    setCriteria(data.criteria || []);
    setAlternatives(data.alternatives || []);
    setMatrixValues(data.matrixValues || []);
    setCriteriaTypes(data.criteriaTypes || {});
    setPrioritizedCriteria(data.prioritizedCriteria || []);
    setQualitativeMapping(data.qualitativeMapping || {});
    setNeedsQualitativeMapping(data.needsQualitativeMapping || false);
    setManualData(data.manualData || [{ id: Date.now(), alternativeName: "" }]);
    setManualCriteriaNames(data.manualCriteriaNames || []);

    setRankingResults(null);
    setUploadError(null);
    setLoadProjectError(null);
  }, []);

  const handleCreateNewProject = async () => {
    if (!projectName.trim()) {
      alert("Nama proyek tidak boleh kosong!");
      return;
    }
    setUploadError(null);

    try {
      const initialProjectData: ProjectDataType = getInitialProjectDataState(); // Gunakan fungsi helper
      initialProjectData.manualData[0].id = Date.now(); // Pastikan ID baris manual unik saat inisialisasi

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName.trim(),
          projectData: initialProjectData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal membuat proyek baru.");
      }

      const newProj = await response.json();
      // Reset semua data state ke kondisi awal untuk proyek baru, lalu set nama/ID baru
      resetAllDataStates(true); // Reset semua kecuali nama/ID proyek
      setProjectName(newProj.name); // Pastikan nama dan ID terisi
      setProjectId(newProj.id);

      alert(`Proyek "${newProj.name}" berhasil dibuat dan siap diisi!`);
    } catch (error: unknown) {
      console.error("Error creating new project:", error);
      let clientErrorMessage = "Gagal membuat proyek baru.";
      if (error instanceof Error) clientErrorMessage = error.message;
      setUploadError(clientErrorMessage);
    }
  };

  const handleSaveProject = async () => {
    if (!projectName.trim()) {
      alert("Nama proyek tidak boleh kosong!");
      return;
    }
    if (!projectId) {
      alert(
        "Tidak ada proyek yang sedang aktif untuk disimpan. Harap mulai proyek baru atau muat proyek."
      );
      return;
    }
    // Periksa apakah ada data relevan (matrixValues ATAU raw data yang siap diproses)
    const hasMeaningfulData =
      matrixValues.length > 0 ||
      (inputMode === "csv" &&
        parsedRawData &&
        selectedAltCol &&
        selectedCritCols.length > 0) ||
      (inputMode === "manual" &&
        manualData.length > 0 &&
        manualData[0].alternativeName.trim() !== "");

    if (!hasMeaningfulData) {
      alert(
        "Tidak ada data proyek untuk disimpan! Harap input data terlebih dahulu."
      );
      return;
    }

    setUploadError(null);

    try {
      const projectData = getProjectDataToSave();

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, projectData }),
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
      setUploadError(clientErrorMessage);
    }
  };

  const fetchSavedProjects = async () => {
    setLoadProjectError(null);
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal memuat daftar proyek.");
      }
      const data = await response.json();
      setSavedProjects(data);
    } catch (error: unknown) {
      console.error("Error fetching saved projects:", error);
      let clientErrorMessage = "Gagal memuat daftar proyek.";
      if (error instanceof Error) clientErrorMessage = error.message;
      setLoadProjectError(clientErrorMessage);
    }
  };

  const handleOpenLoadProjectModal = () => {
    fetchSavedProjects();
    setShowLoadProjectModal(true);
  };

  const handleSelectAndLoadProject = async (id: string) => {
    setLoadProjectError(null);
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal memuat detail proyek.");
      }
      const project = await response.json();

      setProjectName(project.name);
      setProjectId(project.id);
      loadProjectData(project.data as ProjectDataType);
      setShowLoadProjectModal(false);
      alert(`Proyek "${project.name}" berhasil dimuat!`);
    } catch (error: unknown) {
      console.error(`Error loading project ${id}:`, error);
      let clientErrorMessage = "Gagal memuat proyek.";
      if (error instanceof Error) clientErrorMessage = error.message;
      setLoadProjectError(clientErrorMessage);
    }
  };

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
        if (!alternativeName || alternativeName.toString().trim() === "")
          return;

        newAlternatives.push(alternativeName.toString().trim()); // Pastikan string dan trim
        const currentRowValues: (number | string)[] = [];

        critCols.forEach((crit) => {
          const value = row[crit];
          const numericValue = parseFloat(value as string); // Pastikan value adalah string
          // Periksa apakah value valid, tidak hanya NaN
          if (
            value === undefined ||
            value === null ||
            value.toString().trim() === "" ||
            isNaN(numericValue)
          ) {
            hasQualitativeData = true;
            if (
              value !== undefined &&
              value !== null &&
              value.toString().trim() !== ""
            ) {
              const trimmedValue = value.toString().trim();
              if (
                !newQualitativeMapping[crit].uniqueValues.includes(trimmedValue)
              ) {
                newQualitativeMapping[crit].uniqueValues.push(trimmedValue);
                newQualitativeMapping[crit].mapping[trimmedValue] = "";
              }
            }
            currentRowValues.push(
              value !== undefined && value !== null
                ? value.toString().trim()
                : ""
            );
          } else {
            currentRowValues.push(numericValue);
          }
        });
        newMatrixValuesTemp.push(currentRowValues); // Simpan currentRowValues, bukan currentRowNumericValues
      });

      setAlternatives(newAlternatives);
      setCriteria(critCols);
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
      setPrioritizedCriteria(Array(critCols.length).fill(""));
      setUploadError(null);
    },
    []
  ); // Dependensi ini bisa lebih kompleks jika ada state lain yang mempengaruhi

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetAllDataStates(true); // Reset semua data lama, tapi jaga nama/ID proyek

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

        setParsedRawData(results.data as RawDataRow[]);
        setCsvHeaders(headers);

        setSelectedAltCol(null);
        setSelectedCritCols([]);
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        setUploadError(
          `Gagal membaca file CSV: ${error.message}. Pastikan formatnya benar.`
        );
      },
    });
  };

  const handleColumnSelectionConfirm = useCallback(() => {
    if (!parsedRawData) {
      setUploadError("Harap unggah file CSV terlebih dahulu.");
      return;
    }
    if (!selectedAltCol) {
      setUploadError("Harap pilih kolom untuk nama alternatif.");
      return;
    }
    if (selectedCritCols.length === 0) {
      setUploadError("Harap pilih setidaknya satu kolom kriteria.");
      return;
    }

    // Filter data agar hanya berisi kolom yang dipilih
    const filteredData: RawDataRow[] = parsedRawData.map((row) => {
      const newRow: RawDataRow = { [selectedAltCol]: row[selectedAltCol] };
      selectedCritCols.forEach((critCol) => {
        newRow[critCol] = row[critCol];
      });
      return newRow;
    });

    processFinalData(filteredData, selectedAltCol, selectedCritCols);
  }, [parsedRawData, selectedAltCol, selectedCritCols, processFinalData]);

  const handleAddManualRow = useCallback(() => {
    setManualData((prev) => {
      const newRow: ManualDataRow = {
        id: nextManualRowId.current++,
        alternativeName: "",
      };
      manualCriteriaNames.forEach((critName) => {
        newRow[critName] = "";
      });
      return [...prev, newRow];
    });
  }, [manualCriteriaNames]);

  const handleDeleteManualRow = useCallback((id: number) => {
    setManualData((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const handleManualRowChange = useCallback(
    (id: number, field: string, value: string | number) => {
      setManualData((prev) =>
        prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
      );
    },
    []
  );

  const handleManualCriteriaNameChange = useCallback(
    (index: number, newName: string) => {
      setManualCriteriaNames((prev) => {
        const updatedNames = [...prev];
        updatedNames[index] = newName;
        return updatedNames;
      });
    },
    []
  );

  const handleAddManualCriteria = useCallback(() => {
    const newCritName = `Kriteria ${manualCriteriaNames.length + 1}`;
    setManualCriteriaNames((prev) => [...prev, newCritName]);
    setManualData((prev) =>
      prev.map((row) => {
        return { ...row, [newCritName]: "" }; // Inisialisasi dengan string kosong
      })
    );
  }, [manualCriteriaNames]);

  const handleRemoveManualCriteria = useCallback(() => {
    if (manualCriteriaNames.length === 0) return;
    const lastCrit = manualCriteriaNames[manualCriteriaNames.length - 1];
    setManualCriteriaNames((prev) => prev.slice(0, -1));
    setManualData((prev) =>
      prev.map((row) => {
        const newRow = { ...row };
        delete newRow[lastCrit];
        return newRow;
      })
    );
  }, [manualCriteriaNames]);

  const handleManualDataConfirm = useCallback(() => {
    if (
      manualData.length === 0 ||
      manualData.some((row) => row.alternativeName.trim() === "")
    ) {
      setUploadError(
        "Harap masukkan setidaknya satu nama alternatif yang tidak kosong."
      );
      return;
    }
    if (manualCriteriaNames.length === 0) {
      setUploadError(
        "Harap masukkan setidaknya satu nama kriteria untuk input manual."
      );
      return;
    }

    if (manualCriteriaNames.some((name) => name.trim() === "")) {
      setUploadError("Nama kriteria manual tidak boleh kosong.");
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
  }, [manualData, manualCriteriaNames, processFinalData]);

  const handleQualitativeMapChange = useCallback(
    (criteriaName: string, qualitativeValue: string, numericValue: string) => {
      setQualitativeMapping((prev) => {
        const newMapping = { ...prev };
        if (newMapping[criteriaName]) {
          newMapping[criteriaName].mapping[qualitativeValue] =
            numericValue === "" ? "" : parseFloat(numericValue);
        }
        return newMapping;
      });
    },
    []
  );

  const convertMatrixAfterMapping = useCallback((): boolean => {
    const sourceData =
      inputMode === "csv"
        ? parsedRawData
        : inputMode === "manual"
        ? manualData.map((row) => {
            const obj: RawDataRow = {
              Alternatif: row.alternativeName.toString().trim(),
            };
            manualCriteriaNames.forEach((critName) => {
              obj[critName] = row[critName]?.toString().trim() || "";
            });
            return obj;
          })
        : null;

    if (!sourceData || sourceData.length === 0) {
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

        const parsedNum = parseFloat(rawValue as string); // Pastikan rawValue adalah string
        if (!isNaN(parsedNum)) {
          numericVal = parsedNum;
        } else {
          const mappedVal =
            qualitativeMapping[crit]?.mapping[rawValue.toString().trim()];
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
  }, [
    inputMode,
    parsedRawData,
    manualData,
    manualCriteriaNames,
    criteria,
    qualitativeMapping,
  ]);

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
      alert(
        "Harap lengkapi semua pemetaan nilai kualitatif ke kuantitatif sebelum melanjutkan."
      );
      return;
    }

    const conversionSuccessful = convertMatrixAfterMapping();

    if (conversionSuccessful) {
      // Logic will proceed automatically as needsQualitativeMapping becomes false
    }
  }, [qualitativeMapping, convertMatrixAfterMapping]);

  const handleCriteriaTypeChange = useCallback(
    (critName: string, type: CriteriaType) => {
      setCriteriaTypes((prev) => ({ ...prev, [critName]: type }));
    },
    []
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
      setPrioritizedCriteria(newPriority);
    },
    [criteria, prioritizedCriteria]
  );

    const handleCalculate = async () => {
    setRankingResults(null);
    setUploadError(null);

    if (!recaptchaToken) {
      setUploadError("Please complete the reCAPTCHA challenge.");
      return;
    }

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
          recaptchaToken, // Include the reCAPTCHA token
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

  console.log("ReCAPTCHA Site Key:", process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);

  // --- Render UI ---
  return (
    <div className="container mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold text-center mb-8">
        Sistem Pengambilan Keputusan (ROC-TOPSIS)
      </h1>

      <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-semibold mb-4">Verifikasi Keamanan</h2>
        <div className="flex justify-center">
          <ReCAPTCHA
            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
            onChange={(token) => setRecaptchaToken(token)}
          />
        </div>
      </section>

      {/* Bagian Manajemen Proyek: Selalu Tampil di Awal */}
      <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Manajemen Proyek</h2>
        <div className="flex items-center mb-4">
          <label
            htmlFor="project-name"
            className="mr-3 font-bold text-gray-700">
            Nama Proyek:
          </label>
          <input
            type="text"
            id="project-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Masukkan nama proyek Anda"
          />
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={handleCreateNewProject}
            className="px-6 py-3 text-lg font-semibold rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200">
            Mulai Proyek Baru
          </button>
          <button
            onClick={handleOpenLoadProjectModal}
            className="px-6 py-3 text-lg font-semibold rounded-full bg-teal-600 text-white shadow-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-75 transition duration-200">
            Muat Proyek
          </button>
        </div>
        {uploadError && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <p className="font-bold">Error Manajemen Proyek:</p>
            <p>{uploadError}</p>
          </div>
        )}
      </section>

      {/* Modal Daftar Proyek */}
      {showLoadProjectModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 md:w-2/3 lg:w-1/2 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Daftar Proyek Tersimpan</h2>
            {loadProjectError && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md mb-4">
                {loadProjectError}
              </div>
            )}
            {savedProjects.length === 0 ? (
              <p>Tidak ada proyek tersimpan.</p>
            ) : (
              <table className="min-w-full bg-white border border-gray-200 rounded-md">
                <thead>
                  <tr>
                    <th className="py-2 px-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold">
                      Nama Proyek
                    </th>
                    <th className="py-2 px-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold">
                      Tanggal Simpan
                    </th>
                    <th className="py-2 px-3 border-b-2 border-gray-200 bg-gray-100">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {savedProjects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 border-b border-gray-200 text-sm">
                        {proj.name}
                      </td>
                      <td className="py-2 px-3 border-b border-gray-200 text-sm">
                        {new Date(proj.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3 border-b border-gray-200 text-center">
                        <button
                          onClick={() =>
                            handleSelectAndLoadProject(proj.id)
                          }
                          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm">
                          Muat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="text-right mt-4">
              <button
                onClick={() => setShowLoadProjectModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Konten Utama Aplikasi: Tampil hanya jika projectId sudah ada */}
      {projectId && (
        <>
          <div className="mb-4 text-center text-xl font-semibold text-gray-800">
            Proyek Aktif: <span className="text-blue-700">{projectName}</span> (
            {projectId})
            <button
              onClick={() => {
                handleNewProject(); // Reset project details
                // Optional: if you want to also clear current screen data, call resetAllDataStates(false)
              }}
              className="ml-4 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300">
              Ganti Proyek
            </button>
          </div>

          {/* Bagian Pilih Mode Input Data */}
          <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md text-center">
            <h2 className="text-2xl font-semibold mb-4">
              1. Pilih Mode Input Data
            </h2>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  resetAllDataStates(true);
                  setInputMode("csv");
                }}
                className={`px-6 py-3 text-lg font-semibold rounded-full transition duration-200 ${
                  inputMode === "csv"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}>
                Upload File CSV
              </button>
              <button
                onClick={() => {
                  resetAllDataStates(true);
                  setInputMode("manual");
                }}
                className={`px-6 py-3 text-lg font-semibold rounded-full transition duration-200 ${
                  inputMode === "manual"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}>
                Input Data Manual
              </button>
            </div>
          </section>

          {/* Bagian Input CSV */}
          {inputMode === "csv" && (
            <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4">
                2. Unggah File CSV
              </h2>
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
                  Unggah file CSV Anda. Kolom pertama biasanya adalah nama
                  alternatif.
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

              {/* Tampilkan pemilihan kolom hanya jika ada parsedRawData dan belum dikonfirmasi */}
              {parsedRawData &&
                csvHeaders.length > 0 &&
                criteria.length === 0 && (
                  <div className="mt-6">
                    <h3 className="text-xl font-medium mb-3">
                      3. Pilih Kolom Data
                    </h3>
                    <div className="mb-4">
                      <label
                        htmlFor="alt-col-select"
                        className="block text-gray-700 text-sm font-bold mb-2">
                        Kolom Nama Alternatif:
                      </label>
                      <select
                        id="alt-col-select"
                        value={selectedAltCol || ""}
                        onChange={(e) => setSelectedAltCol(e.target.value)}
                        className="block w-full mt-1 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
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
                          <label
                            key={header}
                            className="inline-flex items-center">
                            <input
                              type="checkbox"
                              value={header}
                              checked={selectedCritCols.includes(header)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCritCols((prev) => [
                                    ...prev,
                                    header,
                                  ]);
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
                        className="px-6 py-3 text-lg font-semibold rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200">
                        Konfirmasi Pilihan Kolom
                      </button>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-xl font-medium mb-3">
                        Pratinjau Data Asli:
                      </h3>
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
              <h2 className="text-2xl font-semibold mb-4">
                2. Input Data Manual
              </h2>
              <div className="mb-4">
                <button
                  onClick={handleAddManualCriteria}
                  className="mr-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                  Tambah Kolom Kriteria
                </button>
                <button
                  onClick={handleRemoveManualCriteria}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
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
                          className="py-2 px-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <input
                            type="text"
                            value={critName}
                            onChange={(e) =>
                              handleManualCriteriaNameChange(
                                index,
                                e.target.value
                              )
                            }
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
                            onChange={(e) =>
                              handleManualRowChange(
                                row.id,
                                "alternativeName",
                                e.target.value
                              )
                            }
                            className="w-full p-1 border border-gray-300 rounded"
                            placeholder="Nama Alternatif"
                          />
                        </td>
                        {manualCriteriaNames.map((critName, index) => (
                          <td
                            key={index}
                            className="py-2 px-3 border-b border-gray-200 text-sm text-gray-800">
                            <input
                              type="text"
                              value={row[critName]?.toString() || ""}
                              onChange={(e) =>
                                handleManualRowChange(
                                  row.id,
                                  critName,
                                  e.target.value
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
                            className="text-red-500 hover:text-red-700">
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
                  className="mr-4 px-6 py-3 text-lg font-semibold rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700">
                  Tambah Baris Alternatif
                </button>
                <button
                  onClick={handleManualDataConfirm}
                  className="px-6 py-3 text-lg font-semibold rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700">
                  Konfirmasi Data Manual
                </button>
              </div>
            </section>
          )}

          {/* Bagian Pemetaan Nilai Kualitatif */}
          {criteria.length > 0 && needsQualitativeMapping ? (
            <section className="mb-8 p-6 border border-yellow-300 bg-yellow-50 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4 text-yellow-800">
                {inputMode === "csv" ? "4." : "3."} Pemetaan Nilai Kualitatif
              </h2>
              <p className="mb-4 text-yellow-700">
                Kami mendeteksi nilai non-angka pada beberapa kriteria. Harap
                tentukan nilai kuantitatif untuk setiap nilai kualitatif di
                bawah ini.
              </p>
              {Object.keys(qualitativeMapping).map((critName) => {
                const qualData = qualitativeMapping[critName];
                // Hanya tampilkan jika ada nilai unik yang perlu dipetakan
                if (
                  qualData.uniqueValues.length === 0 ||
                  qualData.uniqueValues.every(
                    (val) =>
                      qualData.mapping[val] !== "" &&
                      !isNaN(qualData.mapping[val] as number)
                  )
                )
                  return null;

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

          {/* Bagian Konfigurasi Kriteria (Hanya tampil jika matriks sudah dikonversi & tidak ada pemetaan tertunda) */}
          {matrixValues.length > 0 && !needsQualitativeMapping && (
            <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4">
                {inputMode === "csv" ? "5." : "4."} Konfigurasi Kriteria
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

          {/* Bagian Tombol Simpan & Hitung (Hanya tampil jika matriks sudah dikonversi & tidak ada pemetaan tertunda) */}
          {matrixValues.length > 0 && !needsQualitativeMapping && (
            <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md text-center">
              <h2 className="text-2xl font-semibold mb-4">
                {inputMode === "csv" ? "6." : "5."} Simpan & Hitung Ranking
              </h2>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleSaveProject}
                  className="px-6 py-3 text-lg font-semibold rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition duration-200">
                  {projectId ? "Simpan Proyek" : "Simpan Proyek"}
                </button>
                <button
                  onClick={handleCalculate}
                  className="px-6 py-3 text-lg font-semibold rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200">
                  Mulai Perhitungan ROC & TOPSIS
                </button>
              </div>
            </section>
          )}

          {/* Bagian Hasil Ranking */}
          {rankingResults && (
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
          )}
        </>
      )}
      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>
          This site is protected by reCAPTCHA and the Google
          <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer"> Privacy Policy</a> and
          <a href="https://policies.google.com/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer"> Terms of Service</a> apply.
        </p>
      </footer>
    </div>
  );
}
 