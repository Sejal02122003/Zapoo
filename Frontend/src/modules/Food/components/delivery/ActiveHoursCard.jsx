import React, { useState, useEffect } from 'react';
import { Clock, Activity, Loader2 } from 'lucide-react';
import { deliveryAPI } from '@food/api';

export default function ActiveHoursCard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    const fetchActiveHours = async () => {
        try {
            setLoading(true);
            const res = await deliveryAPI.getActiveHours();
            if (res?.data?.success && res.data.data) {
                setData(res.data.data);
            }
        } catch (err) {
            console.error('ActiveHoursCard fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveHours();

        // 3-minute heartbeat loop if online
        const heartbeatInterval = setInterval(() => {
            if (data?.isCurrentlyOnline) {
                deliveryAPI.sendHeartbeat().catch(() => {});
            }
        }, 3 * 60 * 1000);

        return () => clearInterval(heartbeatInterval);
    }, [data?.isCurrentlyOnline]);

    if (loading && !data) {
        return (
            <div className="p-5 bg-white rounded-2xl border border-gray-200 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            </div>
        );
    }

    const totalHours = data?.totalHours || 0;
    const isOnline = data?.isCurrentlyOnline || false;
    const dailyBreakdown = data?.dailyBreakdown || [];

    // Find max hours for bar chart scaling
    const maxDayHours = Math.max(1, ...dailyBreakdown.map((d) => d.hours || 0));

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-gray-900">7-Day Order Delivery Hours</h3>
                        <p className="text-xs text-gray-400">Hours spent on order trips (accepted → delivered)</p>
                    </div>
                </div>

                {isOnline && (
                    <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1.5 animate-pulse">
                        <Activity className="w-3 h-3 text-emerald-600" />
                        On Active Trip
                    </span>
                )}
            </div>

            {/* Total Hours Badge */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                <div>
                    <p className="text-xs text-emerald-700 font-medium">Order Delivery Duty Time</p>
                    <h2 className="text-2xl font-black text-emerald-950 mt-0.5">{totalHours} <span className="text-sm font-semibold text-emerald-700">hrs</span></h2>
                </div>
                {isOnline && data?.currentSessionElapsedMinutes > 0 && (
                    <div className="text-right">
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Current Session</p>
                        <p className="text-xs font-bold text-emerald-900 mt-0.5">+{data.currentSessionElapsedMinutes} mins</p>
                    </div>
                )}
            </div>

            {/* Daily Breakdown Bar Chart */}
            <div>
                <p className="text-xs font-bold text-gray-500 mb-2">Daily Active Hours</p>
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
