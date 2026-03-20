import jsPDF from 'jspdf';
import { OrcamentoData } from '../../types';
import { generateOrcamentoLicitacaoPdf } from './orcamento/licitacao';
import { generateOrcamentoAdesaoAtaPdf } from './orcamento/adesaoAta';
import { generateOrcamentoDispensaPdf } from './orcamento/dispensaLicitacao';
import { generateOrcamentoAditivoPdf } from './orcamento/aditivoContratual';
import { generateOrcamentoCredenciamentoPdf } from './orcamento/credenciamento';
import { generateOrcamentoGerenciadorAtaPdf } from './orcamento/gerenciadorAta';

export const generateOrcamentoPdf = (doc: jsPDF, data: OrcamentoData) => {
    switch (data.tipoOrcamento) {
        case 'licitacao':
            generateOrcamentoLicitacaoPdf(doc, data);
            break;
        case 'adesao_ata':
            generateOrcamentoAdesaoAtaPdf(doc, data);
            break;
        case 'dispensa_licitacao':
            generateOrcamentoDispensaPdf(doc, data);
            break;
        case 'aditivo_contratual':
            generateOrcamentoAditivoPdf(doc, data);
            break;
        case 'credenciamento':
            generateOrcamentoCredenciamentoPdf(doc, data);
            break;
        case 'gerenciador_ata':
            generateOrcamentoGerenciadorAtaPdf(doc, data);
            break;
        default:
            generateOrcamentoLicitacaoPdf(doc, data);
            break;
    }
};
