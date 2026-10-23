import React from 'react';
import { TrCommonData } from '../../types';

export const SIGILOSO_TEXT_PADRAO = "O custo estimado da contratação possui caráter sigiloso e será tornado público apenas e imediatamente após o julgamento das propostas. Quando as propostas permanecerem com preços acima do orçamento estimado, o custo estimado da contratação será tornado público após a fase de lances.";

export const Checkbox: React.FC<{ name: string, value: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, children: React.ReactNode }> = ({ name, value, checked, onChange, children }) => (
    <div className="flex items-start">
        <input type="checkbox" id={`${name}-${value.replace(/\s/g, '')}`} name={name} value={value} checked={checked} onChange={onChange} className="mr-2 h-4 w-4 mt-1 flex-shrink-0"/>
        <label htmlFor={`${name}-${value.replace(/\s/g, '')}`} className="dark:text-gray-300 leading-tight">{children}</label>
    </div>
);

export const RadioGroup: React.FC<{ name: string, value: string, options: {val: string, label: string}[], onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ name, value, options, onChange }) => (
    <div className="flex flex-col gap-y-2">
        {options.map(opt => (
            <div key={opt.val} className="flex items-start">
                <input type="radio" id={`${name}-${opt.val}`} name={name} value={opt.val} checked={value === opt.val} onChange={onChange} className="mr-2 h-4 w-4 mt-1 flex-shrink-0"/>
                <label htmlFor={`${name}-${opt.val}`} className="dark:text-gray-300">{opt.label}</label>
            </div>
        ))}
    </div>
);

export type TrSetData = React.Dispatch<React.SetStateAction<any>>;

// Manipuladores genéricos de formulário compartilhados por todos os TRs.
export const useTrHandlers = (setData: TrSetData) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSigilosoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setData((prev: any) => ({
        ...prev,
        orcamentoSigiloso: val,
        justificativaOrcamentoSigiloso: val === 'sim' ? SIGILOSO_TEXT_PADRAO : ''
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    setData((prev: any) => {
        const field = name as keyof TrCommonData;
        const prevValue = (prev[field] as string[]) || [];
        const newValue = checked ? [...prevValue, value] : prevValue.filter(v => v !== value);
        
        const updates: Partial<TrCommonData> = { [field]: newValue };
        
        if (value === 'inexigibilidade' && !checked) updates.inexigibilidadeInciso = '';
        if (value === 'dispensa_art75' && !checked) updates.dispensaInciso = '';
        
        return { ...prev, ...updates };
    });
  };

  const handleJustificationChange = (key: string, value: string) => {
    setData((prev: any) => ({
        ...prev,
        qualificacoesTecnicasJustificativas: {
            ...prev.qualificacoesTecnicasJustificativas,
            [key]: value
        }
    }));
  };
  return { handleChange, handleSigilosoChange, handleCheckboxChange, handleJustificationChange };
};

export type TrHandlers = ReturnType<typeof useTrHandlers>;

export interface TrFormProps {
  data: TrCommonData;
  setData: TrSetData;
  h: TrHandlers;
}
