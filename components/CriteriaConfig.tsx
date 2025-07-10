// components/CriteriaConfig.tsx
"use client";

import React from 'react';
import { CriteriaType } from '../types'; // Sesuaikan path import type Anda

interface CriteriaConfigProps {
  criteria: string[];
  criteriaTypes: { [key: string]: CriteriaType };
  onCriteriaTypeChange: (critName: string, type: CriteriaType) => void;
  prioritizedCriteria: string[];
  onPriorityChange: (e: React.ChangeEvent<HTMLSelectElement>, index: number) => void;
}

const CriteriaConfig: React.FC<CriteriaConfigProps> = ({
  criteria,
  criteriaTypes,
  onCriteriaTypeChange,
  prioritizedCriteria,
  onPriorityChange,
}) => {
  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">
        3. Konfigurasi Kriteria
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {criteria.map((crit) => (
          <div key={crit} className="p-4 border border-gray-200 rounded-md bg-gray-50">
            <strong className="block mb-2 text-gray-700">{crit}</strong>
            <select
              value={criteriaTypes[crit]}
              onChange={(e) => onCriteriaTypeChange(crit, e.target.value as CriteriaType)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="benefit">Benefit (Lebih tinggi lebih baik)</option>
              <option value="cost">Cost (Lebih rendah lebih baik)</option>
            </select>
          </div>
        ))}
      </div>

      <h3 className="text-xl font-medium mt-8 mb-3">
        Urutan Prioritas Kriteria (untuk ROC):
      </h3>
      <p className="mb-4 text-sm text-gray-600">
        <small>
          Urutkan kriteria dari yang paling penting (Rank 1) ke paling tidak
          penting. Gunakan nama kriteria yang sama persis seperti di data
          Anda. **Setiap kriteria hanya dapat dipilih satu kali.**
        </small>
      </p>
      <div className="flex flex-col gap-3">
        {prioritizedCriteria.map((_crit, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="font-bold text-gray-700">
              Rank {index + 1}:
            </span>
            <select
              value={prioritizedCriteria[index] || ""}
              onChange={(e) => onPriorityChange(e, index)}
              className="flex-grow py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
              {/* Opsi placeholder kosong */}
              <option value="">--- Pilih Kriteria ---</option> {/* <<-- Ini adalah placeholder-nya */}
              {criteria.map((c) => (
                <option
                  key={c}
                  value={c}
                  // Nonaktifkan opsi jika sudah dipilih di dropdown lain, kecuali jika itu adalah pilihan saat ini
                  disabled={prioritizedCriteria.includes(c) && prioritizedCriteria[index] !== c} // <<-- Ini mencegah duplikasi
                >
                  {c}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </>
  );
};

export default CriteriaConfig;