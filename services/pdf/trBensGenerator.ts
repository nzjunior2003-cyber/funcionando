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
    return selected.map(opt => `${map[opt] || opt}`).join('\n\n');
};
// ============================================================================

export const generateTrBensPdf = (doc: jsPDF, data: TrBensData) => {
    const colorBlueHeader: [number, number, number] = [31, 78, 121];
    const colorYellowHeader: [number, number, number] = [252, 230, 157];
    const colorGrayLabel: [number, number, number] = [242, 242, 242];
    const colorWhiteLabel: [number, number, number] = [255, 255, 255];
    
    setDefaultFont(doc);
    const radio = (selected: boolean) => selected ? '[X]' : '[ ]';
    
    let currentY = drawInstitutionalHeader(doc, data.setor || '', "TERMO DE REFERÊNCIA DE BENS COMUNS", `PAE nº ${data.pae || 'aaaa/nnnn'}`);
    currentY += 5;

    // ============================================================================
    // TABELA 1: ITENS DA CONTRATAÇÃO
    // ============================================================================
    const hasLote = data.itens.some(item => item.loteId && item.loteId.trim() !== '');
    
    const lotesTotal: Record<string, number> = {};
    if (hasLote) {
        data.itens.forEach(it => {
            if (it.loteId) {
                lotesTotal[it.loteId] = (lotesTotal[it.loteId] || 0) + ((it.quantidade || 0) * (it.valorUnitario || 0));
            }
        });
    }

    const t1Head: any[] = [];
    t1Head.push([{ 
        content: '1. O QUE SERÁ CONTRATADO?\n(art. 6°, XXIII, a e i, da Lei Federal nº 14.133/21)', 
        colSpan: hasLote ? 9 : 8, 
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold' } 
    }]);

    const colNamesRow: any[] = [];
    if (hasLote) colNamesRow.push({ content: 'Grupo', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } });
    colNamesRow.push(
        { content: 'Item', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'Descrição', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'Código SIMAS', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'Und', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'Qtd', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'V. Unitário', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'V. Total', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'Cota', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } }
    );
    t1Head.push(colNamesRow);

    const t1Body: RowInput[] = [];
    let totalGlobal = 0;
    
    data.itens.forEach(item => {
        const subtotal = (item.quantidade || 0) * (item.valorUnitario || 0);
        totalGlobal += subtotal;

        // Regra ME/EPP
        const valorReferencia = (hasLote && item.loteId) ? lotesTotal[item.loteId] : subtotal;
        const cotaStr = (valorReferencia <= 80000 && valorReferencia > 0) ? 'Exclusiva ME/EPP' : 'Ampla Concorrência';

        const row: any[] = [];
        if (hasLote) row.push({ content: item.loteId || '-', styles: { halign: 'center', valign: 'middle' } });
        row.push(
            { content: item.item || '-', styles: { halign: 'center', valign: 'middle' } },
            { content: item.descricao || '', styles: { valign: 'middle', halign: 'justify', cellPadding: 2 } },
            { content: item.codigoSimas || '-', styles: { halign: 'center', valign: 'middle' } },
            { content: item.unidade || '-', styles: { halign: 'center', valign: 'middle' } },
            { content: (item.quantidade || 0).toString(), styles: { halign: 'center', valign: 'middle' } },
            { content: formatCurrency(item.valorUnitario), styles: { halign: 'right', valign: 'middle' } },
            { content: formatCurrency(subtotal), styles: { halign: 'right', valign: 'middle' } },
            { content: cotaStr, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } }
        );
        t1Body.push(row);
    });

    t1Body.push([
        { content: 'VALOR GLOBAL ESTIMADO', colSpan: hasLote ? 6 : 5, styles: { fontStyle: 'bold', halign: 'right', valign: 'middle', fillColor: colorGrayLabel } },
        { content: formatCurrency(totalGlobal), colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', valign: 'middle', fillColor: colorGrayLabel } }
    ]);

    autoTable(doc, {
        startY: currentY,
        head: t1Head,
        body: t1Body,
        theme: 'grid',
        styles: { fontSize: 8, lineColor: [0,0,0], lineWidth: 0.1, textColor: 0 },
        columnStyles: hasLote ? {
            0: { cellWidth: 10 }, 1: { cellWidth: 10 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 15 },
            4: { cellWidth: 10 }, 5: { cellWidth: 10 }, 6: { cellWidth: 24 }, 7: { cellWidth: 24 }, 8: { cellWidth: 20 }
        } : {
            0: { cellWidth: 10 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 15 }, 3: { cellWidth: 10 },
            4: { cellWidth: 10 }, 5: { cellWidth: 24 }, 6: { cellWidth: 24 }, 7: { cellWidth: 20 }
        },
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 6;

    // ============================================================================
    // LÓGICA DE DESENHO DE QUADRADINHOS REAIS E SISTEMA ZEBRA
    // ============================================================================
    const handleCheckboxWillDraw = (hookData: any) => {
        if (hookData.section === 'body' && hookData.cell.text) {
            hookData.cell.raw._checkboxes = [];
            for (let i = 0; i < hookData.cell.text.length; i++) {
                let line = hookData.cell.text[i];
                let match;
                const regex = /\[X\]|\[ \]/g;
                while ((match = regex.exec(line)) !== null) {
                    hookData.cell.raw._checkboxes.push({
                        lineIndex: i,
                        textBefore: line.substring(0, match.index),
                        checked: match[0] === '[X]'
                    });
                }
                hookData.cell.text[i] = line.replace(/\[X\]|\[ \]/g, '   '); 
            }
        }
    };

    const handleCheckboxDidDraw = (hookData: any) => {
        if (hookData.section === 'body' && hookData.cell.raw._checkboxes && hookData.cell.raw._checkboxes.length > 0) {
            doc.setFontSize(hookData.cell.styles.fontSize);
            doc.setFont(hookData.cell.styles.font, hookData.cell.styles.fontStyle);
            
            const padTop = typeof hookData.cell.padding === 'function' ? hookData.cell.padding('top') : hookData.cell.padding.top || 0;
            const padLeft = typeof hookData.cell.padding === 'function' ? hookData.cell.padding('left') : hookData.cell.padding.left || 0;
            const lineHt = hookData.cell.styles.fontSize * 1.15 * 0.352777; 
            
            let textY = hookData.cell.y + padTop;
            const totalTextHeight = hookData.cell.text.length * lineHt;
            if (hookData.cell.styles.valign === 'middle') {
                textY = hookData.cell.y + (hookData.cell.height - totalTextHeight) / 2;
            }

            hookData.cell.raw._checkboxes.forEach((cb: any) => {
                const widthBefore = doc.getTextWidth(cb.textBefore);
                const boxSize = 2.5;
                const boxX = hookData.cell.x + padLeft + widthBefore + 0.5;
                const boxY = textY + (cb.lineIndex * lineHt) - (boxSize / 2) + 1.2; 

                doc.setDrawColor(0);
                doc.setLineWidth(0.2);
                doc.rect(boxX, boxY, boxSize, boxSize, 'S');
                if (cb.checked) {
                    doc.line(boxX, boxY, boxX + boxSize, boxY + boxSize);
                    doc.line(boxX + boxSize, boxY, boxX, boxY + boxSize);
                }
            });
        }
    };

    // ============================================================================
    // TABELA 2: QUESTIONÁRIO DO FORMULÁRIO
    // ============================================================================
    const t2Body: RowInput[] = [];
    let isZebra = false;

    const pushHeader = (title: string) => {
        t2Body.push([{ content: title, colSpan: 2, styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold' } }]);
        isZebra = false;
    };

    const pushRow = (q: string, a: string, justificado: boolean = false) => {
        const bg = isZebra ? colorGrayLabel : colorWhiteLabel;
        isZebra = !isZebra;
        t2Body.push([
            { content: q, styles: { fillColor: bg, fontStyle: 'bold', valign: 'middle' } },
            { content: a, styles: { fillColor: bg, valign: 'middle', halign: justificado ? 'justify' : 'left', cellPadding: 3 } }
        ]);
    };

    const pushFullRow = (content: string, justificado: boolean = false) => {
        const bg = isZebra ? colorGrayLabel : colorWhiteLabel;
        isZebra = !isZebra;
        t2Body.push([{ content: content, colSpan: 2, styles: { fillColor: bg, valign: 'middle', halign: justificado ? 'justify' : 'left', cellPadding: 3 } }]);
    };

    pushHeader('2. JUSTIFICATIVA PARA O AGRUPAMENTO DE ITENS\n(art. 40, §§ 2° e 3°, da Lei Federal nº 14.133/21)');
    pushFullRow(data.justificativaAgrupamento || 'Não se aplica.', true);

    pushHeader('3. DESCRIÇÃO DA SOLUÇÃO\n(art. 6°, XXIII, c, da Lei Federal nº 14.133/21)');
    pushRow('3.1. QUAL O MOTIVO DA CONTRATAÇÃO?', data.motivoContratacao || '-', true);

    pushHeader('4. NATUREZA DO BEM\n(art. 6°, XXIII, a, da Lei Federal nº 14.133/21)');
    pushFullRow(`${radio(data.naturezaBem === 'comum')} Comum.\n\n${radio(data.naturezaBem === 'especial')} Especial.`, false);

    pushHeader('5. PROVA DE QUALIDADE, RENDIMENTO, DURABILIDADE E SEGURANÇA\n(art. 40, § 1°, I e III, da Lei Federal nº 14.133/21)');
    pushRow('5.1. HAVERÁ PROVA DE QUALIDADE?', `${radio(data.provaQualidade === 'sim')} Sim. Justificativa: ${data.justificativaProvaQualidade || '-'}\n\n${radio(data.provaQualidade === 'nao')} Não.`);
    pushRow('5.2. O EDITAL EXIGIRÁ AMOSTRA?', `${radio(data.amostra === 'sim')} Sim. Prazo: ${data.amostraPrazo || '-'} dias úteis.\n\n${radio(data.amostra === 'nao')} Não.`);
    pushRow('5.3. HAVERÁ GARANTIA DO BEM?', `${radio(data.garantiaBem === 'sim')} Sim. Itens: ${data.garantiaItens || '-'}. Prazo: ${data.garantiaBemMeses || '-'} meses.\n\n${radio(data.garantiaBem === 'nao')} Não.`);
    pushRow('5.4. HAVERÁ ASSISTÊNCIA TÉCNICA?', `${radio(data.assistenciaTecnica === 'sim')} Sim. Itens: ${data.assistenciaTecnicaItens || '-'}. Prazo: ${data.assistenciaTecnicaMeses || '-'} meses.\nMODO: ${data.assistenciaTecnicaModo === 'propria' ? 'Própria' : 'Empresa Credenciada'}\n\n${radio(data.assistenciaTecnica === 'nao')} Não.`);

    pushHeader('6. CRITÉRIOS DE SELEÇÃO\n(art. 6°, XXIII, h, da Lei Federal nº 14.133/21)');
    const fC = data.formaContratacao || [];
    pushRow('6.1. FORMA DE CONTRATAÇÃO', [
        `${radio(fC.includes('inexigibilidade'))} Inexigibilidade (Art. 74, Inciso ${data.inexigibilidadeInciso || '...'})`,
        `${radio(fC.includes('dispensa_valor'))} Dispensa por Valor (Art. 75, II)`,
        `${radio(fC.includes('dispensa_art75'))} Dispensa (Art. 75, Inciso ${data.dispensaInciso || '...'})`,
        `${radio(fC.includes('pregao'))} Pregão eletrônico`,
        `${radio(fC.includes('pregao_rp'))} Pregão para Registro de Preços`
    ].join('\n\n'));
    pushRow('6.2. CRITÉRIO DE JULGAMENTO', `${radio(data.criterioJulgamento === 'menor_preco')} Menor preço.\n\n${radio(data.criterioJulgamento === 'maior_desconto')} Maior desconto.`);
    pushRow('6.3. O ORÇAMENTO É SIGILOSO?', `${radio(data.orcamentoSigiloso === 'sim')} Sim. Justificativa: ${data.justificativaOrcamentoSigiloso || '-'}\n\n${radio(data.orcamentoSigiloso === 'nao')} Não.`);
    pushRow('6.4. ACEITABILIDADE', data.criterioAceitabilidade || '-', true);

    pushHeader('7. REQUISITOS DA CONTRATADA');
    pushRow('7.1. HABILITAÇÃO JURÍDICA', translateOptions(data.habilitacaoJuridica, mapJuridica));
    pushRow('7.2. FISCAL / SOCIAL', translateOptions(data.habilitacaoFiscal, mapFiscal));
    pushRow('7.3. QUALIFICAÇÃO ECONÔMICA', translateOptions(data.qualificacaoEconomica, mapEconomica));
    pushRow('7.4. QUALIFICAÇÃO TÉCNICA EXIGIDA?', `${radio(data.habilitacaoTecnicaExigida === 'sim')} Sim. Exigência: ${data.habilitacaoTecnicaQual || '-'}\nJustificativa: ${data.habilitacaoTecnicaPorque || '-'}\n\n${radio(data.habilitacaoTecnicaExigida === 'nao')} Não.`);
    
    const qualifTec = data.qualificacoesTecnicas || [];
    const qualifTecText = qualifTec.length === 0 ? 'Conforme Edital.' : qualifTec.map(opt => {
        const baseText = `${mapQualificacaoTecnica[opt] || opt}`;
        const just = data.qualificacoesTecnicasJustificativas?.[opt];
        return just ? `${baseText}\n  Justificativa: ${just}` : baseText;
    }).join('\n\n');
    pushRow('7.5. COMPROVAÇÕES TÉCNICAS', qualifTecText);
    
    // Agora o 7.6 também recebe o `true` no final para ficar justificado
    pushRow('7.6. CRITÉRIO DE SUSTENTABILIDADE?', `${radio(data.criterioSustentabilidade === 'sim')} Sim. Detalhes: ${data.criterioSustentabilidadeDesc || '-'}\n\n${radio(data.criterioSustentabilidade === 'nao')} Não.`, true);
    
    pushRow('7.7. RISCOS', `${radio(data.riscosAssumidos === 'sim')} Sim. Detalhes: ${data.riscosAssumidosDesc || '-'}\n\n${radio(data.riscosAssumidos === 'nao')} Não.`);
    pushRow('7.8. CONSÓRCIO', `${radio(data.participacaoConsorcio === 'sim')} Sim (${data.participacaoConsorcioPercentual || '0'}% acréscimo).\n\n${radio(data.participacaoConsorcio === 'nao')} Não. Motivo: ${data.participacaoConsorcioJustificativa || '-'}`);
    pushRow('7.9. SUBCONTRATAÇÃO?', `${radio(data.subcontratacao === 'sim')} Sim. Opção: ${data.subcontratacaoOpcao || '-'}\nDetalhes: ${data.subcontratacaoDetalhes || '-'}\n\n${radio(data.subcontratacao === 'nao')} Não.`);

    pushHeader('8. FORMA DE ENTREGA DO BEM');
    pushRow('8.1. FORMA', data.formaEntregaTipo === 'unica' ? 'Integral de uma só vez.' : `Parcelada em ${data.entregaParcelasX || '-'} parcelas. A 1ª em até ${data.entregaParcelasY || '-'} dias da nota de empenho, e as demais mediante aviso com ${data.entregaParcelasZ || '-'} dias de antecedência.`);
    pushRow('8.2. LOCAL E HORA', data.localEntrega || '-');
    if (data.prazoValidadePereciveis) pushRow('8.3. VALIDADE (PERECÍVEIS)', `O prazo de validade não poderá ser inferior a ${data.prazoValidadePereciveis} dias da entrega.`);

    pushHeader('9. PRAZO, FORMA DE PAGAMENTO E GARANTIA DO CONTRATO');
    pushRow('9.1. PRAZO DO CONTRATO', `${data.prazoContrato === '30' ? '30 dias (Pronta Entrega)' : '12 meses'}.\nPossibilidade de Prorrogação: ${data.possibilidadeProrrogacao === 'sim' ? 'Sim' : 'Não'}.`);
    
    const pgOpts = data.pagamentoOpcoes || [];
    let pgText = '';
    if(pgOpts.includes('ordem_bancaria')) pgText += '• O pagamento será realizado por ordem bancária creditada em conta corrente.\n';
    if(pgOpts.includes('banpara')) pgText += '• Banco do Estado do Pará - BANPARÁ.\n';
    if(pgOpts.includes('qualquer_banco')) pgText += '• Qualquer instituição bancária indicada pela contratada.\n';
    if(pgOpts.includes('prazo_NF')) pgText += `• O prazo para pagamento será de até ${data.pagamentoPrazoDias || '30'} dias corridos após o recebimento da nota fiscal.\n`;
    if(pgOpts.includes('regularidade')) pgText += `• Prova da Regularidade Fiscal: ${data.pagamentoRegularidade || 'Conforme Edital'}\n`;
    pushRow('9.2. PAGAMENTO', pgText || 'Conforme Edital.');
    
    pushRow('9.3. GARANTIA DE CONTRATO', `${radio(data.garantiaContratoTipo === 'porcentagem')} Sim: ${data.garantiaContratoPorcentagem || '0'}% do valor inicial. Justificativa: ${data.garantiaContratoJustificativa || '-'}\n\n${radio(data.garantiaContratoTipo === 'nao_ha')} Não há.`);
    pushRow('9.4. REAJUSTE', `Índice: ${data.reajusteIndice || 'N/A'}. Periodicidade: a cada ${data.reajusteMeses || '-'} meses.`);

    pushHeader('10. PREVISÃO ORÇAMENTÁRIA');
    pushRow('FUNCIONAL', data.dadosOrcamentariosFuncional || '-');
    pushRow('ELEMENTO E FONTE', `Elemento: ${data.dadosOrcamentariosElemento || '-'}   |   Fonte: ${data.dadosOrcamentariosFonte || '-'}`);

    autoTable(doc, {
        startY: currentY,
        body: t2Body,
        theme: 'grid',
        styles: { fontSize: 8, lineColor: [0,0,0], lineWidth: 0.1, textColor: 0, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 'auto' }
        },
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: MARGIN_BOTTOM },
        willDrawCell: handleCheckboxWillDraw,
        didDrawCell: handleCheckboxDidDraw
    });

    // ============================================================================
    // ASSINATURAS E RODAPÉ
    // ============================================================================
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    if (finalY > PAGE_HEIGHT - 65) {
        doc.addPage();
        finalY = MARGIN_TOP + 10;
    }

    doc.setFontSize(10);
    doc.text(`${data.cidade || 'Belém'} (PA), ${formatDate(data.data)}.`, PAGE_WIDTH / 2, finalY, { align: 'center' });
    
    finalY += 30;
    drawFormattedSignature(doc, data.nome, data.nomeGuerra, data.cargo, data.funcao, PAGE_WIDTH / 2, finalY);

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