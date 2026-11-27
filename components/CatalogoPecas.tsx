import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { equipeSecao } from '../services/equipe';
import {
    baixarCsv, consultarPecas, ErroApi, formatarDataHora, lerCodigoSalvo, PecaCatalogo,
    relatorioPecas, RelatorioPecas, rotuloTipo, salvarCodigo, TIPOS_PECA
} from '../services/catalogo';
import { inputClasses } from './formCommon';

const POR_PAGINA = 50;

const hojeBelem = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
const primeiroDiaDoMes = () => hojeBelem().slice(0, 8) + '01';

// Catálogo das peças confeccionadas pela Seção: consulta (por número, PAE ou objeto) e relatório por tipo e por pessoa.
export const CatalogoPecas: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [aba, setAba] = useState<'consulta' | 'relatorio'>('consulta');
    const [codigo, setCodigo] = useState(lerCodigoSalvo());
    const [codigoDigitado, setCodigoDigitado] = useState('');
    const [precisaCodigo, setPrecisaCodigo] = useState(!lerCodigoSalvo());
    const [erro, setErro] = useState('');

    // Consulta
    const [busca, setBusca] = useState('');
    const [tipo, setTipo] = useState('');
    const [autor, setAutor] = useState('');
    const [de, setDe] = useState('');
    const [ate, setAte] = useState('');
    const [pecas, setPecas] = useState<PecaCatalogo[]>([]);
    const [total, setTotal] = useState(0);
    const [carregando, setCarregando] = useState(false);

    // Relatório
    const [rDe, setRDe] = useState(primeiroDiaDoMes());
    const [rAte, setRAte] = useState(hojeBelem());
    const [relatorio, setRelatorio] = useState<RelatorioPecas | null>(null);

    useEffect(() => {
        const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', aoTeclar);
        return () => window.removeEventListener('keydown', aoTeclar);
    }, [onClose]);

    const tratarErro = (e: unknown) => {
        if (e instanceof ErroApi && e.status === 401) setPrecisaCodigo(true);
        setErro((e as Error).message);
    };

    const buscar = useCallback(async (deslocamento = 0) => {
        if (!codigo) return;
        setCarregando(true);
        setErro('');
        try {
            const r = await consultarPecas({ busca, tipo, autor, de, ate, limite: POR_PAGINA, deslocamento }, codigo);
            setTotal(r.total);
            setPecas(prev => (deslocamento === 0 ? r.pecas : [...prev, ...r.pecas]));
        } catch (e) { tratarErro(e); } finally { setCarregando(false); }
    }, [busca, tipo, autor, de, ate, codigo]);

    const gerarRelatorio = useCallback(async () => {
        if (!codigo) return;
        setCarregando(true);
        setErro('');
        try { setRelatorio(await relatorioPecas(rDe, rAte, codigo)); } catch (e) { tratarErro(e); } finally { setCarregando(false); }
    }, [rDe, rAte, codigo]);

    // Primeira carga de cada aba (e quando o código é aceito).
    useEffect(() => { if (codigo && aba === 'consulta') buscar(0); }, [codigo, aba]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (codigo && aba === 'relatorio') gerarRelatorio(); }, [codigo, aba]); // eslint-disable-line react-hooks/exhaustive-deps

    const confirmarCodigo = () => {
        if (!codigoDigitado.trim()) return;
        salvarCodigo(codigoDigitado.trim());
        setCodigo(codigoDigitado.trim());
        setPrecisaCodigo(false);
        setErro('');
    };

    const exportarConsulta = () => baixarCsv(
        `catalogo-pecas-${hojeBelem()}.csv`,
        ['Peça', 'Número', 'PAE', 'Objeto', 'Confeccionado por', 'Setor', 'Registrada em'],
        pecas.map(p => [`${rotuloTipo(p.tipo)} ${p.codigo}`, p.codigo, p.pae, p.objeto, p.autor_nome, p.setor, formatarDataHora(p.criado_em)])
    );

    const pessoas = useMemo(() => (relatorio ? Object.keys(relatorio.porPessoa).sort((a, b) => a.localeCompare(b)) : []), [relatorio]);

    const exportarRelatorio = () => {
        if (!relatorio) return;
        const cab = ['Pessoa', ...TIPOS_PECA.map(t => t.label), 'Total'];
        const linhas = pessoas.map(p => {
            const porTipo = relatorio.porPessoa[p];
            const somaPessoa = TIPOS_PECA.reduce((s, t) => s + (porTipo[t.val] || 0), 0);
            return [p, ...TIPOS_PECA.map(t => porTipo[t.val] || 0), somaPessoa];
        });
        linhas.push(['TOTAL', ...TIPOS_PECA.map(t => relatorio.porTipo[t.val] || 0), relatorio.total]);
        baixarCsv(`relatorio-pecas-${rDe}-a-${rAte}.csv`, cab, linhas);
    };

    return (
        <div className="fixed inset-0 z-[9998] bg-black/60 flex items-start sm:items-center justify-center p-2 sm:p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">Catálogo de peças da Seção</h2>
                    <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold dark:bg-slate-800 dark:text-gray-200">Fechar</button>
                </div>

                {precisaCodigo ? (
                    <div className="max-w-sm">
                        <label className="block text-sm font-semibold mb-1 dark:text-gray-300">Código de acesso da Seção</label>
                        <input type="password" value={codigoDigitado} onChange={(e) => setCodigoDigitado(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmarCodigo()} className={inputClasses} autoComplete="off" autoFocus />
                        {erro && <p className="text-sm font-semibold text-red-600 dark:text-red-400 mt-2">{erro}</p>}
                        <button onClick={confirmarCodigo} className="mt-3 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold">Entrar</button>
                    </div>
                ) : (
                    <>
                        <div className="flex gap-2 mb-4 border-b dark:border-slate-700">
                            {([['consulta', 'Consulta'], ['relatorio', 'Relatório']] as const).map(([val, rotulo]) => (
                                <button key={val} onClick={() => setAba(val)}
                                    className={`px-4 py-2 font-semibold border-b-4 -mb-px ${aba === val ? 'border-red-700 text-red-700 dark:text-red-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>
                                    {rotulo}
                                </button>
                            ))}
                        </div>

                        {erro && <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">{erro}</p>}

                        {aba === 'consulta' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                    <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buscar(0)}
                                        placeholder="Buscar por número da peça, PAE ou objeto" className={`${inputClasses} md:col-span-2`} />
                                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputClasses}>
                                        <option value="">Todos os tipos</option>
                                        {TIPOS_PECA.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                                    </select>
                                    <select value={autor} onChange={(e) => setAutor(e.target.value)} className={inputClasses}>
                                        <option value="">Todas as pessoas</option>
                                        {equipeSecao.map(m => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
                                    </select>
                                    <label className="text-sm dark:text-gray-300">De <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className={inputClasses} /></label>
                                    <label className="text-sm dark:text-gray-300">Até <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={inputClasses} /></label>
                                    <div className="md:col-span-2 flex items-end gap-3">
                                        <button onClick={() => buscar(0)} disabled={carregando} className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold disabled:opacity-60">Buscar</button>
                                        <button onClick={exportarConsulta} disabled={!pecas.length} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold disabled:opacity-50 dark:bg-slate-800 dark:text-gray-200">Exportar planilha (CSV)</button>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{carregando ? 'Carregando...' : `${total} peça(s) encontrada(s)`}</p>
                                <div className="overflow-x-auto border rounded-lg dark:border-slate-700">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200">
                                            <tr>
                                                <th className="px-3 py-2">Peça</th><th className="px-3 py-2">PAE</th><th className="px-3 py-2">Objeto</th>
                                                <th className="px-3 py-2">Confeccionado por</th><th className="px-3 py-2">Registrada em</th>
                                            </tr>
                                        </thead>
                                        <tbody className="dark:text-gray-200">
                                            {pecas.map(p => (
                                                <tr key={p.id} className="border-t dark:border-slate-700 align-top">
                                                    <td className="px-3 py-2 font-bold whitespace-nowrap">{rotuloTipo(p.tipo)}<br /><span className="text-red-700 dark:text-red-400">{p.codigo}</span></td>
                                                    <td className="px-3 py-2 whitespace-nowrap">{p.pae || '-'}</td>
                                                    <td className="px-3 py-2">{p.objeto || '-'}</td>
                                                    <td className="px-3 py-2">{p.autor_guerra || p.autor_nome}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap">{formatarDataHora(p.criado_em)}</td>
                                                </tr>
                                            ))}
                                            {!pecas.length && !carregando && (
                                                <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Nenhuma peça encontrada.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {pecas.length < total && (
                                    <button onClick={() => buscar(pecas.length)} disabled={carregando} className="mt-3 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold dark:bg-slate-800 dark:text-gray-200">Mostrar mais</button>
                                )}
                            </>
                        )}

                        {aba === 'relatorio' && (
                            <>
                                <div className="flex flex-wrap items-end gap-3 mb-4">
                                    <label className="text-sm dark:text-gray-300">De <input type="date" value={rDe} onChange={(e) => setRDe(e.target.value)} className={inputClasses} /></label>
                                    <label className="text-sm dark:text-gray-300">Até <input type="date" value={rAte} onChange={(e) => setRAte(e.target.value)} className={inputClasses} /></label>
                                    <button onClick={gerarRelatorio} disabled={carregando} className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold disabled:opacity-60">Atualizar</button>
                                    <button onClick={exportarRelatorio} disabled={!relatorio} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold disabled:opacity-50 dark:bg-slate-800 dark:text-gray-200">Exportar planilha (CSV)</button>
                                </div>

                                {relatorio && (
                                    <>
                                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Por tipo de peça — total no período: {relatorio.total}</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                                            {TIPOS_PECA.map(t => (
                                                <div key={t.val} className="border rounded-lg p-3 dark:border-slate-700 dark:text-gray-200">
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{t.label}</div>
                                                    <div className="text-2xl font-extrabold">{relatorio.porTipo[t.val] || 0}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Por pessoa</h3>
                                        <div className="overflow-x-auto border rounded-lg dark:border-slate-700">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200">
                                                    <tr>
                                                        <th className="px-3 py-2">Pessoa</th>
                                                        {TIPOS_PECA.map(t => <th key={t.val} className="px-3 py-2 text-center">{t.label}</th>)}
                                                        <th className="px-3 py-2 text-center">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="dark:text-gray-200">
                                                    {pessoas.map(p => {
                                                        const porTipo = relatorio.porPessoa[p];
                                                        const soma = TIPOS_PECA.reduce((s, t) => s + (porTipo[t.val] || 0), 0);
                                                        return (
                                                            <tr key={p} className="border-t dark:border-slate-700">
                                                                <td className="px-3 py-2">{p}</td>
                                                                {TIPOS_PECA.map(t => <td key={t.val} className="px-3 py-2 text-center">{porTipo[t.val] || 0}</td>)}
                                                                <td className="px-3 py-2 text-center font-bold">{soma}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {!pessoas.length && <tr><td colSpan={TIPOS_PECA.length + 2} className="px-3 py-6 text-center text-gray-500">Nenhuma peça registrada no período.</td></tr>}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
