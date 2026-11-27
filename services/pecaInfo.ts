import { DocumentType } from '../types';

export interface InfoPeca {
    tipo: string;
    subtipo?: string;
    pae: string;
    objeto: string;
    setor: string;
    autorNome: string;
    autorGuerra: string;
}

const resumo = (texto: unknown, max = 220): string => {
    const t = String(texto ?? '').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
};

const objetoDosItens = (itens: any[] | undefined, campo: string, alternativa?: string): string => {
    const lista = Array.isArray(itens) ? itens.filter(i => String(i?.[campo] ?? '').trim()) : [];
    if (!lista.length) return resumo(alternativa);
    const primeiro = resumo(lista[0][campo], 160);
    return lista.length > 1 ? `${primeiro} (e mais ${lista.length - 1} ${lista.length - 1 === 1 ? 'item' : 'itens'})` : primeiro;
};

// Dados que o catálogo guarda de cada peça, sugeridos a partir do que já está preenchido no documento.
export const infoDaPeca = (tipo: DocumentType, data: any): InfoPeca => {
    switch (tipo) {
        case DocumentType.DFD:
            return { tipo, pae: '', objeto: resumo(data.problema), setor: data.setor || '', autorNome: data.nome || '', autorGuerra: data.nomeGuerra || '' };
        case DocumentType.ETP:
            return { tipo, pae: data.pae || '', objeto: resumo(data.necessidade), setor: data.setor || '', autorNome: data.nome || '', autorGuerra: data.nomeGuerra || '' };
        case DocumentType.RISCO:
            return { tipo, pae: data.pae || '', objeto: resumo(data.riscos?.[0]?.descricao), setor: '', autorNome: data.nome || '', autorGuerra: data.nomeGuerra || '' };
        case DocumentType.ORCAMENTO:
            return {
                tipo, subtipo: data.tipoOrcamento || '', pae: data.pae || '',
                objeto: objetoDosItens(data.itemGroups, 'descricao'), setor: data.setor || '',
                autorNome: data.assinante1Nome || '', autorGuerra: data.assinante1NomeGuerra || ''
            };
        case DocumentType.TR_BENS:
        case DocumentType.TR_SERVICOS:
            return {
                tipo, pae: data.pae || '', objeto: objetoDosItens(data.itens, 'descricao', data.motivoContratacao),
                setor: data.setor || '', autorNome: data.nome || '', autorGuerra: data.nomeGuerra || ''
            };
        default:
            return { tipo: String(tipo), pae: '', objeto: '', setor: '', autorNome: '', autorGuerra: '' };
    }
};
