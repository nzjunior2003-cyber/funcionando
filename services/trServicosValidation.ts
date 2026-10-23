import { TrServicosData } from '../types';

// Validação do TR Serviços antes de gerar o PDF. Devolve a lista de pendências
// (vazia = pode gerar), para a tela mostrar uma mensagem visível ao usuário.
export const validateTrServicos = (d: TrServicosData): string[] => {
    const erros: string[] = [];
    const vazio = (v?: string) => !v || !String(v).trim();

    if (vazio(d.pae)) erros.push('Informe o nº do PAE.');
    if (vazio(d.nome)) erros.push('Informe o nome completo do servidor (assinatura).');
    if (!d.naturezaServico) erros.push('Selecione a natureza do serviço (continuado ou não continuado).');

    if (d.naturezaServico === 'continuado') {
        if (vazio(d.justificativaContinuado)) erros.push('Serviço continuado: justifique a essencialidade do serviço e a vantajosidade da prorrogação.');
        if (vazio(d.prazoContrato)) erros.push('Serviço continuado: informe o prazo do contrato em meses.');
        if (vazio(d.reajusteIndice)) erros.push('Serviço continuado: o reajuste é obrigatório — selecione o índice.');
        if (vazio(d.reajusteMeses)) erros.push('Serviço continuado: o reajuste é obrigatório — informe a periodicidade em meses.');
        if (vazio(d.reajusteDataBase)) erros.push('Serviço continuado: informe a data-base do reajuste (art. 25, § 7º).');
    }

    if (d.garantiaServico === 'sim' && !(Number(d.garantiaServicoMeses) > 0)) {
        erros.push('Garantia do serviço: informe o prazo mínimo em meses.');
    }

    if (d.garantiaContratoTipo === 'porcentagem') {
        const pct = Number(String(d.garantiaContratoPorcentagem).replace(',', '.'));
        if (!(pct > 0)) erros.push('Garantia do contrato: informe o percentual.');
        else if (pct > 10) erros.push('Garantia do contrato: o percentual não pode ser superior a 10%.');
        else if (pct > 5 && vazio(d.garantiaContratoJustificativa)) erros.push('Garantia do contrato: percentual acima de 5% exige justificativa (complexidade técnica ou riscos envolvidos).');
    } else if (d.garantiaContratoTipo === 'nao_ha' && vazio(d.garantiaContratoNaoHaJustificativa)) {
        erros.push('Garantia do contrato: a não exigência de garantia deve ser justificada.');
    }

    if (d.vistoria === 'sim' && (!d.vistoriaDataInicio || !d.vistoriaDataFim || !d.vistoriaHorarioInicio || !d.vistoriaHorarioFim)) {
        erros.push('Vistoria: informe o período (datas) e o horário.');
    }

    return erros;
};
