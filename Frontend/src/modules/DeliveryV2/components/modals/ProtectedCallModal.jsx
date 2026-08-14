import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Phone, X, PhoneCall, Headphones } from 'lucide-react';
import { maskPhoneNumber } from '@/modules/DeliveryV2/utils/phoneMask';

export const ProtectedCallModal = ({ isOpen, onClose, recipientName, phone, virtualRelayPhone = "+918919142335" }) => {
  if (!isOpen) return null;

  const maskedPhone = maskPhoneNumber(phone);

  const handleRelayCall = () => {
    // Dials the central relay hotline so the customer's personal number is never opened directly on dialer
    const numToDial = virtualRelayPhone.replace(/\D/g, '');
    if (numToDial) {
      window.location.href = `tel:${numToDial}`;
    }
  };

  const handleDirectMaskedCall = () => {
    const rawNum = String(phone || '').replace(/\D/g, '');
    if (rawNum) {
      window.location.href = `tel:${rawNum}`;
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        className="w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 pointer-events-auto text-left"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Protected Phone Call</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-4 mb-5">
          <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed">
            🔒 Customer phone number is strictly protected by Zapoo Privacy Policy. Call will be routed securely through our Virtual Support Line.
          </p>
        </div>

        <div className="mb-6 text-center bg-gray-50 dark:bg-[#222] p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Calling Recipient</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{recipientName || 'Customer'}</p>
          <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{maskedPhone || '+91 ********'}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleRelayCall}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Headphones className="w-5 h-5" />
            <span>Call via Zapoo Secure Relay</span>
          </button>

          <button
            onClick={handleDirectMaskedCall}
            className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <PhoneCall className="w-4 h-4 text-gray-500" />
            <span>Direct Call Dial</span>
          </button>
        </div>

        <p className="text-[10px] text-gray-400 text-center mt-4 font-medium">
          Zapoo Secure Relay protects user personal identity during order delivery.
        </p>
      </motion.div>
    </div>
  );
};
