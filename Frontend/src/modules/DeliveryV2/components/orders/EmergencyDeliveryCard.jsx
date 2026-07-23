import React, { useState, useEffect } from 'react';
import { MapPin, IndianRupee, Clock, Zap, X } from 'lucide-react';
import { api } from '../../../../services/api'; // Assuming a general api export or update if needed

export default function EmergencyDeliveryCard({ broadcast, onAccept, onDecline, onExpired }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  useEffect(() => {
    if (!broadcast?.expiresAt) return;
    
    const target = new Date(broadcast.expiresAt).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((target - now) / 1000));
      setTimeLeft(diff);
      
      if (diff === 0) {
        onExpired?.(broadcast.broadcastId);
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [broadcast]);

  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      const res = await api.post(`/food/delivery/orders/${broadcast.orderId}/emergency-accept`);
      if (res.data.success) {
        onAccept?.(broadcast);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to accept or someone else got it first!');
      onExpired?.(broadcast.broadcastId); // Dismiss it as it's no longer valid
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    try {
      setIsDeclining(true);
      await api.post(`/food/delivery/orders/${broadcast.orderId}/emergency-decline`);
      onDecline?.(broadcast.broadcastId);
    } catch (error) {
      console.error(error);
      onDecline?.(broadcast.broadcastId); // Dismiss anyway
    } finally {
      setIsDeclining(false);
    }
  };

  if (timeLeft === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-red-600 p-4 text-white flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-lg mb-1">
              <Zap className="w-5 h-5 fill-white animate-pulse" />
              EMERGENCY ORDER
            </div>
            {broadcast.message && (
              <p className="text-red-100 text-sm">{broadcast.message}</p>
            )}
          </div>
          <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 backdrop-blur-md">
            <Clock className="w-4 h-4" />
            00:{timeLeft.toString().padStart(2, '0')}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1"><MapPin className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pickup</p>
              <p className="font-semibold text-slate-900">{broadcast.pickup}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="mt-1"><MapPin className="w-5 h-5 text-red-500" /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Drop</p>
              <p className="font-semibold text-slate-900">{broadcast.drop}</p>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
            <span className="font-semibold text-emerald-800">Extra Incentive</span>
            <span className="text-xl font-black text-emerald-600 flex items-center">
              <IndianRupee className="w-5 h-5" />
              {broadcast.extraIncentive}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button 
            onClick={handleDecline}
            disabled={isDeclining || isAccepting}
            className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Decline
          </button>
          <button 
            onClick={handleAccept}
            disabled={isAccepting || isDeclining}
            className="flex-[2] py-3.5 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAccepting ? 'Accepting...' : 'ACCEPT NOW'}
          </button>
        </div>
      </div>
    </div>
  );
}
