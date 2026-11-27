// Cliente do catálogo de peças da Seção (funções /api/pecas e /api/relatorio no Vercel).

export const TIPOS_PECA = [
    { val: 'dfd', label: 'DFD' },
    { val: 'etp', label: 'ETP' },
    { val: 'risco', label: 'Análise de Riscos' },
    { val: 'orcamento', label: 'Orçamento Estimado' },
    { val: 'tr_bens', label: 'TR Bens' },
    { val: 'tr_servicos', label: 'TR Serviços' }
] as const;

export const rotuloTipo = (tipo: string) => TIPOS_PECA.find(t => t.val === tipo)?.label || tipo;

export interface PecaCatalogo {
    id: number;
    tipo: string;
    subtipo: string | null;
    numero: number;
    ano: number;
    codigo: string;
    pae: string | null;
    objeto: string | null;
    autor_nome: string;
    autor_guerra: string | null;
    setor: string | null;
    criado_em: string;
    atualizado_em: string;
}

export interface DadosRegistro {
    tipo: string;
    subtipo?: string;
    pae?: string;
    objeto?: string;
    autorNome: string;
    autorGuerra?: string;
    setor?: string;
}

export class ErroApi extends Error {
    status: number;
    constructor(status: number, mensagem: string) {
        super(mensagem);
        this.status = status;
    }
}

const CHAVE_CODIGO = 'codigoSecaoCatalogo';

export const lerCodigoSalvo = (): string => {
    try { return localStorage.getItem(CHAVE_CODIGO) || ''; } catch { return ''; }
};
export const salvarCodigo = (codigo: string) => {
    try { localStorage.setItem(CHAVE_CODIGO, codigo); } catch { /* armazenamento indisponível */ }
};

const chamar = async (metodo: string, url: string, corpo?: unknown, codigo?: string): Promise<any> => {
    let resposta: Response;
    try {
        resposta = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json', 'x-codigo-secao': codigo ?? lerCodigoSalvo() },
            body: corpo === undefined ? undefined : JSON.stringify(corpo)
        });
    } catch {
        throw new ErroApi(0, 'Não foi possível acessar o catálogo. Verifique a conexão com a internet.');
    }
    let json: any = null;
    try { json = await resposta.json(); } catch { /* resposta sem JSON */ }
    if (!resposta.ok) {
        throw new ErroApi(resposta.status, json?.erro || `Erro ${resposta.status} ao acessar o catálogo.`);
    }
    return json;
};

const consultaTexto = (params: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') p.set(k, String(v)); });
    const s = p.toString();
    return s ? `?${s}` : '';
};

export const registrarPeca = (dados: DadosRegistro, codigo?: string): Promise<PecaCatalogo> =>
    chamar('POST', '/api/pecas', dados, codigo);

export const atualizarPeca = (id: number, dados: DadosRegistro, codigo?: string): Promise<PecaCatalogo> =>
    chamar('PUT', `/api/pecas${consultaTexto({ id })}`, dados, codigo);

export interface FiltrosCatalogo {
    busca?: string;
    tipo?: string;
    autor?: string;
    de?: string;
    ate?: string;
    limite?: number;
    deslocamento?: number;
}

export const consultarPecas = (filtros: FiltrosCatalogo, codigo?: string): Promise<{ total: number; pecas: PecaCatalogo[] }> =>
    chamar('GET', `/api/pecas${consultaTexto({ ...filtros })}`, undefined, codigo);

export interface RelatorioPecas {
    total: number;
    porTipo: Record<string, number>;
    porPessoa: Record<string, Record<string, number>>;
}

export const relatorioPecas = (de?: string, ate?: string, codigo?: string): Promise<RelatorioPecas> =>
    chamar('GET', `/api/relatorio${consultaTexto({ de, ate })}`, undefined, codigo);

// Exportação para planilha (CSV com ponto e vírgula e BOM, para abrir direto no Excel em português).
const celulaCsv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export const baixarCsv = (nomeArquivo: string, cabecalho: string[], linhas: (string | number | null | undefined)[][]) => {
    const conteudo = [cabecalho, ...linhas].map(l => l.map(celulaCsv).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
};

export const formatarDataHora = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', { timeZone: 'America/Belem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
