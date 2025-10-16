// @/components/pages/home/ProjectManagement.tsx
"use client";

import React from "react";
import { useProjectState } from "@/app/hooks/useProjectState";

interface Props {
  state: ReturnType<typeof useProjectState>["state"];
  setState: ReturnType<typeof useProjectState>["setState"];
  resetState: ReturnType<typeof useProjectState>["resetState"];
  loadProject: ReturnType<typeof useProjectState>["loadProject"];
}

export const ProjectManagement: React.FC<Props> = ({ state, setState, resetState, loadProject }) => {
  const { projectName, showLoadProjectModal, savedProjects, loadProjectError, uploadError } = state;

  const handleCreateNewProject = async () => {
    if (!projectName.trim()) {
      alert("Nama proyek tidak boleh kosong!");
      return;
    }
    setState({ uploadError: null });

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName.trim(),
          projectData: {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal membuat proyek baru.");
      }

      const newProj = await response.json();
      resetState(true);
      setState({ projectName: newProj.name, projectId: newProj.id });

      alert(`Proyek "${newProj.name}" berhasil dibuat dan siap diisi!`);
    } catch (error: unknown) {
      console.error("Error creating new project:", error);
      let clientErrorMessage = "Gagal membuat proyek baru.";
      if (error instanceof Error) clientErrorMessage = error.message;
      setState({ uploadError: clientErrorMessage });
    }
  };

  const fetchSavedProjects = async () => {
    setState({ loadProjectError: null });
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal memuat daftar proyek.");
      }
      const data = await response.json();
      setState({ savedProjects: data });
    } catch (error: unknown) {
      console.error("Error fetching saved projects:", error);
      let clientErrorMessage = "Gagal memuat daftar proyek.";
      if (error instanceof Error) clientErrorMessage = error.message;
      setState({ loadProjectError: clientErrorMessage });
    }
  };

  const handleOpenLoadProjectModal = () => {
    fetchSavedProjects();
    setState({ showLoadProjectModal: true });
  };

  const handleSelectAndLoadProject = async (id: string) => {
    setState({ loadProjectError: null });
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal memuat detail proyek.");
      }
      const project = await response.json();

      loadProject(project.data);
      setState({ projectName: project.name, projectId: project.id, showLoadProjectModal: false });

      alert(`Proyek "${project.name}" berhasil dimuat!`);
    } catch (error: unknown) {
      console.error(`Error loading project ${id}:`, error);
      let clientErrorMessage = "Gagal memuat proyek.";
      if (error instanceof Error) clientErrorMessage = error.message;
      setState({ loadProjectError: clientErrorMessage });
    }
  };

  return (
    <section className="mb-8 p-6 border border-gray-300 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4">Manajemen Proyek</h2>
      <div className="flex items-center mb-4">
        <label htmlFor="project-name" className="mr-3 font-bold text-gray-700">
          Nama Proyek:
        </label>
        <input
          type="text"
          id="project-name"
          value={projectName}
          onChange={(e) => setState({ projectName: e.target.value })}
          className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Masukkan nama proyek Anda"
        />
      </div>
      <div className="flex justify-center gap-4">
        <button
          onClick={handleCreateNewProject}
          className="px-6 py-3 text-lg font-semibold rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200"
        >
          Mulai Proyek Baru
        </button>
        <button
          onClick={handleOpenLoadProjectModal}
          className="px-6 py-3 text-lg font-semibold rounded-full bg-teal-600 text-white shadow-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-75 transition duration-200"
        >
          Muat Proyek
        </button>
      </div>
      {uploadError && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p className="font-bold">Error Manajemen Proyek:</p>
          <p>{uploadError}</p>
        </div>
      )}

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
                          onClick={() => handleSelectAndLoadProject(proj.id)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                        >
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
                onClick={() => setState({ showLoadProjectModal: false })}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
