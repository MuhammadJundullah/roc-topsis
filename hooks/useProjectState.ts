// hooks/useProjectState.ts
import { useState, useCallback } from 'react';
import { CriteriaType, RankingResult, QualitativeMapping, RawDataRow } from '@/types';

// Define the structure of your project state
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
  projectName: string;
  projectId: string | null;
  showLoadProjectModal: boolean;
  savedProjects: { id: string; name: string; createdAt: string; updatedAt: string }[];
  loadProjectError: string | null;
  rankingResults: RankingResult[] | null;
  uploadError: string | null;
}

// Initial state for the project
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
  projectName: "",
  projectId: null,
  showLoadProjectModal: false,
  savedProjects: [],
  loadProjectError: null,
  rankingResults: null,
  uploadError: null,
});

export const useProjectState = () => {
  const [state, setStateInternal] = useState<ProjectDataType>(getInitialProjectDataState());

  // Custom setState to merge partial updates
  const setState = useCallback((newState: Partial<ProjectDataType>) => {
    setStateInternal(prevState => ({ ...prevState, ...newState }));
  }, []);

  const resetState = useCallback((keepProjectNameAndId: boolean = false) => {
    setStateInternal(prevState => {
      const initialData = getInitialProjectDataState();
      if (keepProjectNameAndId) {
        return {
          ...initialData,
          projectName: prevState.projectName,
          projectId: prevState.projectId,
        };
      }
      return initialData;
    });
  }, []);

  const loadProject = useCallback((data: ProjectDataType) => {
    setStateInternal(data);
  }, []);

  const setInputMode = useCallback((mode: "manual" | "csv") => {
    setStateInternal(prevState => ({ ...prevState, inputMode: mode }));
  }, []);

  return {
    state,
    setState,
    resetState,
    loadProject,
    setInputMode,
  };
};
