import jsPDF from 'jspdf';
import { OrcamentoData } from '../../types';

// Importando os "trabalhadores" de cada tipo de orçamento
import { generateOrcamentoLicitacaoPdf } from './orcamento/licitacao';
import { generateOrcamentoAdesaoAtaPdf } from './orcamento/adesaoAta';
import { generateOrcamentoAditivoPdf } from './orcamento/aditivoContratual';

export const generateOrcamentoPdf = (doc: jsPDF, data: OrcamentoData) => {
    switch (data.tipoOrcamento) {
        case 'adesao_ata':
            generateOrcamentoAdesaoAtaPdf(doc, data);
            break;
        case 'aditivo_contratual':
            generateOrcamentoAditivoPdf(doc, data);
            break;
        case 'licitacao':
        default:
            generateOrcamentoLicitacaoPdf(doc, data);
            break;
    }
};