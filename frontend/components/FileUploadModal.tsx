import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface FileUploadModalProps {
  open: boolean;
  title?: string;
  accept?: string;
  onClose: () => void;
  onSubmit: (file: File) => Promise<void> | void;
}

const FileUploadModal = ({ open, title = 'Upload de arquivo', accept, onClose, onSubmit }: FileUploadModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setUploading(false);
      setError('');
    }
  }, [open]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Selecione um arquivo antes de enviar.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      await onSubmit(selectedFile);
    } catch (err: any) {
      setError(err?.message || 'Falha ao enviar o arquivo.');
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-900"
          aria-label="Fechar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 mb-4">
          Selecione um único arquivo para enviar. Você pode usar PDF, imagem ou outro arquivo válido.
        </p>

        <label className="block w-full text-sm font-medium text-gray-700 mb-3">
          Arquivo
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="mt-2 w-full text-sm text-gray-700 border border-gray-300 rounded-lg p-2 bg-white"
          />
        </label>

        {selectedFile && (
          <div className="text-sm text-gray-700 mb-3">
            <strong>Arquivo selecionado:</strong> {selectedFile.name}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 mb-3">{error}</div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-bold hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-70"
          >
            {uploading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;
