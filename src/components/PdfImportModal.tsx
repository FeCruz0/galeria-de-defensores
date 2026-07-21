'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Shield, BookOpen } from 'lucide-react';
import { importFromPdf, ExtractedPayload } from '@/lib/pdfPayload';

interface PdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (payload: ExtractedPayload) => Promise<void>;
}

export default function PdfImportModal({ isOpen, onClose, onImportSuccess }: PdfImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewPayload, setPreviewPayload] = useState<ExtractedPayload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Por favor, selecione um arquivo de formato PDF (.pdf).');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setPreviewPayload(null);

    try {
      const buffer = await file.arrayBuffer();
      const payload = await importFromPdf(buffer);
      setPreviewPayload(payload);
    } catch (err: any) {
      console.error('Erro na extração de PDF:', err);
      setErrorMessage(err.message || 'Não foi possível extrair um payload válido deste PDF.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  async function handleConfirmImport() {
    if (!previewPayload) return;
    setIsLoading(true);
    try {
      await onImportSuccess(previewPayload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar importação no banco de dados.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 border border-purple-500/20 shadow-2xl shadow-purple-950/50 text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-100">Importar Backup por PDF</h3>
              <p className="text-xs text-slate-400">Arraste um PDF da Ficha ou Livro de Regras</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {!previewPayload ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                isDragging
                  ? 'border-purple-500 bg-purple-500/10 scale-[0.99]'
                  : 'border-slate-700 hover:border-purple-500/50 hover:bg-slate-800/40 bg-slate-900/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />

              <div className="p-4 rounded-full bg-purple-500/10 text-purple-400 mb-3">
                <Upload className="w-8 h-8 animate-pulse" />
              </div>

              <p className="text-sm font-medium text-slate-200 text-center">
                Clique para selecionar ou arraste o arquivo PDF aqui
              </p>
              <p className="text-xs text-slate-500 text-center mt-1">
                Suporta Fichas de Personagem e Livros de Regras com payload (.pdf)
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-3">
              <div className="flex items-center gap-3">
                {previewPayload.type === 'character' ? (
                  <Shield className="w-6 h-6 text-purple-400" />
                ) : (
                  <BookOpen className="w-6 h-6 text-cyan-400" />
                )}
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-purple-400">
                    {previewPayload.type === 'character' ? 'Ficha de Personagem Detectada' : 'Sistema de Regras Detectado'}
                  </span>
                  <h4 className="text-base font-bold text-slate-100">
                    {previewPayload.data.name || 'Sem Nome'}
                  </h4>
                </div>
              </div>

              {previewPayload.type === 'character' && (
                <div className="text-xs text-slate-300 space-y-1 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                  <p><strong className="text-slate-400">Conceito:</strong> {previewPayload.data.concept || 'N/A'}</p>
                  <p><strong className="text-slate-400">Pontos Totais:</strong> {previewPayload.data.points_total || 0}</p>
                </div>
              )}

              {previewPayload.type === 'rule_system' && (
                <div className="text-xs text-slate-300 space-y-1 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                  <p><strong className="text-slate-400">Descrição:</strong> {previewPayload.data.description || 'N/A'}</p>
                </div>
              )}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center gap-2 p-3 text-xs text-purple-400 font-medium">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span>Processando arquivo PDF...</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          {previewPayload && (
            <button
              onClick={handleConfirmImport}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Importação</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
