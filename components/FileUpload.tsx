import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  fileName: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading, fileName }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndPass(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndPass(e.target.files[0]);
    }
  };

  const validateAndPass = (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Por favor, envie apenas arquivos PDF.");
      return;
    }
    onFileSelect(file);
  };

  const triggerInput = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8 animate-fade-in">
      <form
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all duration-300 ease-in-out cursor-pointer
        ${dragActive 
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
            : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50"}
        ${isLoading ? "opacity-75 pointer-events-none" : ""}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInput}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="application/pdf"
          onChange={handleChange}
        />

        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
          {isLoading ? (
            <>
              <Loader2 className="w-12 h-12 mb-4 text-blue-600 animate-spin" />
              <p className="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-200">Analisando vendas...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">O sistema está lendo seu PDF localmente. Isso pode levar alguns segundos.</p>
            </>
          ) : fileName ? (
             <>
              <FileText className="w-12 h-12 mb-4 text-emerald-500" />
              <p className="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-200">Arquivo Carregado</p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{fileName}</p>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Clique ou arraste para substituir</p>
            </>
          ) : (
            <>
              <UploadCloud className={`w-12 h-12 mb-4 ${dragActive ? "text-blue-500" : "text-gray-400 dark:text-gray-500"}`} />
              <p className="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-200">
                <span className="font-bold">Clique ou arraste</span> o arquivo PDF com o Relatório de Vendas
              </p>
            </>
          )}
        </div>
      </form>
    </div>
  );
};