import React, { useEffect, useMemo, useState } from 'react';
import { ControlePeca, DocumentType } from '../types';
import { equipeSecao } from '../services/equipe';
import { infoDaPeca } from '../services/pecaInfo';
import { atualizarPeca, ErroApi, lerCodigoSalvo, registrarPeca, rotuloTipo, salvarCodigo } from '../services/catalogo';
import { inputClasses } from './formCommon';

interface Props {
    docType: DocumentType;
    data: any;
    controle?: ControlePeca;
    onClose: () => void;
    onRegistrada: (controle: ControlePeca) => void;
}

const OUTRA = 'outra';

// Janela "Registrar peça": confirma o objeto e quem confeccionou, e grava a peça no catálogo da Seção.
// Peça já registrada: atualiza os dados e mantém o mesmo número.
export const RegistrarPecaModal: React.FC<Props> = ({ docType, data, controle, onClose, onRegistrada }) => {
    const info = useMemo(() => infoDaPeca(docType, data), [docType, data]);
    const indiceInicial = equipeSecao.findIndex(m => m.nome.toLowerCase() === info.autorNome.trim().toLowerCase());

    const [objeto, setObjeto] = useState(info.objeto);
    const [autor, setAutor] = useState<string>(indiceInicial >= 0 ? String(indiceInicial) : OUTRA);
    const [outroNome, setOutroNome] = useState(indiceInicial >= 0 ? '' : info.autorNome);
    const [outroGuerra, setOutroGuerra] = useState(indiceInicial >= 0 ? '' : info.autorGuerra);
    const [codigo, setCodigo] = useState(lerCodigoSalvo());
    const [pedirCodigo, setPedirCodigo] = useState(!lerCodigoSalvo());
    const [erro, setErro] = useState('');
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape' && !enviando) onClose(); };
        window.addEventListener('keydown', aoTeclar);
        return () => window.removeEventListener('keydown', aoTeclar);
    }, [enviando, onClose]);

    const atualizando = !!controle;

    const confirmar = async () => {
        setErro('');
        const membro = autor === OUTRA ? null : equipeSecao[Number(autor)];
        const autorNome = membro ? membro.nome : outroNome.trim();
        const autorGuerra = membro ? membro.nomeGuerra : outroGuerra.trim();
        if (!autorNome) { setErro('Informe quem confeccionou a peça.'); return; }
        if (!codigo.trim()) { setPedirCodigo(true); setErro('Informe o código de acesso da Seção.'); return; }

        const dados = {
            tipo: docType, subtipo: info.subtipo, pae: info.pae, objeto: objeto.trim(),
            autorNome, autorGuerra, setor: info.setor
        };
        setEnviando(true);
        try {
            const peca = atualizando ? await atualizarPeca(controle!.id, dados, codigo.trim()) : await registrarPeca(dados, codigo.trim());
            salvarCodigo(codigo.trim());
            onRegistrada({ id: peca.id, codigo: peca.codigo, numero: peca.numero, ano: peca.ano });
        } catch (e) {
            if (e instanceof ErroApi && e.status === 401) setPedirCodigo(true);
            setErro((e as Error).message);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center p-4" onClick={() => !enviando && onClose()}>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    {atualizando ? `Atualizar registro — ${rotuloTipo(docType)} nº ${controle!.codigo}` : `Registrar peça — ${rotuloTipo(docType)}`}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 mb-4">
                    {atualizando
                        ? 'Os dados do catálogo serão atualizados. O número da peça não muda.'
                        : 'A peça entra no catálogo da Seção e recebe o próximo número deste tipo (nnnn/aaaa).'}
                </p>

                {info.pae && <p className="text-sm mb-3 dark:text-gray-200"><b>PAE:</b> {info.pae}</p>}

                <label className="block text-sm font-semibold mb-1 dark:text-gray-300">Objeto da peça</label>
                <textarea value={objeto} onChange={(e) => setObjeto(e.target.value)} className={`${inputClasses} h-24 mb-4`} placeholder="Descreva em poucas palavras o que a peça trata" />

                <label className="block text-sm font-semibold mb-1 dark:text-gray-300">Confeccionado por</label>
                <select value={autor} onChange={(e) => setAutor(e.target.value)} className={`${inputClasses} mb-3`}>
                    {equipeSecao.map((m, i) => <option key={m.nome} value={String(i)}>{m.nome} ({m.nomeGuerra})</option>)}
                    <option value={OUTRA}>Outra pessoa...</option>
                </select>
                {autor === OUTRA && (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <input type="text" value={outroNome} onChange={(e) => setOutroNome(e.target.value)} placeholder="Nome completo" className={inputClasses} />
                        <input type="text" value={outroGuerra} onChange={(e) => setOutroGuerra(e.target.value)} placeholder="Nome de guerra" className={inputClasses} />
                    </div>
                )}

                {pedirCodigo && (
                    <div className="mb-3">
                        <label className="block text-sm font-semibold mb-1 dark:text-gray-300">Código de acesso da Seção</label>
                        <input type="password" value={codigo} onChange={(e) => setCodigo(e.target.value)} className={inputClasses} autoComplete="off" />
                    </div>
                )}

                {erro && <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">{erro}</p>}

                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={onClose} disabled={enviando} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold dark:bg-slate-800 dark:text-gray-200">Cancelar</button>
                    <button onClick={confirmar} disabled={enviando} className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold disabled:opacity-60">
                        {enviando ? 'Gravando...' : atualizando ? 'Atualizar registro' : 'Registrar peça'}
                    </button>
                </div>
            </div>
        </div>
    );
};
