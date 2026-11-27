import { timingSafeEqual } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { Consulta, ErroPeca } from './pecas.js';

// Tipos mínimos da requisição/resposta das funções do Vercel (evita depender de @vercel/node).
export interface Req {
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    query: Record<string, string | string[] | undefined>;
    body?: any;
}
export interface Res {
    status(codigo: number): Res;
    json(corpo: any): void;
    setHeader(nome: string, valor: string): void;
}

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export const param = (req: Req, nome: string) => primeiro(req.query[nome]);

// O catálogo guarda dados dos processos: só abre com o código de acesso da Seção.
const conferirCodigo = (req: Req) => {
    const esperado = process.env.CODIGO_SECAO;
    if (!esperado) throw new ErroPeca(503, 'O código de acesso da Seção ainda não foi configurado no servidor (variável CODIGO_SECAO).');
    const recebido = primeiro(req.headers['x-codigo-secao']);
    const a = Buffer.from(recebido);
    const b = Buffer.from(esperado);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new ErroPeca(401, 'Código de acesso incorreto.');
};

export const abrirConsulta = (): Consulta => {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new ErroPeca(503, 'O banco de dados ainda não foi conectado ao projeto (variável DATABASE_URL).');
    const sql = neon(url);
    return async (texto, params = []) => (await sql.query(texto, params)) as any[];
};

export const executar = async (req: Req, res: Res, acao: (q: Consulta) => Promise<any>) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
        conferirCodigo(req);
        const resultado = await acao(abrirConsulta());
        res.status(200).json(resultado);
    } catch (e: any) {
        if (e instanceof ErroPeca) {
            res.status(e.status).json({ erro: e.message });
        } else {
            console.error('Erro no catálogo de peças:', e);
            res.status(500).json({ erro: 'Erro interno ao acessar o catálogo.' });
        }
    }
};
