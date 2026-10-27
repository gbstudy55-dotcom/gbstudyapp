import React, { useState } from 'react';
import { Lock, X, KeyRound, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ADMIN_SECRET_PIN = 'GBADMIN2026';

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const entered = pin.trim().toUpperCase();
    if (entered === ADMIN_SECRET_PIN) {
      onSuccess();
      setPin('');
      onClose();
    } else {
      setError('Incorrect Admin Password. Access Denied.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#090e17] border border-[#1e2f42] p-6 text-white shadow-2xl flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-[#0f1925] border border-[#1e2f42] flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center space-y-2 pt-2 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0d2a33] border border-[#164e63] flex items-center justify-center text-[#38bdf8] shadow-lg shadow-cyan-950/50">
            <Lock className="w-7 h-7 stroke-[2.2]" />
          </div>

          <h3 className="text-lg font-extrabold tracking-tight text-white">
            Admin Verification
          </h3>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Enter the authorized password to access the GB STUDY management console.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-950/40 border border-red-900/50 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-[#38bdf8]" />
            <input
              type={showPin ? 'text' : 'password'}
              autoFocus
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter Admin Password"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#0c1520] border border-[#1a293b] focus:border-[#38bdf8] text-sm text-white placeholder:text-slate-500 outline-none transition font-mono tracking-wider"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-3 text-slate-400 hover:text-white transition cursor-pointer"
              tabIndex={-1}
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#38bdf8] hover:bg-[#0ea5e9] text-black font-extrabold text-xs shadow-md transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Unlock Admin Panel</span>
          </button>
        </form>
      </div>
    </div>
  );
};
