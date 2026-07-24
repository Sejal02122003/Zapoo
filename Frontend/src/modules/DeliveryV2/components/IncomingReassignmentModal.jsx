import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Clock, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { deliveryAPI } from '@food/api';

export default function IncomingReassignmentModal({ isOpen, reassignmentData, onClose, onAccept, onReject }) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [isProcessing, setIsProcessing] = useState(false);
  const timerRef = useRef(null);
  
  useEffect(() => {
    if (isOpen && reassignmentData) {
      // Calculate remaining time based on timeoutAt
      const calculateTimeLeft = () => {
        if (!reassignmentData.timeoutAt) return 60;
        const now = new Date().getTime();
        const timeout = new Date(reassignmentData.timeoutAt).getTime();
        const diff = Math.max(0, Math.floor((timeout - now) / 1000));
        return diff;
      };
      
      setTimeLeft(calculateTimeLeft());
      setIsProcessing(false);
      
      timerRef.current = setInterval(() => {
        const remaining = calculateTimeLeft();
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          clearInterval(timerRef.current);
          handleTimeout();
        }
      }, 1000);
      
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isOpen, reassignmentData]);
  
  const handleTimeout = () => {
    toast.error('Reassignment request expired.');
    onClose();
  };

  const handleAccept = async () => {
    if (!reassignmentData?.orderId) return;
    try {
      setIsProcessing(true);
      const res = await deliveryAPI.acceptReassignment(reassignmentData.orderId);
      if (res?.data?.success) {
        toast.success('You have successfully accepted the order!');
        onAccept(reassignmentData);
        onClose();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to accept reassignment');
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!reassignmentData?.orderId) return;
    try {
      setIsProcessing(true);
      await deliveryAPI.rejectReassignment(reassignmentData.orderId);
      toast.info('You have rejected the order reassignment.');
      onReject(reassignmentData);
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reject reassignment');
      setIsProcessing(false);
    }
  };

  if (!isOpen || !reassignmentData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border-2 border-primary/20"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-orange-500 p-6 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Package size={64} />
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3 backdrop-blur-md">
                <ShieldAlert size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-bold">New Order Request</h2>
              <p className="text-white/80 text-sm mt-1">Admin has reassigned an order to you</p>
            </div>
          </div>
          
          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Order Number</p>
              <p className="text-2xl font-black text-gray-900">{reassignmentData.orderNumber || 'N/A'}</p>
            </div>
            
            {reassignmentData.reason && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1">Reason for Reassignment</p>
                <p className="text-sm font-medium text-gray-800">{reassignmentData.reason}</p>
              </div>
            )}
            
            <div className="flex items-center justify-center gap-2 text-primary font-medium py-2">
              <Clock size={20} className={timeLeft <= 10 ? 'animate-pulse text-red-500' : ''} />
              <span className={`text-xl ${timeLeft <= 10 ? 'text-red-500 font-bold' : ''}`}>
                00:{timeLeft.toString().padStart(2, '0')}
              </span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-3">
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-gray-700 bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              <XCircle size={20} />
              Reject
            </button>
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              <CheckCircle size={20} />
              Accept
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
