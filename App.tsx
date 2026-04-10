import React, { useState, useEffect, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { analyzeSalesPdfOffline } from './services/pdfParser';
import { saveAnalysis, getHistory, deleteAnalysis, findExistingAnalysis } from './services/dbService';
import { AnalysisState, AnalysisRecord } from './types';
import { 
  BarChart3, AlertTriangle, Moon, Sun, Menu, X, 
  History, Trash2, Calendar, FileText, Database
} from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AnalysisState>({
    isLoading: false,
    error: null,
    data: null,
    fileName: null
  });

  // -- HISTORY STATE --
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // -- DARK MODE --
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // -- LOAD HISTORY ON MOUNT --
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const records = await getHistory();
      setHistory(records);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // -- MENU --
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // -- HANDLERS --
  const handleFileSelect = async (file: File) => {
    // 1. Verifica se já existe no histórico
    try {
      const existingRecord = await findExistingAnalysis(file.name, file.size);
      
      if (existingRecord) {
        const dateStr = new Date(existingRecord.timestamp).toLocaleString('pt-BR');
        const confirmLoad = window.confirm(
          `O arquivo "${file.name}" já foi processado anteriormente em ${dateStr}.\n\nDeseja carregar a versão salva instantaneamente e economizar processamento?`
        );

        if (confirmLoad) {
          handleLoadHistoryItem(existingRecord);
          return;
        }
      }
    } catch (e) {
      console.warn("Erro ao verificar duplicidade:", e);
    }

    // 2. Se não existe ou usuário quis reprocessar
    setState(prev => ({ ...prev, isLoading: true, error: null, fileName: file.name }));
    
    try {
      const result = await analyzeSalesPdfOffline(file);
      
      // Auto-save to DB with file size
      await saveAnalysis(file.name, file.size, result);
      await loadHistory(); // Refresh history list

      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        data: result,
        error: (!result.sales || result.sales.length === 0) ? "Nenhuma venda foi identificada no PDF. Verifique se o arquivo está correto." : null
      }));
    } catch (error: any) {
      console.error("Erro completo:", error);
      
      let errorMessage = "Ocorreu um erro inesperado.";
      
      if (error.message?.includes("JSON") || error.message?.includes("parse")) {
        errorMessage = "A leitura do arquivo falhou. Verifique se é um PDF de vendas válido.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
    }
  };

  const handleLoadHistoryItem = (record: AnalysisRecord) => {
    setState({
      isLoading: false,
      error: null,
      data: record.data,
      fileName: record.fileName
    });
    setIsHistoryOpen(false);
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir este relatório do histórico?')) {
      await deleteAnalysis(id);
      await loadHistory();
    }
  };

  const handleReset = () => {
      setState({
          isLoading: false,
          error: null,
          data: null,
          fileName: null
      });
  }

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(timestamp));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
      
      {/* --- HISTORY MODAL --- */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-gray-100 dark:border-slate-700">
              <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Database className="w-5 h-5 text-blue-600" /> Histórico de Análises
                </h3>
                <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {history.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <History size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Nenhuma análise salva ainda.</p>
                  </div>
                ) : (
                  history.map((record) => (
                    <div 
                      key={record.id}
                      onClick={() => handleLoadHistoryItem(record)}
                      className="group p-4 bg-gray-50 dark:bg-slate-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-slate-700 rounded-lg cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="flex items-start gap-3">
                         <div className="bg-white dark:bg-slate-800 p-2 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <FileText size={20} />
                         </div>
                         <div>
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200">{record.fileName}</h4>
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                               <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(record.timestamp)}</span>
                               <span className="bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono">
                                  R${record.data.summary.netRevenue.toLocaleString('pt-BR')}
                               </span>
                            </div>
                         </div>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteHistoryItem(e, record.id!)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between relative">
          
          <div className="flex items-center gap-2" onClick={handleReset} style={{cursor: 'pointer'}}>
            <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
              <BarChart3 size={24} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              Analisador de Vendas (PDF)
            </h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
             {/* History Button (Desktop/Tablet) */}
             <button 
                onClick={() => setIsHistoryOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
             >
                <History size={18} />
                Histórico
             </button>

             {/* Theme Toggle Button */}
             <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700 transition-colors"
              aria-label="Alternar tema"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Hamburger Menu */}
            <div className="relative" ref={menuRef}>
               <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
                    isMenuOpen 
                    ? 'bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-400' 
                    : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'
                  }`}
               >
                 <Menu size={24} />
               </button>

               {/* Dropdown Menu */}
               {isMenuOpen && (
                 <div className="absolute right-0 top-12 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-2 animate-in fade-in slide-in-from-top-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700 mb-2">
                       <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Menu</p>
                    </div>

                    {/* Mobile History Button */}
                    <button
                      onClick={() => {
                        setIsHistoryOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 flex md:hidden items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-gray-700 dark:text-gray-200"
                    >
                       <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                          <History size={18} />
                       </div>
                       <div>
                          <p className="font-medium text-sm">Histórico</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Ver análises salvas</p>
                       </div>
                    </button>

                    {state.data && (
                      <div className="border-t border-gray-100 dark:border-slate-700 mt-2 pt-2">
                        <button
                          onClick={() => {
                            handleReset();
                            setIsMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-red-600 dark:text-red-400"
                        >
                           <div className="p-2 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20">
                              <BarChart3 size={18} />
                           </div>
                           <p className="font-medium text-sm">Nova Análise</p>
                        </button>
                      </div>
                    )}
                 </div>
               )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8">
        
        {state.error && (
            <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3 animate-fade-in">
                <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
                <div className="flex-1">
                    <h3 className="text-red-800 dark:text-red-300 font-semibold text-sm">Erro na análise</h3>
                    <p className="text-red-700 dark:text-red-400 text-sm mt-1">{state.error}</p>
                </div>
                <button onClick={() => setState(p => ({...p, error: null}))} className="text-red-400 hover:text-red-600">
                  <X size={16} />
                </button>
            </div>
        )}

        {!state.data ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
            <div className="text-center mb-8 max-w-lg">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Transforme PDFs em Dados</h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Arraste seu relatório de vendas (PDF), para obter os dados relacionados a movimentação diária do Caixa
              </p>
            </div>
            
            <div className="w-full max-w-2xl relative">
               <FileUpload 
                  onFileSelect={handleFileSelect} 
                  isLoading={state.isLoading}
                  fileName={state.fileName}
               />
            </div>
            
            {/* Demo/Instruction section */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full text-center">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-transparent dark:border-slate-700">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3 font-bold">1</div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Upload do PDF</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Envie o relatório de vendas.</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-transparent dark:border-slate-700">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-3 font-bold">2</div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Processamento Local</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">O sistema lê o documento e estrutura os dados offline.</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-transparent dark:border-slate-700">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 font-bold">3</div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Visualização</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Veja em gráficos receita, categorias, top vendas e outros.</p>
                </div>
            </div>
          </div>
        ) : (
          <Dashboard data={state.data} />
        )}
      </main>
      
      <footer className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 py-6 mt-auto transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Desenvolvido por Alex Valadão</p>
        </div>
      </footer>
    </div>
  );
};

export default App;