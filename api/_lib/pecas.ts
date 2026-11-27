// Catálogo de peças confeccionadas pela Seção: registro com numeração automática (nnnn/aaaa,
// um contador por tipo e por ano), consulta e relatório. A lógica não depende do driver do banco:
// recebe uma função `consulta(texto, parâmetros)` que devolve as linhas.

export type Consulta = (texto: string, params?: any[]) => Promise<any[]>;

export const TIPOS = ['dfd', 'etp', 'risco', 'orcamento', 'tr_bens', 'tr_servicos'] as const;
export type TipoPeca = typeof TIPOS[number];

export class ErroPeca extends Error {
    status: number;
    constructor(status: number, mensagem: string) {
        super(mensagem);
        this.status = status;
    }
}

const DDL = [
    `CREATE TABLE IF NOT EXISTS pecas_contador (
        tipo text NOT NULL,
        ano integer NOT NULL,
        ultimo integer NOT NULL,
        PRIMARY KEY (tipo, ano)
    )`,
    `CREATE TABLE IF NOT EXISTS pecas (
        id serial PRIMARY KEY,
        tipo text NOT NULL,
        subtipo text,
        numero integer NOT NULL,
        ano integer NOT NULL,
        codigo text NOT NULL,
        pae text,
        objeto text,
        autor_nome text NOT NULL,
        autor_guerra text,
        setor text,
        criado_em timestamptz NOT NULL DEFAULT now(),
        atualizado_em timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tipo, ano, numero)
    )`,
    `CREATE INDEX IF NOT EXISTS pecas_criado_em_idx ON pecas (criado_em)`
];

let tabelasProntas = false;
export const garantirTabelas = async (q: Consulta) => {
    if (tabelasProntas) return;
    for (const comando of DDL) await q(comando);
    tabelasProntas = true;
};
export const reiniciarParaTeste = () => { tabelasProntas = false; };

// Belém é UTC-3 o ano todo: o ano do contador vira à meia-noite local.
export const anoAtualBelem = (agora: number = Date.now()) => new Date(agora - 3 * 3600 * 1000).getUTCFullYear();

const texto = (v: any, max: number): string => String(v ?? '').trim().slice(0, max);

export interface DadosPeca {
    tipo: string;
    subtipo?: string;
    pae?: string;
    objeto?: string;
    autorNome: string;
    autorGuerra?: string;
    setor?: string;
}

const validar = (d: DadosPeca) => {
    if (!d || !TIPOS.includes(d.tipo as TipoPeca)) throw new ErroPeca(400, 'Tipo de peça inválido.');
    if (!texto(d.autorNome, 200)) throw new ErroPeca(400, 'Informe quem confeccionou a peça.');
    return {
        tipo: d.tipo,
        subtipo: texto(d.subtipo, 60) || null,
        pae: texto(d.pae, 60) || null,
        objeto: texto(d.objeto, 600) || null,
        autorNome: texto(d.autorNome, 200),
        autorGuerra: texto(d.autorGuerra, 80) || null,
        setor: texto(d.setor, 80) || null
    };
};

export const registrar = async (q: Consulta, dados: DadosPeca, agora: number = Date.now()) => {
    await garantirTabelas(q);
    const d = validar(dados);
    const ano = anoAtualBelem(agora);
    // Um único comando: o contador e a peça são gravados juntos (sem buracos nem números repetidos).
    const linhas = await q(
        `WITH n AS (
            INSERT INTO pecas_contador (tipo, ano, ultimo) VALUES ($1, $2, 1)
            ON CONFLICT (tipo, ano) DO UPDATE SET ultimo = pecas_contador.ultimo + 1
            RETURNING ultimo
        )
        INSERT INTO pecas (tipo, subtipo, numero, ano, codigo, pae, objeto, autor_nome, autor_guerra, setor)
        SELECT $1, $3, n.ultimo, $2, lpad(n.ultimo::text, 4, '0') || '/' || $2::text, $4, $5, $6, $7, $8 FROM n
        RETURNING *`,
        [d.tipo, ano, d.subtipo, d.pae, d.objeto, d.autorNome, d.autorGuerra, d.setor]
    );
    return linhas[0];
};

export const atualizar = async (q: Consulta, id: number, dados: DadosPeca) => {
    await garantirTabelas(q);
    if (!Number.isInteger(id) || id <= 0) throw new ErroPeca(400, 'Peça inválida.');
    const d = validar(dados);
    const linhas = await q(
        `UPDATE pecas SET subtipo = $2, pae = $3, objeto = $4, autor_nome = $5, autor_guerra = $6, setor = $7, atualizado_em = now()
         WHERE id = $1 AND tipo = $8 RETURNING *`,
        [id, d.subtipo, d.pae, d.objeto, d.autorNome, d.autorGuerra, d.setor, d.tipo]
    );
    if (!linhas.length) throw new ErroPeca(404, 'Peça não encontrada no catálogo.');
    return linhas[0];
};

export interface FiltrosConsulta {
    busca?: string;
    tipo?: string;
    autor?: string;
    de?: string;   // AAAA-MM-DD
    ate?: string;  // AAAA-MM-DD
    limite?: number;
    deslocamento?: number;
}

const ehData = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const inicioDoDia = (s: string) => `${s}T00:00:00-03:00`;
const diaSeguinte = (s: string) => {
    const [a, m, d] = s.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);
};

const montarFiltro = (f: FiltrosConsulta) => {
    const cond: string[] = [];
    const params: any[] = [];
    const add = (v: any) => { params.push(v); return `$${params.length}`; };

    const busca = texto(f.busca, 120);
    if (busca) {
        const p = add(`%${busca.replace(/[%_\\]/g, (m) => '\\' + m)}%`);
        cond.push(`(codigo ILIKE ${p} OR (upper(tipo) || ' ' || codigo) ILIKE ${p} OR coalesce(pae, '') ILIKE ${p} OR coalesce(objeto, '') ILIKE ${p})`);
    }
    if (f.tipo) {
        if (!TIPOS.includes(f.tipo as TipoPeca)) throw new ErroPeca(400, 'Tipo de peça inválido.');
        cond.push(`tipo = ${add(f.tipo)}`);
    }
    if (texto(f.autor, 200)) cond.push(`autor_nome = ${add(texto(f.autor, 200))}`);
    if (f.de) {
        if (!ehData(f.de)) throw new ErroPeca(400, 'Data inicial inválida.');
        cond.push(`criado_em >= ${add(inicioDoDia(f.de))}::timestamptz`);
    }
    if (f.ate) {
        if (!ehData(f.ate)) throw new ErroPeca(400, 'Data final inválida.');
        cond.push(`criado_em < ${add(inicioDoDia(diaSeguinte(f.ate)))}::timestamptz`);
    }
    return { where: cond.length ? `WHERE ${cond.join(' AND ')}` : '', params };
};

export const consultar = async (q: Consulta, filtros: FiltrosConsulta) => {
    await garantirTabelas(q);
    const { where, params } = montarFiltro(filtros);
    const limite = Math.min(Math.max(Number(filtros.limite) || 50, 1), 200);
    const deslocamento = Math.max(Number(filtros.deslocamento) || 0, 0);
    const [{ total }] = await q(`SELECT count(*)::int AS total FROM pecas ${where}`, params);
    const pecas = await q(
        `SELECT * FROM pecas ${where} ORDER BY criado_em DESC, id DESC LIMIT ${limite} OFFSET ${deslocamento}`,
        params
    );
    return { total, pecas };
};

export const relatorio = async (q: Consulta, de?: string, ate?: string) => {
    await garantirTabelas(q);
    const { where, params } = montarFiltro({ de, ate });
    const linhas = await q(
        `SELECT tipo, autor_nome, count(*)::int AS total FROM pecas ${where} GROUP BY tipo, autor_nome`,
        params
    );
    const porTipo: Record<string, number> = {};
    const porPessoa: Record<string, Record<string, number>> = {};
    let total = 0;
    for (const l of linhas) {
        porTipo[l.tipo] = (porTipo[l.tipo] || 0) + l.total;
        porPessoa[l.autor_nome] = porPessoa[l.autor_nome] || {};
        porPessoa[l.autor_nome][l.tipo] = (porPessoa[l.autor_nome][l.tipo] || 0) + l.total;
        total += l.total;
    }
    return { total, porTipo, porPessoa };
};
