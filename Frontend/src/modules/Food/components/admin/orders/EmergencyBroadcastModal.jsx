import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@food/components/ui/dialog";
import { Loader2, Radio } from "lucide-react";
import { adminAPI } from '../../../../../services/api';

export default function EmergencyBroadcastModal({ isOpen, onOpenChange, order, onSuccess }) {
  const [radius, setRadius] = useState(5);
  const [extraIncentive, setExtraIncentive] = useState(20);
  const [duration, setDuration] = useState(120);
  const [message, setMessage] = useState('');
  
  const [eligibleCount, setEligibleCount] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      const fetchPreview = async () => {
        try {
          setIsPreviewLoading(true);
          const res = await adminAPI.getEligibleRidersPreview(order._id || order.id, radius);
          if (res.data.success) {
            setEligibleCount(res.data.count);
          }
        } catch (error) {
          console.error("Preview error", error);
        } finally {
          setIsPreviewLoading(false);
        }
      };

      const timer = setTimeout(fetchPreview, 500); // debounce
      return () => clearTimeout(timer);
    }
  }, [radius, isOpen, order]);

  const handleBroadcast = async () => {
    try {
      setIsBroadcasting(true);
      const res = await adminAPI.startEmergencyBroadcast(order._id || order.id, {
        radius,
        extraIncentive,
        duration,
        message,
        priority: 'CRITICAL'
      });
      if (res.data.success) {
        onSuccess(res.data.broadcast);
        onOpenChange(false);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to start broadcast');
    } finally {
      setIsBroadcasting(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 sm:p-8">
        <DialogHeader className="pr-8 space-y-1.5">
          <DialogTitle className="flex items-center gap-2.5 text-red-600 text-xl font-bold">
            <Radio className="w-5 h-5 animate-pulse" />
            Emergency Broadcast
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 leading-relaxed">
            Broadcast this order to multiple delivery partners at once. The first partner to accept gets the assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Broadcast Radius (km)</label>
            <input 
              type="number" 
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              min="1"
              max="50"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium text-slate-700" 
            />
            <div className="text-xs text-slate-500 flex items-center justify-between mt-1">
              <span>Finding partners near the restaurant...</span>
              {isPreviewLoading ? (
                <span className="flex items-center gap-1 text-blue-600"><Loader2 className="w-3 h-3 animate-spin"/> Calculating...</span>
              ) : (
                <span className="font-semibold text-emerald-600">{eligibleCount !== null ? `${eligibleCount} riders found` : ''}</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Extra Incentive (₹)</label>
            <input 
              type="number" 
              value={extraIncentive}
              onChange={e => setExtraIncentive(Number(e.target.value))}
              min="0"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium text-slate-700" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Duration (seconds)</label>
            <input 
              type="number" 
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              min="30"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium text-slate-700" 
            />
            <p className="text-xs text-slate-500">Order will auto-expire from rider screens after this duration.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Custom Message (Optional)</label>
            <textarea 
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. High priority! Customer waiting."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium text-slate-700 resize-none h-20" 
            />
          </div>

          <div className="pt-3">
            <button
              onClick={handleBroadcast}
              disabled={isBroadcasting || eligibleCount === 0}
              className={`w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] ${
                isBroadcasting || eligibleCount === 0 ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-red-600 hover:bg-red-700 hover:shadow-md'
              }`}
            >
              {isBroadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
              {isBroadcasting ? 'Broadcasting...' : 'Start Broadcast'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
