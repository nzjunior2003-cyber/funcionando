import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { TrBensData } from '../../types';
import { 
    formatDate, 
    formatCurrency,
    setDefaultFont,
    drawFormattedSignature,
    drawInstitutionalHeader,
    drawInstitutionalFooter
} from './pdfUtils';
import { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM } from './pdfConstants';

// ============================================================================
// DICIONÁRIOS DE TRADUÇÃO (TEXTOS INTEGRAIS DA LEI 14.133/21)
// ============================================================================
const mapJuridica: Record<string, string> = {
    '7.1.1': '7.1.1. Pessoa física: cédula de identidade (RG) ou documento equivalente que demonstre a capacidade civil;',
    '7.1.2': '7.1.2. Empresário individual: inscrição no Registro Público de Empresas Mercantis;',
    '7.1.3': '7.1.3. Microempreendedor Individual - MEI: Certificado da Condição de Microempreendedor Individual - CCMEI;',
    '7.1.4': '7.1.4. Sociedade empresária estrangeira: portaria de autorização de funcionamento no Brasil;',
    '7.1.5': '7.1.5. Sociedade simples: inscrição do ato constitutivo no Registro Civil de Pessoas Jurídicas;',
    '7.1.6': '7.1.6. Filial, sucursal ou agência: averbação do ato constitutivo da filial, sucursal ou agência;',
    '7.1.7': '7.1.7. Sociedade cooperativa: ata de fundação e estatuto social, com a ata da assembleia que o aprovou;',
    '7.1.8': '7.1.8. Agricultor familiar: Declaração de Aptidão ao Pronaf (DAP) ou Cadastro Nacional da Agricultura Familiar (CAF);',
    '7.1.9': '7.1.9. Produtor Rural: matrícula no CEI - Cadastro Específico do INSS;',
    '7.1.10': '7.1.10. Ato de autorização para o exercício da atividade, quando exigido por lei;',
    '7.1.11': '7.1.11. Documentos acompanhados de todas as alterações ou da consolidação respectiva.'
};

const mapFiscal: Record<string, string> = {
    '7.2.1': '7.2.1. Prova de inscrição no CNPJ ou no CPF;',
    '7.2.2': '7.2.2. Prova de regularidade fiscal perante a Fazenda Nacional, Estadual e/ou Municipal do domicílio ou sede do licitante;',
    '7.2.3': '7.2.3. Prova de regularidade com o FGTS;',
    '7.2.4': '7.2.4. Prova de inexistência de débitos inadimplidos perante a Justiça do Trabalho (CNDT);',
    '7.2.5': '7.2.5. Prova de inscrição no cadastro de contribuintes Estadual ou Municipal, relativo ao domicílio ou sede do licitante;',
    '7.2.6': '7.2.6. Prova de regularidade com a Fazenda Estadual ou Municipal do domicílio ou sede do licitante;',
    '7.2.7': '7.2.7. Caso o fornecedor seja considerado isento dos tributos, comprovação mediante declaração da Fazenda respectiva;',
    '7.2.8': '7.2.8. MEI que pretenda auferir benefícios do tratamento diferenciado: comprovação da regularidade fiscal.'
};

const mapEconomica: Record<string, string> = {
    '7.3.1': '7.3.1. Certidão negativa de insolvência civil expedida pelo distribuidor do domicílio ou sede;',
    '7.3.2': '7.3.2. Certidão negativa de falência expedida pelo distribuidor da sede do licitante;',
    '7.3.3': '7.3.3. Balanço patrimonial e demonstrações contábeis dos 2 (dois) últimos exercícios sociais;',
    '7.3.4': '7.3.4. Índices de Liquidez (LG, LC e SG) superiores a 1 (um);',
    '7.3.5': '7.3.5. Empresas criadas no exercício financeiro da licitação: apresentação do balanço de abertura;',
    '7.3.6': '7.3.6. Documentos limitar-se-ão ao último exercício no caso de fornecimento de bens para pronta entrega;',
    '7.3.7': '7.3.7. Documentos com base no limite definido pela RFB para pequenas e médias empresas;',
    '7.3.8': '7.3.8. Exigência de capital mínimo ou patrimônio líquido mínimo;',
    '7.3.9': '7.3.9. Balanço atestado por profissional habilitado.'
};

const mapQualificacaoTecnica: Record<string, string> = {
    'ciencia': 'Declaração de que o licitante tomou conhecimento de todas as informações necessárias para o cumprimento das obrigações.',
    'registro': 'Apresentação de registro ou inscrição na entidade profissional competente.',
    'pessoal': 'Indicação do pessoal técnico, das instalações e do aparelhamento adequados e disponíveis para a execução.',
    'atestado': 'Atestado de capacidade técnica operacional (fornecimento de bens pertinentes e compatíveis em características e prazos).',
    'lei_especial': 'Cumprimento de outro requisito previsto em lei especial.',
    'nao_exigida': 'Não será exigida prova de qualificação técnica em razão da baixa complexidade da contratação.'
};

const translateOptions = (selected: string[] | undefined, map: Record<string, string>) => {
    if (!selected || selected.length === 0) return 'Conforme Edital.';
    return selected.map(opt => `• ${map[opt] || opt}`).join('\n\n');
};
// ============================================================================

export const generateTrBensPdf = (doc: jsPDF, data: TrBensData) => {
    const colorBlueHeader: [number, number, number] = [31, 78, 121];
    const colorYellowHeader: [number, number, number] = [252, 230, 157];
    const colorGrayLabel: [number, number, number] = [242, 242, 242];
    const colorWhiteLabel: [number, number, number] = [255, 255, 255];
    
    setDefaultFont(doc);
    const radio = (selected: boolean) => selected ? '[ X ]' : '[   ]';
    let startY = drawInstitutionalHeader(doc, data.setor || '', "TERMO DE REFERÊNCIA DE BENS COMUNS", `PAE nº ${data.pae || 'aaaa/nnnn'}`);
    const body: RowInput[] = [];

    // --- 1. O QUE SERÁ CONTRATADO ---
    body.push([{
        content: '1.  O QUE SERÁ CONTRATADO?\n(art. 6°, XXIII, a e i, da Lei Federal nº 14.133/21)',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', valign: 'middle', fontStyle: 'bold', fontSize: 9 }
    }]);

    body.push([
        { content: 'Grupo', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: 'Item', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: 'Descrição', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: 'Código SIMAS', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: 'Und', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: 'Qtd', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: 'V. Unitário Estimado', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: 'V. Total Estimado', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: 'Cota', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', valign: 'middle' } }
    ]);

    let totalGlobal = 0;
    if (data.itens && data.itens.length > 0) {
        data.itens.forEach(item => {
            const subtotal = (item.quantidade || 0) * (item.valorUnitario || 0);
            totalGlobal += subtotal;
            body.push([
                { content: item.loteId || '-', styles: { halign: 'center', valign: 'middle' } },
                { content: item.item || '-', styles: { halign: 'center', valign: 'middle' } },
                { content: item.descricao || '', styles: { valign: 'middle', halign: 'justify', cellPadding: 2 } },
                { content: item.codigoSimas || '-', styles: { halign: 'center', valign: 'middle' } },
                { content: item.unidade || '-', styles: { halign: 'center', valign: 'middle' } },
                { content: (item.quantidade || 0).toString(), styles: { halign: 'center', valign: 'middle' } },
                { content: formatCurrency(item.valorUnitario), styles: { halign: 'right', valign: 'middle' } },
                { content: formatCurrency(subtotal), styles: { halign: 'right', valign: 'middle' } },
                { content: item.concorrencia || 'Ampla', styles: { halign: 'center', valign: 'middle' } }
            ]);
        });
    }

    body.push([
        { content: 'VALOR GLOBAL ESTIMADO', colSpan: 7, styles: { fontStyle: 'bold', halign: 'right', valign: 'middle', fillColor: colorGrayLabel } },
        { content: formatCurrency(totalGlobal), colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', valign: 'middle', fillColor: colorGrayLabel } }
    ]);

    // --- 2. JUSTIFICATIVA AGRUPAMENTO ---
    body.push([{
        content: '2.  JUSTIFICATIVA PARA O AGRUPAMENTO DE ITENS\n(art. 40, §§ 2° e 3°, da Lei Federal nº 14.133/21)',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    body.push([{
        content: data.justificativaAgrupamento || 'Não se aplica.',
        colSpan: 9,
        styles: { fontStyle: 'normal', minCellHeight: 15, valign: 'middle', halign: 'justify', cellPadding: 3 }
    }]);

    // --- 3. DESCRIÇÃO DA SOLUÇÃO ---
    body.push([{
        content: '3.  DESCRIÇÃO DA SOLUÇÃO\n(art. 6°, XXIII, c, da Lei Federal nº 14.133/21)',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    body.push([
        { content: '3.1. QUAL O MOTIVO DA CONTRATAÇÃO?', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: data.motivoContratacao || '', colSpan: 7, styles: { minCellHeight: 20, valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);

    // --- 4. NATUREZA DO BEM ---
    body.push([{
        content: '4.  NATUREZA DO BEM\n(art. 6°, XXIII, a, da Lei Federal nº 14.133/21)',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    body.push([{
        content: `${radio(data.naturezaBem === 'comum')} Comum.\n\n${radio(data.naturezaBem === 'especial')} Especial.`,
        colSpan: 9,
        styles: { halign: 'left', cellPadding: 3, valign: 'middle' }
    }]);

    // --- 5. QUALIDADE E ASSISTÊNCIA ---
    body.push([{
        content: '5.  PROVA DE QUALIDADE, RENDIMENTO, DURABILIDADE E SEGURANÇA DO BEM\n(art. 40, § 1°, I e III, da Lei Federal nº 14.133/21)',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    body.push([
        { content: '5.1. HAVERÁ PROVA DE QUALIDADE?', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.provaQualidade === 'sim')} Sim. Justificativa: ${data.justificativaProvaQualidade || '-'}\n${radio(data.provaQualidade === 'nao')} Não.`, colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);
    body.push([
        { content: '5.2. O EDITAL EXIGIRÁ AMOSTRA?', colSpan: 2, styles: { fillColor: colorWhiteLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.amostra === 'sim')} Sim. Prazo: ${data.amostraPrazo || '-'} dias úteis.\n${radio(data.amostra === 'nao')} Não.`, colSpan: 7, styles: { valign: 'middle', cellPadding: 3 } }
    ]);
    body.push([
        { content: '5.3. HAVERÁ GARANTIA DO BEM?', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.garantiaBem === 'sim')} Sim. Itens: ${data.garantiaItens || '-'}. Prazo: ${data.garantiaBemMeses || '-'} meses.\n${radio(data.garantiaBem === 'nao')} Não.`, colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);
    body.push([
        { content: '5.4. HAVERÁ ASSISTÊNCIA TÉCNICA?', colSpan: 2, styles: { fillColor: colorWhiteLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.assistenciaTecnica === 'sim')} Sim. Itens: ${data.assistenciaTecnicaItens || '-'}. Prazo: ${data.assistenciaTecnicaMeses || '-'} meses. MODO: ${data.assistenciaTecnicaModo === 'propria' ? 'Própria' : 'Empresa Credenciada'}\n${radio(data.assistenciaTecnica === 'nao')} Não.`, colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);

    // --- 6. CRITÉRIOS DE SELEÇÃO ---
    body.push([{
        content: '6.  CRITÉRIOS DE SELEÇÃO\n(art. 6°, XXIII, h, da Lei Federal nº 14.133/21)',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    const fC = data.formaContratacao || [];
    body.push([
        { content: '6.1. FORMA DE CONTRATAÇÃO', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: [
            `${radio(fC.includes('inexigibilidade'))} Inexigibilidade (Art. 74, Inciso ${data.inexigibilidadeInciso || '...'})`,
            `${radio(fC.includes('dispensa_valor'))} Dispensa por Valor (Art. 75, II)`,
            `${radio(fC.includes('dispensa_art75'))} Dispensa (Art. 75, Inciso ${data.dispensaInciso || '...'})`,
            `${radio(fC.includes('pregao'))} Pregão eletrônico`,
            `${radio(fC.includes('pregao_rp'))} Pregão para Registro de Preços`
        ].join('\n\n'), colSpan: 7, styles: { valign: 'middle', cellPadding: 3 } }
    ]);
    body.push([
        { content: '6.2. CRITÉRIO DE JULGAMENTO', colSpan: 2, styles: { fillColor: colorWhiteLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.criterioJulgamento === 'menor_preco')} Menor preço.\n${radio(data.criterioJulgamento === 'maior_desconto')} Maior desconto.`, colSpan: 7, styles: { valign: 'middle', cellPadding: 3 } }
    ]);
    body.push([
        { content: '6.3. O ORÇAMENTO É SIGILOSO?', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.orcamentoSigiloso === 'sim')} Sim. Justificativa: ${data.justificativaOrcamentoSigiloso || '-'}\n${radio(data.orcamentoSigiloso === 'nao')} Não.`, colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);
    body.push([
        { content: '6.4. ACEITABILIDADE', colSpan: 2, styles: { fillColor: colorWhiteLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: data.criterioAceitabilidade || '-', colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);
    body.push([
        { content: '6.5. EXCLUSIVIDADE ME/EPP?', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.participacaoME === 'sim')} Sim. Itens Exclusivos: ${data.participacaoMEItens || '-'}\n${radio(data.participacaoME === 'nao')} Não.`, colSpan: 7, styles: { valign: 'middle', cellPadding: 3 } }
    ]);

    // --- 7. REQUISITOS DA CONTRATADA ---
    body.push([{
        content: '7.  REQUISITOS DA CONTRATADA',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    body.push([
        { content: '7.1. HABILITAÇÃO JURÍDICA', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: translateOptions(data.habilitacaoJuridica, mapJuridica), colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);
    body.push([
        { content: '7.2. FISCAL / SOCIAL', colSpan: 2, styles: { fillColor: colorWhiteLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: translateOptions(data.habilitacaoFiscal, mapFiscal), colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);
    body.push([
        { content: '7.3. QUALIFICAÇÃO ECONÔMICA', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: translateOptions(data.qualificacaoEconomica, mapEconomica), colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);
    body.push([
        { content: '7.4. QUALIFICAÇÃO TÉCNICA EXIGIDA?', colSpan: 2, styles: { fillColor: colorWhiteLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.habilitacaoTecnicaExigida === 'sim')} Sim. Exigência: ${data.habilitacaoTecnicaQual || '-'}\nJustificativa: ${data.habilitacaoTecnicaPorque || '-'}\n\n${radio(data.habilitacaoTecnicaExigida === 'nao')} Não.`, colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);

    const qualifTec = data.qualificacoesTecnicas || [];
    const qualifTecText = qualifTec.length === 0 ? 'Conforme Edital.' : qualifTec.map(opt => {
        const baseText = `• ${mapQualificacaoTecnica[opt] || opt}`;
        const just = data.qualificacoesTecnicasJustificativas?.[opt];
        return just ? `${baseText}\n  Justificativa: ${just}` : baseText;
    }).join('\n\n');

    body.push([
        { content: '7.5. COMPROVAÇÕES TÉCNICAS', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: qualifTecText, colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);
    body.push([
        { content: '7.6. CRITÉRIO DE SUSTENTABILIDADE?', colSpan: 2, styles: { fillColor: colorWhiteLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.criterioSustentabilidade === 'sim')} Sim. Detalhes: ${data.criterioSustentabilidadeDesc || '-'}\n${radio(data.criterioSustentabilidade === 'nao')} Não.`, colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);
    body.push([
        { content: '7.7. RISCOS', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.riscosAssumidos === 'sim')} Sim. Detalhes: ${data.riscosAssumidosDesc || '-'}\n${radio(data.riscosAssumidos === 'nao')} Não.`, colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);
    body.push([
        { content: '7.8. CONSÓRCIO', colSpan: 2, styles: { fillColor: colorWhiteLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.participacaoConsorcio === 'sim')} Sim (${data.participacaoConsorcioPercentual || '0'}% acréscimo).\n${radio(data.participacaoConsorcio === 'nao')} Não. Motivo: ${data.participacaoConsorcioJustificativa || '-'}`, colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);
    body.push([
        { content: '7.9. SUBCONTRATAÇÃO?', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.subcontratacao === 'sim')} Sim. Opção: ${data.subcontratacaoOpcao || '-'}\nDetalhes: ${data.subcontratacaoDetalhes || '-'}\n\n${radio(data.subcontratacao === 'nao')} Não.`, colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);

    // --- 8. ENTREGA ---
    body.push([{
        content: '8.  FORMA DE ENTREGA DO BEM',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    body.push([
        { content: '8.1. FORMA', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: data.formaEntregaTipo === 'unica' 
            ? 'Integral de uma só vez.' 
            : `Parcelada em ${data.entregaParcelasX || '-'} parcelas. A 1ª em até ${data.entregaParcelasY || '-'} dias da nota de empenho, e as demais mediante aviso com ${data.entregaParcelasZ || '-'} dias de antecedência.`, 
          colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);
    body.push([
        { content: '8.2. LOCAL E HORA', colSpan: 2, styles: { fillColor: colorWhiteLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: data.localEntrega || '-', colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);
    if (data.prazoValidadePereciveis) {
        body.push([
            { content: '8.3. VALIDADE (PERECÍVEIS)', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
            { content: `O prazo de validade não poderá ser inferior a ${data.prazoValidadePereciveis} dias da entrega.`, colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
        ]);
    }

    // --- 9. PAGAMENTO E REAJUSTE ---
    body.push([{
        content: '9.  PRAZO, FORMA DE PAGAMENTO E GARANTIA DO CONTRATO',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    body.push([
        { content: '9.1. PRAZO DO CONTRATO', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${data.prazoContrato === '30' ? '30 dias (Pronta Entrega)' : '12 meses'}.\nPossibilidade de Prorrogação: ${data.possibilidadeProrrogacao === 'sim' ? 'Sim' : 'Não'}.`, colSpan: 7, styles: { valign: 'middle', cellPadding: 3 } }
    ]);

    const pgOpts = data.pagamentoOpcoes || [];
    let pgText = '';
    if(pgOpts.includes('ordem_bancaria')) pgText += '• O pagamento será realizado por ordem bancária creditada em conta corrente.\n';
    if(pgOpts.includes('banpara')) pgText += '• Banco do Estado do Pará - BANPARÁ.\n';
    if(pgOpts.includes('qualquer_banco')) pgText += '• Qualquer instituição bancária indicada pela contratada.\n';
    if(pgOpts.includes('prazo_NF')) pgText += `• O prazo para pagamento será de até ${data.pagamentoPrazoDias || '30'} dias corridos após o recebimento da nota fiscal.\n`;
    if(pgOpts.includes('regularidade')) pgText += `• Prova da Regularidade Fiscal: ${data.pagamentoRegularidade || 'Conforme Edital'}\n`;

    body.push([
        { content: '9.2. PAGAMENTO', colSpan: 2, styles: { fillColor: colorWhiteLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: pgText || 'Conforme Edital.', colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);
    body.push([
        { content: '9.3. GARANTIA DE CONTRATO', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.garantiaContratoTipo === 'porcentagem')} Sim: ${data.garantiaContratoPorcentagem || '0'}% do valor inicial. Justificativa: ${data.garantiaContratoJustificativa || '-'}\n\n${radio(data.garantiaContratoTipo === 'nao_ha')} Não há.`, colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);
    body.push([
        { content: '9.4. REAJUSTE', colSpan: 2, styles: { fillColor: colorWhiteLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `Índice: ${data.reajusteIndice || 'N/A'}. Periodicidade: a cada ${data.reajusteMeses || '-'} meses.`, colSpan: 7, styles: { valign: 'middle', cellPadding: 3 } }
    ]);

    // --- 10. PREVISÃO ORÇAMENTÁRIA ---
    body.push([{
        content: '10.  PREVISÃO ORÇAMENTÁRIA',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    body.push([
        { content: 'FUNCIONAL', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: data.dadosOrcamentariosFuncional || '-', colSpan: 7, styles: { valign: 'middle', halign: 'justify', cellPadding: 3 } }
    ]);
    body.push([
        { content: 'ELEMENTO E FONTE', colSpan: 2, styles: { fillColor: colorWhiteLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `Elemento: ${data.dadosOrcamentariosElemento || '-'}   |   Fonte: ${data.dadosOrcamentariosFonte || '-'}`, colSpan: 7, styles: { valign: 'middle', cellPadding: 3 } }
    ]);

    // Gerar Tabela Principal
    autoTable(doc, {
        startY: startY + 5,
        body: body,
        theme: 'grid',
        styles: { fontSize: 8, lineColor: [0,0,0], lineWidth: 0.1, textColor: 0, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 12 }, 
            1: { cellWidth: 12 }, 
            2: { cellWidth: 'auto' }, 
            3: { cellWidth: 18 }, 
            4: { cellWidth: 10 }, 
            5: { cellWidth: 12 }, 
            6: { cellWidth: 22 }, 
            7: { cellWidth: 22 }, 
            8: { cellWidth: 18 }  
        },
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: MARGIN_BOTTOM }
    });

    // Assinatura Final Centralizada e com espaço para Carimbo
    const lastAutoTable = (doc as any).lastAutoTable;
    let finalY = lastAutoTable ? lastAutoTable.finalY + 15 : MARGIN_TOP + 20;
    
    if (finalY > PAGE_HEIGHT - 65) {
        doc.addPage();
        finalY = MARGIN_TOP + 10;
    }

    doc.setFontSize(10);
    doc.text(`${data.cidade || 'Belém'} (PA), ${formatDate(data.data)}.`, PAGE_WIDTH / 2, finalY, { align: 'center' });
    
    finalY += 30; 
    drawFormattedSignature(doc, data.nome, data.nomeGuerra, data.cargo, data.funcao, PAGE_WIDTH / 2, finalY);

    // Lógica do Rodapé
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (i === totalPages) {
            drawInstitutionalFooter(doc, data.setor || '', i, totalPages);
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`Página ${i} de ${totalPages}`, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 10, { align: 'right' });
        }
    }
};