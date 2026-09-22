import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { TrBensData } from '../../types';
import {
    formatDate,
    formatCurrency,
    setDefaultFont,
    drawInstitutionalHeader,
    drawInstitutionalFooter,
    sanitizeText
} from './pdfUtils';
import { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_TOP, MARGIN_BOTTOM } from './pdfConstants';

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

export const generateTrBensPdf = (doc: jsPDF, data: TrBensData) => {
    const L_MARGIN = 8;
    const R_MARGIN = 8;

    const colorBlueHeader: [number, number, number] = [31, 78, 121];
    const colorYellowHeader: [number, number, number] = [252, 230, 157];
    const colorGrayLabel: [number, number, number] = [242, 242, 242];
    const colorWhiteLabel: [number, number, number] = [255, 255, 255];
    
    setDefaultFont(doc);
    const radio = (selected: boolean) => selected ? '[X]' : '[  ]';
    
    let currentY = drawInstitutionalHeader(doc, data.setor || '', "TERMO DE REFERÊNCIA DE BENS COMUNS", `PAE nº ${data.pae || 'aaaa/nnnn'}`);
    currentY += 5;

    const advancedWillDrawCell = (hookData: any) => {
        if (hookData.section === 'body') {
            const cell = hookData.cell;
            if (!cell.text || !Array.isArray(cell.text)) return;
            
            (cell as any).checkboxes = [];
            let modifiedText = [...cell.text];
            
            for (let i = 0; i < modifiedText.length; i++) {
                let replacedLine = modifiedText[i];
                let searchIdx = 0;
                
                while(true) {
                    let openIdx = replacedLine.indexOf('[', searchIdx);
                    if (openIdx === -1) break;
                    let closeIdx = replacedLine.indexOf(']', openIdx);
                    if (closeIdx === -1) break;

                    let inside = replacedLine.substring(openIdx + 1, closeIdx);
                    
                    if (inside.trim() === 'X' || inside.trim() === '') {
                        let isChecked = inside.includes('X');
                        let textBefore = replacedLine.substring(0, openIdx);

                        (cell as any).checkboxes.push({
                            lineIndex: i,
                            checked: isChecked,
                            textBefore: textBefore
                        });

                        replacedLine = replacedLine.substring(0, openIdx) + '   ' + replacedLine.substring(closeIdx + 1);
                        searchIdx = openIdx + 3;
                    } else {
                        searchIdx = closeIdx + 1;
                    }
                }
                modifiedText[i] = replacedLine;
            }

            (cell as any)._myLines = modifiedText;
            cell.text = []; 
        }
    };

    const advancedDidDrawCell = (hookData: any) => {
        if (hookData.section === 'body') {
            const cell = hookData.cell;
            const styles = cell.styles;
            const fontSizeMm = (styles.fontSize * 25.4) / 72;
            const lineHeight = fontSizeMm * (styles.lineHeightFactor || 1.15); 
            
            let padTop = 1.2, padLeft = 1.2, padRight = 1.2;
            if (typeof styles.cellPadding === 'number') {
                padTop = padLeft = padRight = styles.cellPadding;
            } else if (styles.cellPadding) {
                padTop = (styles.cellPadding as any).top || 1.2;
                padLeft = (styles.cellPadding as any).left || 1.2;
                padRight = (styles.cellPadding as any).right || 1.2;
            }

            const textX = cell.x + padLeft;
            const maxWidth = cell.width - padLeft - padRight;

            doc.setFont(styles.font, styles.fontStyle);
            doc.setFontSize(styles.fontSize);

            const lines = (cell as any)._myLines;
            if (!lines || lines.length === 0) return;

            const textHeight = lines.length * lineHeight;
            let startY = cell.y + padTop;
            if (styles.valign === 'middle') {
                startY = cell.y + (cell.height - textHeight) / 2;
            }

            const checkboxes = (cell as any).checkboxes;
            if (checkboxes && checkboxes.length > 0) {
                checkboxes.forEach((cb: any) => {
                    const lineY = startY + (cb.lineIndex * lineHeight);
                    const boxSize = 2.1; 
                    const offsetX = doc.getTextWidth(cb.textBefore); 
                    const boxX = textX + offsetX; 
                    const boxY = lineY + ((fontSizeMm - boxSize) / 2);
                    
                    doc.setDrawColor(0);
                    doc.setLineWidth(0.15);
                    
                    if (cb.checked) {
                        doc.setFillColor(0, 0, 0);
                        doc.rect(boxX, boxY, boxSize, boxSize, 'FD'); 
                    } else {
                        doc.rect(boxX, boxY, boxSize, boxSize, 'S'); 
                    }
                });
            }

            if (Array.isArray(styles.textColor)) {
                doc.setTextColor(styles.textColor[0], styles.textColor[1], styles.textColor[2]);
            } else {
                doc.setTextColor(styles.textColor as any);
            }

            lines.forEach((lineText: string, idx: number) => {
                const lineY = startY + (idx * lineHeight);
                const textY = lineY + (fontSizeMm / 2) + 0.3; 

                if (styles.halign === 'justify') {
                    const lineWidth = doc.getTextWidth(lineText);
                    const isLastLine = idx === lines.length - 1;
                    const isShortLine = lineWidth < (maxWidth * 0.85); 

                    if (isLastLine || isShortLine) {
                        doc.text(lineText, textX, textY, { align: 'left', baseline: 'middle' } as any);
                    } else {
                        // Garante que a largura passada ao jsPDF nunca seja menor que a
                        // largura real da linha — se ficarem quase iguais (linha bem no
                        // limite da coluna), o jsPDF pode quebrar essa linha de novo por
                        // conta própria dentro desta mesma chamada, usando uma altura de
                        // linha diferente da nossa e sobrepondo a linha seguinte.
                        const safeMaxWidth = Math.max(maxWidth, lineWidth + 0.1);
                        doc.text([lineText, ""], textX, textY, { align: 'justify', maxWidth: safeMaxWidth, baseline: 'middle' } as any);
                    }
                } else {
                    let finalX = textX;
                    if (styles.halign === 'center') finalX = cell.x + cell.width / 2;
                    else if (styles.halign === 'right') finalX = cell.x + cell.width - padRight;
                    
                    doc.text(lineText, finalX, textY, { align: styles.halign as any, baseline: 'middle' } as any);
                }
            });
        }
    };

    // Constantes da regra de rateio de cota ME/EPP (Lei 14.133/21, art. 48).
    // Ficam nomeadas (em vez de números soltos no meio do código, o que
    // chamamos de "magic numbers") pra qualquer pessoa lendo entender o
    // significado de cada valor sem precisar decorar a lei.
    const TETO_VALOR_LOTE = 4800000;   // Acima disso, a cota deixa de ser obrigatória (§2º).
    const LIMITE_SRP_COTA = 80000;     // Teto absoluto da cota ME/EPP quando o processo é SRP.
    const PERCENTUAL_COTA = 0.25;      // 25% é o percentual padrão de reserva (art. 48, III).

    // "SRP" = Sistema de Registro de Preços. No TR de Bens isso é identificado
    // pelas checkboxes de forma de contratação: Pregão p/ Registro de Preços
    // ou Adesão a uma Ata já existente — em ambos os casos a cota ME/EPP,
    // quando calculada em percentual, fica limitada a R$ 80.000,00.
    const isSRP = data.formaContratacao?.includes('pregao_rp') || data.formaContratacao?.includes('adesao_ata');

    type TrItem = TrBensData['itens'][0];
    type Split = { qtdAmpla: number; qtdMeEpp: number };

    // Função pura: recebe os itens de UM grupo (ou um único item avulso,
    // tratado como "grupo de 1") e devolve quanto de cada item vai pra
    // Ampla Concorrência e quanto vai pra cota ME/EPP, seguindo a mesma
    // matemática já usada e validada no Orçamento Estimado
    // (components/OrcamentoForm.tsx, função processItems).
    const calcularSplit = (itens: TrItem[]) => {
        const valorTotal = itens.reduce(
            (acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0), 0
        );

        // Por padrão, sem nenhuma regra especial, 100% do item vai pra Ampla.
        // O Map guarda o resultado de cada item — vamos sobrescrever essas
        // entradas abaixo, conforme a faixa de valor em que o grupo se encaixa.
        const splits = new Map<TrItem, Split>();
        itens.forEach(it => splits.set(it, { qtdAmpla: Number(it.quantidade) || 0, qtdMeEpp: 0 }));

        let modo: 'ampla' | 'exclusiva' | 'dividida' = 'ampla';

        if (valorTotal > 0 && valorTotal <= LIMITE_SRP_COTA) {
            // Art. 48, I: contratação de até R$ 80.000,00 é EXCLUSIVA para ME/EPP.
            modo = 'exclusiva';
            itens.forEach(it => splits.set(it, { qtdAmpla: 0, qtdMeEpp: Number(it.quantidade) || 0 }));
        } else if (valorTotal > LIMITE_SRP_COTA && valorTotal <= TETO_VALOR_LOTE) {
            // Faixa intermediária: reserva-se 25% do valor pra ME/EPP,
            // limitado a R$ 80.000,00 quando o processo é SRP.
            modo = 'dividida';
            let valorCota = valorTotal * PERCENTUAL_COTA;
            if (isSRP && valorCota > LIMITE_SRP_COTA) valorCota = LIMITE_SRP_COTA;
            const percentualEfetivo = valorCota / valorTotal;

            itens.forEach(it => {
                const qtdTotal = Number(it.quantidade) || 0;
                // Math.floor arredonda pra baixo: garante que a soma das cotas
                // de todos os itens do grupo nunca ultrapasse o percentual (ou
                // teto) calculado — o "resto" da divisão sobra pra Ampla.
                const qtdMeEpp = Math.floor(qtdTotal * percentualEfetivo);
                const qtdAmpla = qtdTotal - qtdMeEpp;
                splits.set(it, { qtdAmpla, qtdMeEpp });
            });
        }
        // Se valorTotal > TETO_VALOR_LOTE (ou for zero), mantém o padrão
        // "tudo Ampla" já setado acima — nada a fazer aqui.

        // Soma quanto em R$ cada categoria representa, pra alimentar as
        // linhas de total que aparecem no fim de cada grupo.
        let totalAmpla = 0, totalMeEpp = 0;
        itens.forEach(it => {
            const { qtdAmpla, qtdMeEpp } = splits.get(it)!;
            const valorUnit = Number(it.valorUnitario) || 0;
            totalAmpla += qtdAmpla * valorUnit;
            totalMeEpp += qtdMeEpp * valorUnit;
        });

        return { splits, modo, totalAmpla, totalMeEpp, totalGrupo: totalAmpla + totalMeEpp };
    };

    const t1Head: any[] = [];
    t1Head.push([{
        content: '1. O QUE SERÁ CONTRATADO?\n(art. 6°, XXIII, a e i, da Lei Federal nº 14.133/21)',
        colSpan: 8,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold' }
    }]);

    // A coluna "Grupo" não existe mais — o nome do grupo agora vira uma
    // linha de título dentro da própria tabela (igual ao Orçamento Estimado),
    // então a tabela sempre tem 8 colunas, com ou sem agrupamento.
    const colNamesRow: any[] = [
        { content: 'Item', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'Descrição', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'Código SIMAS', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'Und', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'Qtd', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'V. Unitário', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'V. Total', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'Concorrência', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } }
    ];
    t1Head.push(colNamesRow);

    const t1Body: RowInput[] = [];
    let totalGlobal = 0;

    // Desenha as 1 ou 2 linhas de UM item (1 linha se ele for 100% de um tipo
    // só; 2 linhas — uma "Ampla" e uma "Cota Reservada" — se o valor do grupo
    // caiu na faixa que exige rateio).
    const pushItemRows = (item: TrItem, split: Split, modo: 'ampla' | 'exclusiva' | 'dividida') => {
        const pushRow = (qtd: number, label: string) => {
            if (qtd <= 0) return; // Não imprime linha "vazia" (ex.: cota 0 quando o rateio zerou o item).
            const valorPorcao = qtd * (Number(item.valorUnitario) || 0);
            t1Body.push([
                { content: item.item || '-', styles: { halign: 'center', valign: 'middle' } },
                { content: sanitizeText(item.descricao), styles: { valign: 'middle', halign: 'justify', cellPadding: { top: 1.5, right: 3, bottom: 1.5, left: 1.5 } } },
                { content: item.codigoSimas || '-', styles: { halign: 'center', valign: 'middle' } },
                { content: item.unidade || '-', styles: { halign: 'center', valign: 'middle' } },
                { content: qtd.toString(), styles: { halign: 'center', valign: 'middle' } },
                { content: formatCurrency(item.valorUnitario), styles: { halign: 'right', valign: 'middle' } },
                { content: formatCurrency(valorPorcao), styles: { halign: 'right', valign: 'middle' } },
                { content: label, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } }
            ]);
        };

        if (modo === 'exclusiva') {
            pushRow(split.qtdMeEpp, 'Exclusiva\nME/EPP');
        } else if (modo === 'ampla') {
            pushRow(split.qtdAmpla, 'Ampla\nConcorrência');
        } else {
            pushRow(split.qtdAmpla, 'Ampla\nConcorrência');
            pushRow(split.qtdMeEpp, 'Cota Reservada\nME/EPP');
        }
    };

    // Processa um grupo inteiro (ou um item avulso, como grupo de 1): soma no
    // total global, calcula o rateio e desenha as linhas de item. Devolve os
    // totais do grupo pra quem chamou decidir se desenha (ou não) as linhas
    // de subtotal — itens avulsos não têm subtotal próprio, só os grupos.
    const processarGrupo = (itens: TrItem[]) => {
        itens.forEach(it => { totalGlobal += (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0); });
        const { splits, modo, totalAmpla, totalMeEpp, totalGrupo } = calcularSplit(itens);
        itens.forEach(it => pushItemRows(it, splits.get(it)!, modo));
        return { totalAmpla, totalMeEpp, totalGrupo };
    };

    // Separa os itens em grupos (mesmo loteId) e avulsos (sem loteId),
    // preservando a ordem em que cada grupo apareceu pela primeira vez —
    // mesma estratégia usada no Orçamento Estimado (licitacao.ts).
    const ordemGrupos: string[] = [];
    const itensPorGrupo: Record<string, TrItem[]> = {};
    const avulsos: TrItem[] = [];

    data.itens.forEach(item => {
        if (item.loteId && item.loteId.trim() !== '') {
            if (!itensPorGrupo[item.loteId]) {
                itensPorGrupo[item.loteId] = [];
                ordemGrupos.push(item.loteId);
            }
            itensPorGrupo[item.loteId].push(item);
        } else {
            avulsos.push(item);
        }
    });

    ordemGrupos.forEach(loteId => {
        // Linha de título do grupo, ocupando as 8 colunas — substitui a antiga
        // coluna "Grupo" que se repetia em toda linha de item.
        t1Body.push([{
            content: `GRUPO ${loteId}`,
            colSpan: 8,
            styles: { fillColor: colorBlueHeader, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold', halign: 'left', valign: 'middle', cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } }
        }]);

        const { totalAmpla, totalMeEpp, totalGrupo } = processarGrupo(itensPorGrupo[loteId]);

        // As 3 linhas de fechamento do grupo: quanto ficou em cada cota e o
        // total do grupo — igual ao padrão pedido, espelhando o Orçamento.
        t1Body.push([
            { content: 'TOTAL ME/EPP', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fillColor: colorGrayLabel } },
            { content: formatCurrency(totalMeEpp), styles: { halign: 'right', fontStyle: 'bold', fillColor: colorGrayLabel } }
        ]);
        t1Body.push([
            { content: 'TOTAL AMPLA CONCORRÊNCIA', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fillColor: colorGrayLabel } },
            { content: formatCurrency(totalAmpla), styles: { halign: 'right', fontStyle: 'bold', fillColor: colorGrayLabel } }
        ]);
        t1Body.push([
            { content: `TOTAL DO GRUPO ${loteId}`, colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fillColor: colorYellowHeader } },
            { content: formatCurrency(totalGrupo), styles: { halign: 'right', fontStyle: 'bold', fillColor: colorYellowHeader } }
        ]);
    });

    // Itens avulsos (sem loteId) vêm depois de todos os grupos, sem título
    // nem subtotal — exatamente como já funcionava antes desta mudança.
    avulsos.forEach(item => processarGrupo([item]));

    t1Body.push([
        { content: 'VALOR GLOBAL ESTIMADO', colSpan: 5, styles: { fontStyle: 'bold', halign: 'right', valign: 'middle', fillColor: colorGrayLabel } },
        { content: formatCurrency(totalGlobal), colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', valign: 'middle', fillColor: colorGrayLabel } }
    ]);

    autoTable(doc, {
        startY: currentY,
        head: t1Head,
        body: t1Body,
        theme: 'grid',
        styles: { fontSize: 8, lineColor: [0,0,0], lineWidth: 0.1, textColor: 0 },
        columnStyles: {
            0: { cellWidth: 10 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 15 }, 3: { cellWidth: 10 },
            4: { cellWidth: 10 }, 5: { cellWidth: 24 }, 6: { cellWidth: 24 }, 7: { cellWidth: 22 }
        },
        margin: { left: L_MARGIN, right: R_MARGIN },
        rowPageBreak: 'avoid',
        willDrawCell: advancedWillDrawCell,
        didDrawCell: advancedDidDrawCell
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 6;

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
            { content: sanitizeText(a), styles: { fillColor: bg, valign: 'middle', halign: justificado ? 'justify' : 'left' } }
        ]);
    };

    const pushFullRow = (content: string, justificado: boolean = false) => {
        const bg = isZebra ? colorGrayLabel : colorWhiteLabel;
        isZebra = !isZebra;
        t2Body.push([{ content: sanitizeText(content), colSpan: 2, styles: { fillColor: bg, valign: 'middle', halign: justificado ? 'justify' : 'left' } }]);
    };

    pushHeader('2. JUSTIFICATIVA PARA O AGRUPAMENTO DE ITENS\n(art. 40, §§ 2° e 3°, da Lei Federal nº 14.133/21)');
    pushFullRow(data.justificativaAgrupamento || 'Não se aplica.', true);

    pushHeader('3. DESCRIÇÃO DA SOLUÇÃO\n(art. 6°, XXIII, c, da Lei Federal nº 14.133/21)');
    pushRow('3.1. QUAL O MOTIVO DA CONTRATAÇÃO?', data.motivoContratacao || '-', true);

    pushHeader('4. NATUREZA DO BEM\n(art. 6°, XXIII, a, da Lei Federal nº 14.133/21)');
    pushFullRow(`${radio(data.naturezaBem === 'comum')} Comum.\n\n${radio(data.naturezaBem === 'especial')} Especial.`, false);

    pushHeader('5. PROVA DE QUALIDADE, RENDIMENTO, DURABILIDADE E SEGURANÇA\n(art. 40, § 1°, I e III, da Lei Federal nº 14.133/21)');
    pushRow('5.1. HAVERÁ PROVA DE QUALIDADE?', `${radio(data.provaQualidade === 'sim')} Sim. Justificativa: ${data.justificativaProvaQualidade || '-'}\n\n${radio(data.provaQualidade === 'nao')} Não.`, true);
    const amostraTextoPadrao = `Será requerida apresentação de AMOSTRA a ser entregue no local indicado no chat da sessão pública e dentro de ${data.amostraPrazo || 'xx (xxxx)'} dias úteis, contados do dia posterior à solicitação, sendo incluído o último dia na contagem; podendo ser prorrogado a critério da administração e, se devidamente justificado pelo licitante e, em tempo hábil, qual seja, antes de findo o prazo concedido.\n\nNo caso de a amostra ser apresentada fora das especificações e havendo tempo hábil previsto no item acima, poderá o Pregoeiro solicitar a devida adequação.\n\nOs exemplares colocados à disposição da Administração serão tratados como protótipos, podendo ser manuseados e desmontados pela equipe técnica responsável pela análise, não gerando direito a ressarcimento.\n\nApós a análise definitiva da amostra pelo setor responsável, o pregoeiro informará o licitante para que faça a retirada da amostra no prazo de até ${data.amostraPrazoRetirada || 'xx (xxx)'} dias úteis, após o qual, se não retiradas, poderão ser descartadas ou usadas pela Administração, sem direito a ressarcimento. Em casos excepcionais, poderá a administração liberar a amostra para retirada somente após a entrega do primeiro pedido, para que seja verificada a compatibilidade entre o produto ofertado e o efetivamente entregue.`;
    const amostraJustificativa = data.justificativaAmostra ? `Justificativa: ${data.justificativaAmostra}\n\n` : '';
    pushRow('5.2. O EDITAL EXIGIRÁ AMOSTRA?', `${radio(data.amostra === 'sim')} Sim.\n\n${data.amostra === 'sim' ? amostraJustificativa + amostraTextoPadrao : ''}\n\n${radio(data.amostra === 'nao')} Não.`, true);
    pushRow('5.3. HAVERÁ GARANTIA DO BEM?', `${radio(data.garantiaBem === 'sim')} Sim. Itens: ${data.garantiaItens || '-'}. Prazo: ${data.garantiaBemMeses || '-'} meses.\n\n${radio(data.garantiaBem === 'nao')} Não.`, true);
    pushRow('5.4. HAVERÁ ASSISTÊNCIA TÉCNICA?', `${radio(data.assistenciaTecnica === 'sim')} Sim. Itens: ${data.assistenciaTecnicaItens || '-'}. Prazo: ${data.assistenciaTecnicaMeses || '-'} meses.\nMODO: ${data.assistenciaTecnicaModo === 'propria' ? 'Própria' : 'Empresa Credenciada'}\n\n${radio(data.assistenciaTecnica === 'nao')} Não.`, true);

    pushHeader('6. CRITÉRIOS DE SELEÇÃO\n(art. 6°, XXIII, h, da Lei Federal nº 14.133/21)');
    const fC = data.formaContratacao || [];
    pushRow('6.1. FORMA DE CONTRATAÇÃO', [
        `${radio(fC.includes('inexigibilidade'))} Inexigibilidade (Art. 74, Inciso ${data.inexigibilidadeInciso || '...'})`,
        `${radio(fC.includes('dispensa_valor'))} Dispensa por Valor (Art. 75, II)`,
        `${radio(fC.includes('dispensa_art75'))} Dispensa (Art. 75, Inciso ${data.dispensaInciso || '...'})`,
        `${radio(fC.includes('pregao'))} Pregão eletrônico`,
        `${radio(fC.includes('pregao_rp'))} Pregão para Registro de Preços`,
        `${radio(fC.includes('adesao_ata'))} Adesão à Ata de Registro de Preços`
    ].join('\n\n'));
    pushRow('6.2. CRITÉRIO DE JULGAMENTO', `${radio(data.criterioJulgamento === 'menor_preco')} Menor preço.\n\n${radio(data.criterioJulgamento === 'maior_desconto')} Maior desconto.`);
    pushRow('6.3. O ORÇAMENTO É SIGILOSO?', `${radio(data.orcamentoSigiloso === 'sim')} Sim. Justificativa: ${data.justificativaOrcamentoSigiloso || '-'}\n\n${radio(data.orcamentoSigiloso === 'nao')} Não.`, true);
    pushRow('6.4. ACEITABILIDADE', data.criterioAceitabilidade || '-', true);

    // =========================================================================
    // RESTAURAÇÃO E CORREÇÃO DO ITEM 6.5 (BLINDADO CONTRA UNDEFINED)
    // =========================================================================
    let textoParticipacaoME = '';
    const partME = data.participacaoME || '';
    const itensME = data.participacaoMEItens || data.itensParticipacaoExclusiva || '-';
    const descME = data.itensParticipacaoExclusivaDesc ? `\nDescrição: ${data.itensParticipacaoExclusivaDesc}` : '';

    if (partME === 'sim') {
        textoParticipacaoME = `[X] Sim. Itens: ${itensME}${descME}\n\n[  ] Não.`;
    } else if (partME === 'nao') {
        textoParticipacaoME = `[  ] Sim. Itens: -\n\n[X] Não.`;
    } else {
        textoParticipacaoME = `[  ] Sim. Itens: -\n\n[  ] Não.`;
    }
    
    pushRow('6.5. HÁ ITENS COM PARTICIPAÇÃO EXCLUSIVA DE ME/EPP?', textoParticipacaoME, true);
    // =========================================================================

    pushHeader('7. REQUISITOS DA CONTRATADA\n(arts. 67 a 70 da Lei Federal nº 14.133/21)');
    pushRow('7.1. HABILITAÇÃO JURÍDICA', translateOptions(data.habilitacaoJuridica, mapJuridica));
    pushRow('7.2. FISCAL / SOCIAL', translateOptions(data.habilitacaoFiscal, mapFiscal));
    pushRow('7.3. QUALIFICAÇÃO ECONÔMICA', translateOptions(data.qualificacaoEconomica, mapEconomica));
    pushRow('7.4. QUALIFICAÇÃO TÉCNICA EXIGIDA?', `${radio(data.habilitacaoTecnicaExigida === 'sim')} Sim. Exigência: ${data.habilitacaoTecnicaQual || '-'}\nJustificativa: ${data.habilitacaoTecnicaPorque || '-'}\n\n${radio(data.habilitacaoTecnicaExigida === 'nao')} Não.`, true);
    
    const qualifTec = data.qualificacoesTecnicas || [];
    const qualifTecText = qualifTec.length === 0 ? 'Conforme Edital.' : qualifTec.map(opt => {
        const baseText = `${mapQualificacaoTecnica[opt] || opt}`;
        const just = data.qualificacoesTecnicasJustificativas?.[opt];
        return just ? `${baseText}\n  Justificativa: ${just}` : baseText;
    }).join('\n\n');
    pushRow('7.5. COMPROVAÇÕES TÉCNICAS', qualifTecText, true);
    pushRow('7.6. CRITÉRIO DE SUSTENTABILIDADE?', `${radio(data.criterioSustentabilidade === 'sim')} Sim. Detalhes: ${data.criterioSustentabilidadeDesc || '-'}\n\n${radio(data.criterioSustentabilidade === 'nao')} Não.`, true);
    pushRow('7.7. RISCOS', `${radio(data.riscosAssumidos === 'sim')} Sim. Detalhes: ${data.riscosAssumidosDesc || '-'}\n\n${radio(data.riscosAssumidos === 'nao')} Não.`, true);
    pushRow('7.8. CONSÓRCIO', `${radio(data.participacaoConsorcio === 'sim')} Sim (${data.participacaoConsorcioPercentual || '0'}% acréscimo).\n\n${radio(data.participacaoConsorcio === 'nao')} Não. Motivo: ${data.participacaoConsorcioJustificativa || '-'}`, true);
    pushRow('7.9. SUBCONTRATAÇÃO?', `${radio(data.subcontratacao === 'sim')} Sim. Opção: ${data.subcontratacaoOpcao || '-'}\nDetalhes: ${data.subcontratacaoDetalhes || '-'}\n\n${radio(data.subcontratacao === 'nao')} Não.`, true);

    pushHeader('8. FORMA DE ENTREGA DO BEM\n(art. 40, § 1°, II, da Lei Federal nº 14.133/21)');
    pushRow('8.1. FORMA', data.formaEntregaTipo === 'unica' ? 'Integral de uma só vez.' : `Parcelada em ${data.entregaParcelasX || '-'} parcelas. A 1ª em até ${data.entregaParcelasY || '-'} dias da nota de empenho, e as demais mediante aviso com ${data.entregaParcelasZ || '-'} dias de antecedência.`, true);
    pushRow('8.2. LOCAL E HORA', data.localEntrega || '-', true);
    pushRow('8.3. PRAZO MÁXIMO DE VALIDADE', data.prazoValidadePereciveis ? `O prazo de validade não poderá ser inferior a ${data.prazoValidadePereciveis} dias da entrega.` : 'Não se aplica (bem não perecível).', true);

    pushHeader('9. PRAZO, FORMA DE PAGAMENTO E GARANTIA DO CONTRATO\n(art. 92 da Lei Federal nº 14.133/21)');
    pushRow('9.1. PRAZO DO CONTRATO', `${data.prazoContrato === '30' ? '30 dias (Pronta Entrega)' : '12 meses'}.`);
    pushRow('9.2. HAVERÁ POSSIBILIDADE DE PRORROGAÇÃO?', data.possibilidadeProrrogacao === 'sim' ? 'Sim, nas hipóteses do art. 111 da Lei Federal nº 14.133/21.' : 'Não.');

    const pgOpts = data.pagamentoOpcoes || [];
    let pgText = '';
    if(pgOpts.includes('ordem_bancaria')) pgText += '• O pagamento será realizado por ordem bancária creditada em conta corrente.\n';
    if(pgOpts.includes('banpara')) pgText += '• Banco do Estado do Pará - BANPARÁ.\n';
    if(pgOpts.includes('qualquer_banco')) pgText += '• Qualquer instituição bancária indicada pela contratada.\n';
    if(pgOpts.includes('prazo_NF')) pgText += `• O prazo para pagamento será de até ${data.pagamentoPrazoDias || '30'} dias corridos após o recebimento da nota fiscal.\n`;
    if(pgOpts.includes('regularidade')) pgText += `• Prova da Regularidade Fiscal: ${data.pagamentoRegularidade || 'Conforme Edital'}\n`;
    pushRow('9.3. PAGAMENTO', pgText || 'Conforme Edital.', true);

    pushRow('9.4. GARANTIA DE CONTRATO', `${radio(data.garantiaContratoTipo === 'porcentagem')} Sim: ${data.garantiaContratoPorcentagem || '0'}% do valor inicial. Justificativa: ${data.garantiaContratoJustificativa || '-'}\n\n${radio(data.garantiaContratoTipo === 'nao_ha')} Não há.`, true);
    pushRow('9.5. REAJUSTE', `Índice: ${data.reajusteIndice || 'N/A'}. Periodicidade: a cada ${data.reajusteMeses || '-'} meses.`);

    pushHeader('10. PREVISÃO ORÇAMENTÁRIA\n(art. 18, § 1°, VI, da Lei Federal nº 14.133/21)');
    pushFullRow('10.1. DADOS ORÇAMENTÁRIOS DA CONTRATAÇÃO');
    pushRow('FUNCIONAL', data.dadosOrcamentariosFuncional || '-');
    pushRow('ELEMENTO E FONTE', `Elemento: ${data.dadosOrcamentariosElemento || '-'}   |   Fonte: ${data.dadosOrcamentariosFonte || '-'}`);

    autoTable(doc, {
        startY: currentY,
        body: t2Body,
        theme: 'grid',
        styles: { 
            fontSize: 8, 
            lineColor: [0,0,0], 
            lineWidth: 0.1, 
            textColor: 0, 
            overflow: 'linebreak',
            cellPadding: { top: 1.2, right: 3, bottom: 1.2, left: 1.2 }
        },
        columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 'auto' }
        },
        margin: { left: L_MARGIN, right: R_MARGIN, bottom: MARGIN_BOTTOM },
        rowPageBreak: 'avoid',
        willDrawCell: advancedWillDrawCell,
        didDrawCell: advancedDidDrawCell
    });

    // ============================================================================
    // ASSINATURAS E RODAPÉ
    // ============================================================================
    let finalY = (doc as any).lastAutoTable.finalY + 15;

    // Tenta o espaçamento "ideal" de sempre entre a data e a assinatura;
    // se não couber mas um espaçamento mais compacto (ainda legível)
    // couber, usa o compacto em vez de jogar tudo pra uma página nova
    // e desperdiçar o espaço que sobrou na página atual.
    const idealGap = 30, compactGap = 15;
    const sigFootprint = 10; // altura ocupada abaixo da linha de assinatura (nome + função)
    const remaining = (PAGE_HEIGHT - MARGIN_BOTTOM) - finalY;

    let gap = idealGap;
    if (remaining < idealGap + sigFootprint) {
        if (remaining >= compactGap + sigFootprint) {
            gap = compactGap;
        } else {
            doc.addPage();
            finalY = MARGIN_TOP + 10;
            gap = idealGap;
        }
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.cidade || 'Belém'} (PA), ${formatDate(data.data)}.`, PAGE_WIDTH - R_MARGIN, finalY, { align: 'right' });

    finalY += gap;
    
    const sigWidth = 80;
    const sigX = PAGE_WIDTH / 2;
    doc.setLineWidth(0.1); 
    doc.setDrawColor(120, 120, 120); 
    doc.line(sigX - (sigWidth / 2), finalY, sigX + (sigWidth / 2), finalY);

    doc.setFontSize(10);

    const drawNameWithBoldGuerra = (
        nomeCompleto: string,
        nomeGuerra: string,
        cargo: string,
        x: number,
        y: number
    ) => {
        const fullName = String(nomeCompleto || '').trim();
        const guerra = String(nomeGuerra || '').trim();
        const cargoTexto = String(cargo || '').trim();

        if (!fullName) return;

        const parts: { text: string; bold?: boolean }[] = [];
        const lowerFull = fullName.toLowerCase();
        const lowerGuerra = guerra.toLowerCase();

        if (guerra && lowerFull.includes(lowerGuerra)) {
            const idx = lowerFull.indexOf(lowerGuerra);
            const before = fullName.slice(0, idx).trimEnd();
            const boldPart = fullName.slice(idx, idx + guerra.length).trim();
            const after = fullName.slice(idx + guerra.length).trimStart();

            if (before) parts.push({ text: before });
            if (boldPart) parts.push({ text: ` ${boldPart} `, bold: true });
            if (after) parts.push({ text: after });
        } else {
            parts.push({ text: fullName });
        }

        if (cargoTexto) {
            parts.push({ text: ` - ${cargoTexto}`, bold: true });
        }

        const widths = parts.map(p => {
            doc.setFont('helvetica', p.bold ? 'bold' : 'normal');
            return doc.getTextWidth(p.text);
        });

        const totalW = widths.reduce((sum, w) => sum + w, 0);
        let startX = x - (totalW / 2);

        parts.forEach((p, i) => {
            doc.setFont('helvetica', p.bold ? 'bold' : 'normal');
            doc.text(p.text, startX, y);
            startX += widths[i];
        });
    };

    drawNameWithBoldGuerra(
        data.nome || '',
        data.nomeGuerra || '',
        data.cargo || '',
        sigX,
        finalY + 5
    );

    if (data.funcao) {
        doc.setFont('helvetica', 'normal');
        doc.text(data.funcao, sigX, finalY + 10, { align: 'center' });
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (i === totalPages) {
            drawInstitutionalFooter(doc, data.setor || '', i, totalPages);
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`Página ${i} de ${totalPages}`, PAGE_WIDTH - R_MARGIN, PAGE_HEIGHT - 10, { align: 'right' });
        }
    }
};