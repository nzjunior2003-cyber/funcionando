import React from 'react';

// Classes e componentes reutilizados de forma idêntica entre DfdForm, EtpForm,
// RiscoForm, OrcamentoForm e TrBensForm. Extraídos aqui apenas para remover
// duplicação — nenhuma classe/markup foi alterada em relação ao original.

export const inputClasses = "w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400";

export const cargoOptions = [
    'SD QBM', 'CB QBM', '3° SGT QBM', '2° SGT QBM', '1° SGT QBM', 'ST QBM',
    '2° TEN QOBM', '2° TEN QOABM', '1° TEN QOBM', '1° TEN QOABM',
    'CAP QOBM', 'CAP QOABM', 'MAJ QOBM', 'MAJ QOABM',
    'TCEL QOBM', 'CEL QOBM', 'CEL QOCBM', 'CEL QOSBM'
];

export const parseCurrency = (value: string): number => {
  // Remove tudo que não é dígito ou vírgula, remove pontos de milhar, troca vírgula por ponto
  const cleanValue = value
    .replace(/[^\d,]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleanValue) || 0;
};

export const formatCurrencyInput = (value: number): string => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const Field: React.FC<{ label: string, required?: boolean, children: React.ReactNode, note?: string }> = ({ label, required, children, note }) => (
    <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
        {note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{note}</p>}
    </div>
);

// Variante simples de Section, usada em DfdForm e RiscoForm (sem tooltip de instrução).
export const SectionSimple: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 dark:bg-gray-700/50 dark:border-gray-600">
        <h2 className="text-xl font-bold text-cbmpa-red mb-4 pb-2 border-b-2 border-cbmpa-red">{title}</h2>
        {children}
    </div>
);

export const Help: React.FC<{ instruction: string }> = ({ instruction }) => {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative inline-block ml-2" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button
        type="button"
        className="text-gray-400 hover:text-cbmpa-red focus:outline-none"
        aria-label="Ajuda"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </button>
      {show && (
        <div className="absolute z-10 bottom-full right-0 mb-2 w-80 p-3 text-sm font-normal text-left text-gray-600 bg-white border border-gray-200 rounded-lg shadow-xl dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Instrução de Preenchimento</h3>
          {instruction}
        </div>
      )}
    </div>
  );
};

// Variante de Section com tooltip de instrução, usada em EtpForm e TrBensForm.
export const SectionWithHelp: React.FC<{ title: string, children: React.ReactNode, instruction?: string }> = ({ title, children, instruction }) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 dark:bg-gray-700/50 dark:border-gray-600">
        <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-cbmpa-red">
            <h2 className="text-xl font-bold text-cbmpa-red">{title}</h2>
            {instruction && <Help instruction={instruction} />}
        </div>
        {children}
    </div>
);
