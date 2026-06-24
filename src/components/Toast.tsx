import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  toasts: ToastMessage[];
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      dismiss(id);
    }, 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, toasts, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  dismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, dismiss }) => {
  return (
    <div 
      id="global-toast-container" 
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.15 } }}
            layout
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg bg-white ${getToastColors(t.type)}`}
          >
            {getToastIcon(t.type)}
            <div className="flex-1 text-xs font-semibold text-slate-800 leading-normal">
              {t.message}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 cursor-pointer p-0.5 rounded-lg hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

function getToastColors(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50/60 text-emerald-800 shadow-emerald-500/5';
    case 'error':
      return 'border-red-200 bg-red-50/60 text-red-800 shadow-red-500/5';
    case 'warning':
      return 'border-amber-200 bg-amber-50/60 text-amber-800 shadow-amber-500/5';
    case 'info':
    default:
      return 'border-slate-200 bg-white text-slate-800 shadow-slate-500/5';
  }
}

function getToastIcon(type: ToastType) {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />;
    case 'error':
      return <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />;
    case 'info':
    default:
      return <Info className="h-5 w-5 text-slate-600 shrink-0" />;
  }
}
