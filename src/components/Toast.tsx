import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-[#4B2E25] text-white rounded-2xl shadow-2xl border border-[#C5A15A]/30 text-xs font-medium animate-slide-up transition-all duration-300"
      role="status"
      aria-live="polite"
    >
      {type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#C5A15A] shrink-0" />}
      {type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
      {type === 'info' && <Info className="w-4 h-4 text-[#C5A15A] shrink-0" />}
      
      <span className="max-w-xs sm:max-w-md">{message}</span>

      <button
        type="button"
        onClick={onClose}
        className="ml-2 p-1 text-white/60 hover:text-white rounded-lg transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
