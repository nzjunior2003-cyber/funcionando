import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DocumentType, DfdData, EtpData, RiscoData, OrcamentoData, TrBensData } from './types';
import { generatePdf } from './services/pdfGenerator';
import { DfdForm } from './components/DfdForm';
import { EtpForm } from './components/EtpForm';
import { RiscoForm } from './components/RiscoForm';
import { OrcamentoForm } from './components/OrcamentoForm';
import { TrBensForm } from './components/TrBensForm';
import { useFormWithHistory } from './hooks/useFormWithHistory';
import { GoogleGenAI, Type } from "@google/genai";


const today = new Date().toISOString().split('T')[0];


const initialSignatory = {
  cidade: 'Belém',
  data: today,
  nome: '',
  nomeGuerra: '',
  cargo: '',
  funcao: '',
};


const initialDfdState: DfdData = {
  ...initialSignatory,
  numeroMemo: '',
  ano: new Date().getFullYear().toString(),
  unidade: '',
  problema: '',
  quantitativo: '',
  prazo: today,
  justificativaPrazo: '',
  statusPCA: '',
};


const initialEtpState: EtpData = {
  ...initialSignatory,
  numero: '',
  ano: new Date().getFullYear().toString(),
  pae: '',
  necessidade: '',
  fontesPesquisa: [],
  fonteOutro: '',
  justificativaTecnica: '',
  restricaoFornecedores: '',
  tipoObjeto: [],
  natureza: '',
  monopolio: '',
  vigencia: '',
  vigenciaOutroNum: '',
  vigenciaOutroTipo: 'dias',
  prorrogacao: '',
  transicao: '',
  transicaoContrato: '',
  transicaoPrazo: '',
  padraoQualidade: [],
  sustentabilidade: [],
  sustentabilidadeOutro: '',
  prioridadeLeiTipo: '',
  prioridadeLeiJustificativa: '',
  treinamento: '',
  solucaoContratacao: '',
  garantiaContratual: '',
  garantiaOutroNum: '',
  garantiaOutroTipo: 'dias',
  assistenciaTecnica: '',
  justificativaAssistenciaTecnica: '',
  manutencao: '',
  metodoQuantitativo: [],
  metodoOutro: '',
  descricaoQuantitativo: '',
  itens: [],
  meiosPesquisa: [],
  meiosPesquisaOutro: '',
  parcelamento: '',
  motivosNaoParcelamento: [],
  motivosNaoParcelamentoOutro: '',
  contratacoesCorrelatas: '',
  contratacoesCorrelatasEspecificar: '',
  previsaoPCA: '',
  itemPCA: '',
  justificativaPCA: '',
  beneficios: [],
  beneficiosOutro: '',
  pendencias: '',
  pendenciasEspecificar: '',
  pendenciasResponsaveis: '',
  impactoAmbiental: '',
  impactos: '',
  medidasMitigacao: '',
  viabilidade: '',
};


const initialRiscoState: RiscoData = {
    ...initialSignatory,
    pae: '',
    riscos: []
};


const initialOrcamentoState: OrcamentoData = {
    cidade: 'Belém',
    data: today,
    pae: '',
    tipoOrcamento: 'licitacao',
    numeroAta: '',
    anoAta: '2024',
    orgaoAta: '',
    estadoAta: '',
    modalidadeLicitacao: 'pregao_eletronico_comum',
    tipoObjetoOrcamento: 'bem_divisivel',
    itemGroups: [],
    fontesPesquisa: ['direta'], 
    justificativaAusenciaFonte: '',
    justificativaPesquisaDireta: '',
    fornecedoresDiretos: [],
    metodologia: '',
    precosEncontrados: {},
    precosIncluidos: {},
    houveDescarte: 'nao',
    justificativaDescarte: '',
    aditivoTempo: '',
    aditivoTempoQuantidade: '',
    aditivoTempoUnidade: 'meses',
    assinante1Nome: '',
    assinante1NomeGuerra: '',
    assinante1Cargo: '',
    assinante1Funcao: '',
    assinante2Nome: '',
    assinante2NomeGuerra: '',
    assinante2Cargo: '',
    assinante2Funcao: '',
    
    // NOVO: Campos para Credenciamento
    tabelaConsup: [],
    numeroResolucao: '484/2024',
    dataResolucao: '2024-01-24',
};


const initialTrBensState: TrBensData = {
    ...initialSignatory,
    pae: '',
    setor: '',
    itens: [],
    justificativaAgrupamento: '',
    motivoContratacao: '',
    naturezaBem: '',
    provaQualidade: '',
    justificativaProvaQualidade: '',
    amostra: '',
    amostraPrazo: '03 (três)',
    justificativaAmostra: '',
    garantiaBem: '',
    garantiaBemMeses: '',
    garantiaItens: '',
    assistenciaTecnica: 'nao',
    assistenciaTecnicaItens: '',
    assistenciaTecnicaMeses: '',
    assistenciaTecnicaModo: '',
    formaContratacao: [],
    inexigibilidadeInciso: '',
    dispensaInciso: '',
    fundamentoLegal: '',
    criterioJulgamento: '',
    orcamentoSigiloso: '',
    justificativaOrcamentoSigiloso: '',
    criterioAceitabilidade: 'A proposta deve observar os valores unitários e global máximos aceitáveis conforme planilha de composição de preços do orçamento estimado. Para fins de verificação da compatibilidade entre o objeto ofertado e o pretendido, deverão ser encaminhados pelo licitante documentos que contenham as características do material ofertado, tais como marca, modelo, tipo, fabricante e procedência, conforme cada caso, além de outras informações pertinentes, a exemplo de catálogos, folhetos ou folders.',
    participacaoME: '',
    participacaoMEItens: '',
    itensParticipacaoExclusiva: '',
    itensParticipacaoExclusivaDesc: '',
    
    habilitacaoJuridica: [],
    habilitacaoFiscal: [],
    qualificacaoEconomica: [],
    habilitacaoTecnicaExigida: '',
    habilitacaoTecnicaQual: '',
    habilitacaoTecnicaPorque: '',
    qualificacoesTecnicas: [],
    qualificacoesTecnicasJustificativas: {},
    criterioSustentabilidade: '',
    criterioSustentabilidadeDesc: '',
    riscosAssumidos: '',
    riscosAssumidosDesc: '',
    participacaoConsorcio: '',
    participacaoConsorcioJustificativa: '',
    participacaoConsorcioPercentual: '10',
    subcontratacao: '',
    subcontratacaoOpcao: '',
    subcontratacaoDetalhes: '',
    
    formaEntregaTipo: '',
    entregaParcelasX: '',
    entregaParcelasY: '',
    entregaParcelasZ: '',
    localEntrega: '',
    prazoValidadePereciveis: '',
    
    prazoContrato: '',
    possibilidadeProrrogacao: '',
    pagamentoMeio: '',
    pagamentoOnde: '',
    pagamentoPrazoDias: '30 (trinta)',
    pagamentoRegularidade: `1- Por consulta ao SICAF ou Cadastramento Unificado de Licitante.
ou
2- Pela apresentação dos documentos constantes no art. 68 da Lei Federal nº 14.133/21, quando não for possível consultar aos sistemas oficiais.`,
    pagamentoOpcoes: ['ordem_bancaria', 'banpara', 'prazo_NF', 'regularidade'],
    garantiaContratoTipo: '',
    garantiaContratoPorcentagem: '',
    garantiaContratoJustificativa: '',
    reajusteIndice: '',
    reajusteMeses: '',

    formaEntrega: '',
    entregaParcelas: '',
    entregaPrimeira: '',
    entregaAviso: '',
    prazoValidade: '',
    reajustePeriodo: '',
    dadosOrcamentariosFuncional: '',
    dadosOrcamentariosElemento: '',
    dadosOrcamentariosFonte: '',
};

const documentOptions = [
    { 
        type: DocumentType.DFD, 
        title: "DFD", 
        description: "Documento de Formalização da Demanda", 
        icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 1.5h-3c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h3c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125z" clipRule="evenodd" /><path fillRule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875H4.875A1.875 1.875 0 013 20.625V9.375zM6 12a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V12zm2.25 0a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75zM6 15a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V15zm2.25 0a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75zM6 18a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V18zm2.25 0a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>,
        iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
        borderColor: 'border-blue-500',
        textColor: 'text-gray-800'
    },
    { 
        type: DocumentType.ETP, 
        title: "ETP", 
        description: "Estudo Técnico Preliminar", 
        icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12 2.25a8.25 8.25 0 00-8.25 8.25c0 2.62.9 4.976 2.4 6.744C7.71 19.122 9.074 20.25 10.5 20.25h3c1.425 0 2.79-.9 4.35-2.756 1.5-1.768 2.4-4.124 2.4-6.744A8.25 8.25 0 0012 2.25z" /><path fillRule="evenodd" d="M10.5 21.75a1.5 1.5 0 003 0v-.75h-3v.75z" clipRule="evenodd" /></svg>,
        iconBg: 'bg-gradient-to-br from-orange-400 to-orange-500',
        borderColor: 'border-orange-400',
        textColor: 'text-gray-800'
    },
    { 
        type: DocumentType.ORCAMENTO, 
        title: "Orçamento", 
        description: "Orçamento Estimado (Pesquisa de Preço)", 
        icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path fillRule="evenodd" d="M4.5 2.25A2.25 2.25 0 002.25 4.5v15a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 19.5v-15a2.25 2.25 0 00-2.25-2.25h-15zM7.5 7.5a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9zm0 4.5a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H8.25a.75.75 0 01-.75-.75v-.008zm3.75-.75a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75v-.008a.75.75 0 00-.75-.75h-.008zm3 .75a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75h-.008a.75.75 0 01-.75-.75v-.008zM8.25 15a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75v-.008a.75.75 0 00-.75-.75H8.25zm3.75.75a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75h-.008a.75.75 0 01-.75-.75v-.008zm3 .75a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75v-.008a.75.75 0 00-.75-.75h-.008z" clipRule="evenodd" /></svg>,
        iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-500',
        borderColor: 'border-emerald-500',
        textColor: 'text-gray-800'
    },
    { 
        type: DocumentType.RISCO, 
        title: "Análise de Risco", 
        description: "Análise de Risco", 
        icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" /></svg>,
        iconBg: 'bg-gradient-to-br from-rose-500 to-rose-600',
        borderColor: 'border-rose-500',
        textColor: 'text-gray-800'
    },
    { 
        type: DocumentType.TR_BENS, 
        title: "TR (Bens)", 
        description: "Termo de Referência (Bens)", 
        icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" /><path fillRule="evenodd" d="M3.087 9l.54 9.17c.108 1.84 1.62 3.33 3.465 3.33h9.816c1.845 0 3.357-1.49 3.465-3.33L20.913 9H3.087zm4.547 4.5a.75.75 0 000 1.5h8.732a.75.75 0 000-1.5H7.634z" clipRule="evenodd" /></svg>,
        iconBg: 'bg-blue-900',
        borderColor: 'border-blue-900',
        textColor: 'text-gray-800'
    }
];

const DocumentSelector: React.FC<{onSelect: (docType: DocumentType) => void}> = ({ onSelect }) => (
    <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Selecione o Tipo de Documento</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Clique em uma das opções abaixo para começar a preencher o formulário correspondente.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documentOptions.map(doc => (
                <button 
                    key={doc.type} 
                    onClick={() => onSelect(doc.type)}
                    className={`flex flex-col items-start p-6 bg-white dark:bg-gray-800 border-2 ${doc.borderColor} rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 min-h-[180px] relative overflow-hidden group text-left`}
                >
                    <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 transition-transform group-hover:scale-150 ${doc.iconBg}`}></div>

                    <div className={`p-3 rounded-lg text-white mb-4 shadow-md ${doc.iconBg}`}>
                        {doc.icon}
                    </div>
                    <span className={`font-bold text-xl mb-1 ${doc.textColor} dark:text-gray-100`}>{doc.title}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{doc.description}</span>
                </button>
            ))}
        </div>
    </div>
);


const Toast: React.FC<{
  message: string;
  type: 'success' | 'info' | 'error';
  onClose: () => void;
}> = ({ message, type, onClose }) => {
  const baseClasses = "fixed top-5 left-1/2 -translate-x-1/2 max-w-sm w-full p-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-down z-50";
  const typeClasses = {
    success: 'bg-green-100 border border-green-400 text-green-800 dark:bg-green-900/50 dark:border-green-600 dark:text-green-300',
    info: 'bg-blue-100 border border-blue-400 text-blue-800 dark:bg-blue-900/50 dark:border-green-600 dark:text-blue-300',
    error: 'bg-red-100 border border-red-400 text-red-800 dark:bg-red-900/50 dark:border-red-600 dark:text-red-300',
  };
   const Icon = {
    success: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    info: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    error: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`} role="alert">
      <div className="flex-shrink-0">{Icon[type]}</div>
      <div className="flex-grow">{message}</div>
      <button onClick={onClose} className="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg inline-flex h-8 w-8 hover:bg-white/50 dark:hover:bg-white/20">
        <span className="sr-only">Dismiss</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 11-1.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
      </button>
    </div>
  );
};



function App() {
  const [docType, setDocType] = useState<DocumentType>(DocumentType.NONE);
  const [dfdData, setDfdData, undoDfd, canUndoDfd, resetDfdData] = useFormWithHistory<DfdData>(initialDfdState);
  const [etpData, setEtpData, undoEtp, canUndoEtp, resetEtpData] = useFormWithHistory<EtpData>(initialEtpState);
  const [riscoData, setRiscoData, undoRisco, canUndoRisco, resetRiscoData] = useFormWithHistory<RiscoData>(initialRiscoState);
  const [orcamentoData, setOrcamentoData, undoOrcamento, canUndoOrcamento, resetOrcamentoData] = useFormWithHistory<OrcamentoData>(initialOrcamentoState);
  const [trBensData, setTrBensData, undoTrBens, canUndoTrBens, resetTrBensData] = useFormWithHistory<TrBensData>(initialTrBensState);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  
  // Referência para o input de arquivo oculto
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (toast) {
        const timer = setTimeout(() => {
            setToast(null);
        }, 4000); 
        return () => clearTimeout(timer);
    }
  }, [toast]);
  
  const { undo, canUndo } = useMemo(() => {
    switch (docType) {
        case DocumentType.DFD: return { undo: undoDfd, canUndo: canUndoDfd };
        case DocumentType.ETP: return { undo: undoEtp, canUndo: canUndoEtp };
        case DocumentType.RISCO: return { undo: undoRisco, canUndo: canUndoRisco };
        case DocumentType.ORCAMENTO: return { undo: undoOrcamento, canUndo: canUndoOrcamento };
        case DocumentType.TR_BENS: return { undo: undoTrBens, canUndo: canUndoTrBens };
        default: return { undo: () => {}, canUndo: false };
    }
  }, [docType, canUndoDfd, undoDfd, canUndoEtp, undoEtp, canUndoRisco, undoRisco, canUndoOrcamento, undoOrcamento, canUndoTrBens, undoTrBens]);
  
  const currentDocInfo = useMemo(() => documentOptions.find(d => d.type === docType), [docType]);

  const clearForm = () => {
    if (window.confirm('Tem certeza que deseja limpar todos os campos? Esta ação não pode ser desfeita.')) {
      switch (docType) {
        case DocumentType.DFD: resetDfdData(initialDfdState); break;
        case DocumentType.ETP: resetEtpData(initialEtpState); break;
        case DocumentType.RISCO: resetRiscoData(initialRiscoState); break;
        case DocumentType.ORCAMENTO: resetOrcamentoData(initialOrcamentoState); break;
        case DocumentType.TR_BENS: resetTrBensData(initialTrBensState); break;
      }
    }
  };

  // --- Funções de Exportação e Importação ---

  const exportData = () => {
    if (!docType || docType === DocumentType.NONE) {
        setToast({ message: 'Selecione um tipo de documento para exportar.', type: 'info' });
        return;
    }

    let dataToExport;
    switch(docType) {
        case DocumentType.DFD: dataToExport = dfdData; break;
        case DocumentType.ETP: dataToExport = etpData; break;
        case DocumentType.RISCO: dataToExport = riscoData; break;
        case DocumentType.ORCAMENTO: dataToExport = orcamentoData; break;
        case DocumentType.TR_BENS: dataToExport = trBensData; break;
        default: return;
    }

    const exportObject = {
        type: docType,
        version: '1.0',
        createdAt: new Date().toISOString(),
        data: dataToExport
    };

    const jsonString = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Nome do arquivo: TIPO_DATA.json
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `${docType.toUpperCase()}_CBMPA_${dateStr}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setToast({ message: 'Arquivo exportado com sucesso! Verifique sua pasta de downloads.', type: 'success' });
  };

  const triggerImport = () => {
      // Dispara o clique no input file oculto
      if (fileInputRef.current) {
          fileInputRef.current.click();
      }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const content = e.target?.result as string;
              const parsed = JSON.parse(content);

              // Validação básica
              if (!parsed.type || !parsed.data) {
                   throw new Error('Formato de arquivo inválido. O arquivo deve ser um JSON gerado por este sistema.');
              }

              // Verifica se o tipo do arquivo corresponde a algum tipo suportado
              const isTypeSupported = Object.values(DocumentType).includes(parsed.type);
              if (!isTypeSupported) {
                   throw new Error(`Tipo de documento desconhecido: ${parsed.type}`);
              }

              // Atualiza o tipo de documento atual para o do arquivo importado
              setDocType(parsed.type);

              // Atualiza os dados com base no tipo
              // Usamos setTimeout para garantir que a renderização do novo form ocorra (se necessário) antes, 
              // embora React faça batching. Aqui estamos atualizando o estado global levantado.
              switch(parsed.type) {
                  case DocumentType.DFD: resetDfdData(parsed.data); break;
                  case DocumentType.ETP: resetEtpData(parsed.data); break;
                  case DocumentType.RISCO: resetRiscoData(parsed.data); break;
                  case DocumentType.ORCAMENTO: resetOrcamentoData(parsed.data); break;
                  case DocumentType.TR_BENS: resetTrBensData(parsed.data); break;
              }

              setToast({ message: `Dados de ${parsed.type.toUpperCase()} importados com sucesso!`, type: 'success' });

          } catch (error) {
              console.error(error);
              setToast({ message: 'Erro ao importar: ' + (error as Error).message, type: 'error' });
          }
          
          // Limpa o input para permitir importar o mesmo arquivo novamente se necessário
          if (fileInputRef.current) {
              fileInputRef.current.value = '';
          }
      };
      reader.readAsText(file);
  };

  const handleGeneratePdf = async () => {
    if (!docType) {
        setToast({ message: 'Por favor, selecione um tipo de documento.', type: 'error' });
        return;
    }
    
    setIsLoading(true);

    try {
        await new Promise(resolve => setTimeout(resolve, 50));

        if (docType === DocumentType.DFD) {
            // Verifica se há conteúdo suficiente para usar a IA
            const hasContent = dfdData.problema?.trim() && dfdData.quantitativo?.trim() && dfdData.justificativaPrazo?.trim();
            
            if (hasContent) {
                try {
                    setToast({ message: 'Analisando e aprimorando o texto com IA...', type: 'info' });
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const formattedPrazo = dfdData.prazo ? new Date(dfdData.prazo + 'T00:00:00').toLocaleDateString('pt-BR') : '...';
                    
                    const promptText = `Você é um especialista em redação de documentos oficiais para a administração pública brasileira. Sua tarefa é gerar três parágrafos distintos, formais, claros e coesos para um 'Documento de Formalização da Demanda' (DFD), baseados nas ideias fornecidas pelo usuário. Retorne um objeto JSON com uma única chave "paragrafos", que deve ser um array contendo os três parágrafos como strings.

    1.  Para o primeiro parágrafo, elabore um texto sobre o seguinte problema: "${dfdData.problema}". O parágrafo DEVE começar com a frase exata "Solicito que seja providenciada a solução para ".
    2.  Para o segundo parágrafo, elabore um texto sobre o seguinte quantitativo: "${dfdData.quantitativo}". O parágrafo DEVE começar com a frase exata "Estimo que o quantitativo necessário é de ".
    3.  Para o terceiro parágrafo, combine o prazo e a justificativa. Use a data "${formattedPrazo}" e a justificativa "${dfdData.justificativaPrazo}". O parágrafo DEVE começar com a frase exata "Informo que a aquisição deve ser concluída até ${formattedPrazo}, tendo em vista que ".

    O resultado deve ser exclusivamente o objeto JSON, sem nenhuma explicação ou texto introdutório.`;

                    const response = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: promptText,
                        config: {
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: Type.OBJECT,
                                properties: {
                                paragrafos: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING }
                                }
                                },
                                required: ["paragrafos"]
                            }
                        }
                    });

                    const aiResult = JSON.parse(response.text || '{"paragrafos": []}');
                    const dataForPdf = { ...dfdData, aiParagraphs: aiResult.paragrafos };

                    setToast({ message: 'Texto aprimorado! Gerando PDF...', type: 'success' });
                    const result = generatePdf(docType, dataForPdf as DfdData);
                    if (!result.success) {
                        setToast({ message: `Ocorreu um erro ao gerar o PDF: ${result.error}`, type: 'error' });
                    }
                } catch (e) {
                    console.error("AI analysis failed:", e);
                    setToast({ message: 'Falha na análise da IA. Gerando PDF com os dados originais.', type: 'info' });
                    const result = generatePdf(docType, dfdData); 
                    if (!result.success) {
                        setToast({ message: `Ocorreu um erro ao gerar o PDF: ${result.error}`, type: 'error' });
                    }
                }
            } else {
                 setToast({ message: 'Campos vazios detectados. Gerando esqueleto do documento...', type: 'info' });
                 const result = generatePdf(docType, dfdData);
                 if (!result.success) {
                    setToast({ message: `Ocorreu um erro ao gerar o PDF: ${result.error}`, type: 'error' });
                }
            }
        } else {
            let data;
            switch(docType) {
                case DocumentType.ETP: data = etpData; break;
                case DocumentType.RISCO: data = riscoData; break;
                case DocumentType.ORCAMENTO: data = orcamentoData; break;
                case DocumentType.TR_BENS: data = trBensData; break;
                default: 
                    setToast({ message: 'Geração de PDF para este documento ainda não foi implementada.', type: 'info' }); 
                    return;
            }
            const result = generatePdf(docType, data);
            if (!result.success) {
                setToast({ message: `Ocorreu um erro ao gerar o PDF: ${result.error}`, type: 'error' });
            }
        }
    } catch (globalError) {
        console.error("Global PDF Generation Error:", globalError);
        setToast({ message: `Erro fatal na geração do documento: ${String(globalError)}`, type: 'error' });
    } finally {
        setIsLoading(false);
    }
  };

  const renderForm = () => {
    switch (docType) {
      case DocumentType.DFD:
        return <DfdForm data={dfdData} setData={setDfdData} />;
      case DocumentType.ETP:
        return <EtpForm data={etpData} setData={setEtpData} />;
      case DocumentType.RISCO:
        return <RiscoForm data={riscoData} setData={setRiscoData} />;
      case DocumentType.ORCAMENTO:
        return <OrcamentoForm data={orcamentoData} setData={setOrcamentoData} />;
      case DocumentType.TR_BENS:
        return <TrBensForm data={trBensData} setData={setTrBensData} />;
      default:
        return <DocumentSelector onSelect={setDocType} />;
    }
  };

  return (
    <div className="bg-gradient-to-r from-cbmpa-blue-start to-cbmpa-blue-end dark:from-gray-900 dark:to-gray-800 min-h-screen p-4 sm:p-8">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        {isLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-white border-t-cbmpa-red rounded-full animate-spin mb-4"></div>
                    <p className="text-white font-bold animate-pulse">Processando Documento...</p>
                </div>
            </div>
        )}
      
      {/* Input oculto para importação de arquivo */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".json" 
        onChange={handleFileImport} 
      />

      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        <header className="bg-gradient-to-r from-cbmpa-red to-cbmpa-purple text-white p-6 sm:p-8 text-center relative">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-shadow">🔥 GERADOR DE DOCUMENTOS CBMPA 🔥</h1>
          <p className="text-sm sm:text-base opacity-90">Sistema de Elaboração de Documentos de Contratação</p>
        </header>

        <main className="p-4 sm:p-8">
          {docType === DocumentType.NONE ? (
             <>
                <DocumentSelector onSelect={setDocType} />
                <div className="mt-8 text-center border-t pt-8 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Já tem um trabalho salvo?</p>
                    <button 
                        onClick={triggerImport} 
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition transform hover:scale-105 flex items-center gap-2 mx-auto"
                    >
                        ⬆️ Importar Arquivo (.json)
                    </button>
                </div>
             </>
          ) : (
            <>
                <div className="flex justify-between items-center mb-6 border-b pb-4 dark:border-gray-700">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300">{currentDocInfo?.description}</h2>
                    <button onClick={() => setDocType(DocumentType.NONE)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 font-bold py-2 px-4 rounded-lg transition-colors">
                        ← Mudar Documento
                    </button>
                </div>

                {renderForm()}
                
                <div className="mt-8 pt-6 border-t-2 border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 justify-center">
                    <button onClick={exportData} className="flex-grow sm:flex-grow-0 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105 flex items-center gap-2 justify-center">
                        ⬇️ Exportar Dados
                    </button>
                    <button onClick={triggerImport} className="flex-grow sm:flex-grow-0 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105 flex items-center gap-2 justify-center">
                        ⬆️ Importar Dados
                    </button>
                    <button
                        onClick={undo}
                        disabled={!canUndo}
                        className="flex-grow sm:flex-grow-0 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ↩️ Desfazer
                    </button>
                    <button onClick={clearForm} className="flex-grow sm:flex-grow-0 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105">🗑️ Limpar Tudo</button>
                    <button onClick={handleGeneratePdf} className="flex-grow sm:flex-grow-0 bg-gradient-to-r from-cbmpa-red to-cbmpa-purple text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105 shadow-lg">📄 GERAR PDF</button>
                </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;