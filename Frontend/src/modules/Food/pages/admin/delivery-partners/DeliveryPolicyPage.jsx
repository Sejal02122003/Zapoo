import React, { useState, useEffect } from 'react';
import api from '../../../../../services/api';
import { toast } from 'sonner';

const DeliveryPolicyPage = () => {
    const [policy, setPolicy] = useState({
        enablePenalty: true,
        penaltyRate: 1,
        graceMinutes: 5,
        maxDeduction: 100,
        autoDeduct: true,
        excludedReasons: 'Restaurant Delay, Customer Delay, Weather, Traffic Override, System Outage',
        minOrderValue: 100
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        fetchPolicy();
    }, []);

    const fetchPolicy = async () => {
        try {
            setFetching(true);
            const res = await api.get('/food/admin/delivery-policy');
            if (res.data?.data?.policy) {
                const p = res.data.data.policy;
                setPolicy({
                    ...p,
                    excludedReasons: Array.isArray(p.excludedReasons) ? p.excludedReasons.join(', ') : p.excludedReasons
                });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to fetch policy');
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const payload = {
                ...policy,
                excludedReasons: policy.excludedReasons.split(',').map(s => s.trim()).filter(Boolean)
            };
            await api.patch('/food/admin/delivery-policy', payload);
            toast.success('Delivery policy updated successfully');
            fetchPolicy();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update policy');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-6 text-center text-gray-500">Loading policy...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Late Delivery Penalty Policy</h1>
            
            <form onSubmit={handleSave} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-3xl">
                <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                        <div>
                            <h3 className="font-semibold text-gray-800">Enable Late Delivery Penalty</h3>
                            <p className="text-sm text-gray-600">If disabled, riders won't be penalized for late deliveries.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={policy.enablePenalty}
                                onChange={(e) => setPolicy({...policy, enablePenalty: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (Minutes)</label>
                            <input 
                                type="number" 
                                required
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                                value={policy.graceMinutes}
                                onChange={(e) => setPolicy({...policy, graceMinutes: Number(e.target.value)})}
                            />
                            <p className="text-xs text-gray-500 mt-1">Extra time allowed after ETA before penalty starts.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Penalty Rate (₹ per minute)</label>
                            <input 
                                type="number" 
                                required
                                min="0"
                                step="0.5"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                                value={policy.penaltyRate}
                                onChange={(e) => setPolicy({...policy, penaltyRate: Number(e.target.value)})}
                            />
                            <p className="text-xs text-gray-500 mt-1">Amount deducted per minute late.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Deduction (₹)</label>
                            <input 
                                type="number" 
                                required
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                                value={policy.maxDeduction}
                                onChange={(e) => setPolicy({...policy, maxDeduction: Number(e.target.value)})}
                            />
                            <p className="text-xs text-gray-500 mt-1">Cap the total penalty amount.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Value (₹)</label>
                            <input 
                                type="number" 
                                required
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                                value={policy.minOrderValue}
                                onChange={(e) => setPolicy({...policy, minOrderValue: Number(e.target.value)})}
                            />
                            <p className="text-xs text-gray-500 mt-1">Apply penalty only if order value is above this.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Excluded Delay Reasons (Comma separated)</label>
                        <textarea 
                            rows="2"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                            value={policy.excludedReasons}
                            onChange={(e) => setPolicy({...policy, excludedReasons: e.target.value})}
                        />
                        <p className="text-xs text-gray-500 mt-1">If the rider selects any of these reasons, the penalty is excused automatically.</p>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="bg-orange-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-700 transition disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Policy Changes'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default DeliveryPolicyPage;
