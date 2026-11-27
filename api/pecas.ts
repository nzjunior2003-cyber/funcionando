import { executar, param, Req, Res } from './_lib/http.js';
import { atualizar, consultar, ErroPeca, registrar } from './_lib/pecas.js';

// GET  /api/pecas?busca=&tipo=&autor=&de=&ate=&limite=&deslocamento=  -> consulta o catálogo
// POST /api/pecas                                                      -> registra a peça e devolve o número
// PUT  /api/pecas?id=                                                  -> atualiza os dados de uma peça já registrada
export default async function handler(req: Req, res: Res) {
    await executar(req, res, async (q) => {
        if (req.method === 'GET') {
            return consultar(q, {
                busca: param(req, 'busca'),
                tipo: param(req, 'tipo'),
                autor: param(req, 'autor'),
                de: param(req, 'de'),
                ate: param(req, 'ate'),
                limite: Number(param(req, 'limite')) || undefined,
                deslocamento: Number(param(req, 'deslocamento')) || undefined
            });
        }
        if (req.method === 'POST') return registrar(q, req.body);
        if (req.method === 'PUT') return atualizar(q, Number(param(req, 'id')), req.body);
        throw new ErroPeca(405, 'Método não permitido.');
    });
}
