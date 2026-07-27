import React, { useState, useEffect } from 'react';
import { adminAPI } from '@food/api';
import { Clock, Activity, Loader2, RefreshCw } from 'lucide-react';

export default function AdminRiderActiveHours({ riderId, riderName }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    const fetchHours = async () => {
        if (!riderId) return;
        try {
            setLoading(true);
            const res = await adminAPI.getRiderActiveHours(riderId);
            if (res?.data?.success && res.data.data) {
                setData(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch admin rider active hours:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHours();
    }, [riderId]);

    if (loading && !data) {
        return (
            <div className="p-6 bg-white rounded-2xl border border-gray-200 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            </div>
        );
    }

    const totalHours = data?.totalHours || 0;
    const isOnline = data?.isCurrentlyOnline || false;
    const dailyBreakdown = data?.dailyBreakdown || [];
    const maxDayHours = Math.max(1, ...dailyBreakdown.map((d) => d.hours || 0));

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-gray-900">
                            7-Day Order Delivery Hours {riderName ? `(${riderName})` : ''}
                        </h4>
                        <p className="text-xs text-gray-400">Hours spent on order trips (accepted → delivered)</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isOnline && (
                        <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1.5 animate-pulse">
                            <Activity className="w-3 h-3 text-emerald-600" />
                            On Active Trip
                        </span>
                    )}
                    <button
                        onClick={fetchHours}
                        disabled={loading}
                        className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                <div>
                    <p className="text-xs text-emerald-700 font-medium">Order Delivery Duty Time (7 Days)</p>
                    <h3 className="text-2xl font-black text-emerald-950 mt-0.5">{totalHours} <span className="text-sm font-semibold text-emerald-700">hrs</span></h3>
                </div>
                {isOnline && data?.currentSessionElapsedMinutes > 0 && (
                    <div className="text-right">
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Current Session</p>
                        <p className="text-xs font-bold text-emerald-900 mt-0.5">+{data.currentSessionElapsedMinutes} mins</p>
                    </div>
                )}
            </div>

            <div>
                <p className="text-xs font-bold text-gray-500 mb-2">Daily Duty Breakdown (IST)</p>
                <div className="grid grid-cols-7 gap-1.5 items-end h-28 pt-4 pb-1 px-1 bg-gray-50/70 rounded-xl border border-gray-100">
                    {dailyBreakdown.map((day, idx) => {
                        const heightPct = Math.min(100, Math.max(8, (day.hours / maxDayHours) * 100));
                        return (
                            <div key={day.dateStr || idx} className="flex flex-col items-center gap-1 h-full justify-end group">
                                <span className="text-[10px] font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {day.hours}h
                                </span>
                                <div
                                    style={{ height: `${heightPct}%` }}
                                    className={`w-full max-w-[20px] rounded-t-md transition-all ${
                                        day.hours > 0 ? 'bg-emerald-500 group-hover:bg-emerald-600' : 'bg-gray-200'
                                    }`}
                                />
                                <span className="text-[10px] font-medium text-gray-500 mt-1">{day.dayLabel}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
