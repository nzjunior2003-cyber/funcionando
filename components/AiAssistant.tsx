
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

interface AiAssistantProps {
  onGeneratedText?: (text: string) => void;
  fieldName?: string;
  // New props for price research integration in OrcamentoForm
  data?: any;
  setData?: any;
  addPrice?: (itemGroupId: string, source: string) => void;
  availableSources?: { val: string; label: string }[];
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ 
  onGeneratedText, 
  fieldName, 
  data, 
  setData, 
  addPrice, 
  availableSources 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Determine if this instance is a price research assistant
  const isPriceAssistant = !!data && !!setData;

  const handleGenerate = async () => {
    if (!prompt && !isPriceAssistant) {
      setError('Por favor, insira uma ideia para o texto.');
      return;
    }
    setIsLoading(true);
    setError('');
    setGeneratedText('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      if (isPriceAssistant) {
        // Price Research Logic - Use gemini-3-pro-preview for complex reasoning tasks
        const itemsToResearch = data.itemGroups.map((g: any) => `${g.itemTR}: ${g.descricao}`).join('\n');
        const sourcesText = availableSources?.map(s => s.label).join(', ') || 'fontes de mercado';
        
        const fullPrompt = `Você é um especialista em pesquisa de preços para licitações públicas no Brasil.
Pesquise referências de preços de mercado para os seguintes itens do Corpo de Bombeiros Militar do Pará:
${itemsToResearch}

Considere as seguintes fontes de pesquisa: ${sourcesText}.
Retorne uma análise resumida com sugestões de valores médios ou referências de mercado para cada item, em formato de texto formal.

Retorne APENAS a análise de preços sugerida.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: fullPrompt,
        });

        setGeneratedText(response.text);
      } else {
        // Basic Text Generation - Use gemini-3-flash-preview for text tasks
        const fullPrompt = `Você é um especialista em redação de documentos de licitação para a administração pública brasileira.
Sua tarefa é gerar um texto claro, formal e conciso para o campo "${fieldName}" de um documento oficial (DFD/ETP/TR).
Baseado na seguinte ideia do usuário: "${prompt}"

Gere apenas o texto para o campo solicitado, sem introduções ou explicações adicionais.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: fullPrompt,
        });

        setGeneratedText(response.text);
      }
    } catch (e) {
      console.error(e);
      setError('Ocorreu um erro ao gerar o conteúdo pela IA. Verifique a conexão e o console.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUseText = () => {
    if (onGeneratedText) {
        onGeneratedText(generatedText);
    }
    setIsModalOpen(false);
    setPrompt('');
    setGeneratedText('');
  };

  const openModal = () => {
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setError('');
    setPrompt('');
    setGeneratedText('');
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={isPriceAssistant 
            ? "relative mb-4 w-full bg-cbmpa-purple hover:bg-cbmpa-red text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
            : "absolute top-2 right-2 text-lg text-cbmpa-purple hover:text-cbmpa-red transition transform hover:scale-125"
        }
        title={isPriceAssistant ? "Pesquisa de Preços com IA" : "Gerar com Assistente IA"}
      >
        <span>✨</span> {isPriceAssistant && "Assistente de Pesquisa com IA"}
      </button>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl transform transition-all">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {isPriceAssistant ? "Pesquisa de Preços com IA" : `Assistente IA para "${fieldName}"`}
                </h2>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-3xl font-light">&times;</button>
            </div>
            
            <div className="space-y-4">
              {!isPriceAssistant ? (
                <div>
                    <label htmlFor="ai-prompt" className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">Sua ideia/rascunho:</label>
                    <textarea
                        id="ai-prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex: compra de 10 novos computadores para o setor administrativo visando renovação de parque tecnológico..."
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cbmpa-blue-end dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400 h-24"
                        disabled={isLoading}
                    />
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 text-sm">
                    O assistente analisará os itens listados no formulário e gerará sugestões de preços baseadas em referências de mercado para as fontes selecionadas.
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cbmpa-red to-cbmpa-purple text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processando...</span>
                    </div>
                ) : (isPriceAssistant ? 'Iniciar Análise com IA' : 'Gerar Texto com IA')}
              </button>

              {error && <p className="text-red-500 text-center font-semibold">{error}</p>}

              {generatedText && (
                <div className="mt-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 max-h-60 overflow-y-auto shadow-inner">
                    <h3 className="font-bold mb-2 text-cbmpa-blue-end dark:text-blue-400">
                        {isPriceAssistant ? "Análise de Preços Sugerida:" : "Texto Sugerido pela IA:"}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{generatedText}</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end gap-4 border-t pt-4 dark:border-gray-700">
                <button onClick={closeModal} className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 font-bold py-2 px-6 rounded-lg transition">
                    Fechar
                </button>
                {!isPriceAssistant && generatedText && (
                    <button onClick={handleUseText} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition transform hover:scale-105">
                        Aplicar ao Campo
                    </button>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
