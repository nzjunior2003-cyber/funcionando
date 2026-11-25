import React from 'react';
import { equipeSecao, MembroEquipe } from '../services/equipe';
import { inputClasses } from './formCommon';

const grupos: MembroEquipe['grupo'][] = ['Chefia', 'Auxiliares', 'Voluntários Civis'];

// Menu "Selecionar da equipe": preenche nome, nome de guerra, cargo e função de uma só vez.
// Os campos continuam editáveis; quem não está na lista é preenchido manualmente.
export const SeletorEquipe: React.FC<{ nomeAtual?: string; onSelect: (m: MembroEquipe) => void }> = ({ nomeAtual, onSelect }) => {
    const indiceAtual = equipeSecao.findIndex(m => m.nome === (nomeAtual || '').trim());
    return (
        <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">Selecionar da equipe da Seção</label>
            <select
                value={indiceAtual >= 0 ? String(indiceAtual) : ''}
                onChange={(e) => { if (e.target.value !== '') onSelect(equipeSecao[Number(e.target.value)]); }}
                className={inputClasses}
            >
                <option value="">Preencher manualmente...</option>
                {grupos.map(g => (
                    <optgroup key={g} label={g}>
                        {equipeSecao.map((m, i) => m.grupo === g ? (
                            <option key={m.nome} value={String(i)}>{m.nome} ({m.nomeGuerra}) — {m.cargo}</option>
                        ) : null)}
                    </optgroup>
                ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">Preenche nome, nome de guerra, cargo e função; os campos abaixo continuam editáveis.</p>
        </div>
    );
};
