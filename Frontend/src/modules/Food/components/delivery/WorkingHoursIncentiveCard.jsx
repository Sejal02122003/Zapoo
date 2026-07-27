import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, Gift, Loader2 } from 'lucide-react';
import { deliveryAPI } from '@food/api';
import { toast } from 'sonner';

export default function WorkingHoursIncentiveCard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [claimingId, setClaimingId] = useState(null);

    const fetchIncentiveProgress = async () => {
        try {
            setLoading(true);
            const res = await deliveryAPI.getWorkingHoursIncentiveProgress();
            if (res?.data?.success && res.data.data) {
                setData(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch working hours incentive progress:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIncentiveProgress();
    }, []);

    const handleClaim = async (tierId) => {
        try {
            setClaimingId(tierId);
            const res = await deliveryAPI.claimWorkingHoursIncentive(tierId);
            if (res?.data?.success) {
                toast.success(res.data.message || 'Bonus credited to wallet!');
                fetchIncentiveProgress();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to claim incentive bonus');
        } finally {
            setClaimingId(null);
        }
    };

    if (loading && !data) {
        return (
            <div className="p-5 bg-white rounded-2xl border border-gray-200 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            </div>
        );
    }

    const currentHours = data?.currentHours || 0;
    const tiers = data?.tiers || [];

    if (tiers.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-amber-200 p-5 space-y-4 shadow-sm bg-gradient-to-br from-amber-50/40 to-orange-50/20">
            <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200/60">
                    <Award className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-sm text-gray-900">Working Hours Bonus Targets</h3>
                    <p className="text-xs text-gray-500">Reach order delivery hours targets to earn extra cash</p>
                </div>
            </div>

            <div className="space-y-3 pt-1">
                {tiers.map((tier) => (
                    <div key={tier.id} className="p-3.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="font-bold text-xs text-gray-900">{tier.tierName}</span>
                                <p className="text-[11px] text-gray-400">{tier.description || `${tier.minHours} hours target`}</p>
                            </div>
                            <div className="text-right">
                                <span className="font-black text-emerald-600 text-sm">₹{tier.incentiveAmount}</span>
                                <p className="text-[10px] text-gray-400 font-medium">Bonus</p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-gray-500">
                                <span>Progress ({currentHours} / {tier.minHours} hrs)</span>
                                <span>{tier.progressPct}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    style={{ width: `${tier.progressPct}%` }}
                                    className={`h-full rounded-full transition-all ${
                                        tier.progressPct >= 100 ? 'bg-emerald-500' : 'bg-amber-400'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Claim / Claimed Button */}
                        <div className="pt-1 flex items-center justify-between">
                            {tier.isClaimed ? (
                                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    Bonus Claimed & Credited
                                </span>
                            ) : tier.isEligible ? (
                                <button
                                    onClick={() => handleClaim(tier.id)}
                                    disabled={claimingId === tier.id}
                                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    {claimingId === tier.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <>
                                            <Gift className="w-3.5 h-3.5" />
                                            Claim ₹{tier.incentiveAmount} Bonus
                                        </>
                                    )}
                                </button>
                            ) : (
                                <span className="text-[11px] text-gray-400 font-medium">
                                    Need {Number((tier.minHours - currentHours).toFixed(1))} more hours to unlock
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
