// @/hooks/useProjectState.ts
import { useReducer, useCallback } from "react";
import {
  CriteriaType,
  RankingResult,
  QualitativeMapping,
  RawDataRow,
} from "@/types";

// --- START: Define ProjectDataType (untuk menyimpan semua state aplikasi) ---
export interface ProjectDataType {
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
  rankingResults: RankingResult[] | null;
  uploadError: string | null;
  projectName: string;
  projectId: string | null;
  showLoadProjectModal: boolean;
  savedProjects: { id: string; name: string; createdAt: string; updatedAt: string }[];
  loadProjectError: string | null;
}
// --- END: Define ProjectDataType ---

// Untuk input manual
export interface ManualDataRow {
  id: number;
  alternativeName: string;
  [key: string]: string | number; // Kriteria bisa string (untuk input awal) atau number
}

// Fungsi untuk mendapatkan initial/empty state yang konsisten
export const getInitialProjectDataState = (): ProjectDataType => ({
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
  rankingResults: null,
  uploadError: null,
  projectName: "",
  projectId: null,
  showLoadProjectModal: false,
  savedProjects: [],
  loadProjectError: null,
});

// --- Action Types ---
type Action =
  | { type: "SET_STATE"; payload: Partial<ProjectDataType> }
  | { type: "RESET_STATE"; payload?: { keepProjectNameAndId?: boolean } }
  | { type: "LOAD_PROJECT"; payload: ProjectDataType }
  | { type: "SET_INPUT_MODE"; payload: "manual" | "csv" };

// --- Reducer ---
const projectReducer = (
  state: ProjectDataType,
  action: Action
): ProjectDataType => {
  switch (action.type) {
    case "SET_STATE":
      return { ...state, ...action.payload };
    case "RESET_STATE":
      const initialState = getInitialProjectDataState();
      if (action.payload?.keepProjectNameAndId) {
        return {
          ...initialState,
          projectName: state.projectName,
          projectId: state.projectId,
        };
      }
      return initialState;
    case "LOAD_PROJECT":
      return {
        ...state,
        ...action.payload,
        rankingResults: null,
        uploadError: null,
        loadProjectError: null,
      };
    case "SET_INPUT_MODE":
      return {
        ...getInitialProjectDataState(),
        projectName: state.projectName,
        projectId: state.projectId,
        inputMode: action.payload,
      };
    default:
      return state;
  }
};

// --- Custom Hook ---
export const useProjectState = () => {
  const [state, dispatch] = useReducer(
    projectReducer,
    getInitialProjectDataState()
  );

  const setState = useCallback((payload: Partial<ProjectDataType>) => {
    dispatch({ type: "SET_STATE", payload });
  }, []);

  const resetState = useCallback(
    (keepProjectNameAndId: boolean = false) => {
      dispatch({ type: "RESET_STATE", payload: { keepProjectNameAndId } });
    },
    []
  );

  const loadProject = useCallback((payload: ProjectDataType) => {
    dispatch({ type: "LOAD_PROJECT", payload });
  }, []);

  const setInputMode = useCallback((payload: "manual" | "csv") => {
    dispatch({ type: "SET_INPUT_MODE", payload });
  }, []);

  return { state, setState, resetState, loadProject, setInputMode };
};
