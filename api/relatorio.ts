import { executar, param, Req, Res } from './_lib/http.js';
import { ErroPeca, relatorio } from './_lib/pecas.js';

// GET /api/relatorio?de=AAAA-MM-DD&ate=AAAA-MM-DD -> total de peças por tipo e por pessoa no período
export default async function handler(req: Req, res: Res) {
    await executar(req, res, async (q) => {
        if (req.method !== 'GET') throw new ErroPeca(405, 'Método não permitido.');
        return relatorio(q, param(req, 'de') || undefined, param(req, 'ate') || undefined);
    });
}
