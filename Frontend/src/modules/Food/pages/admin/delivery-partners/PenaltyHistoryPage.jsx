import React, { useState, useEffect } from 'react';
import api from '../../../../../services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PenaltyHistoryPage = () => {
    const [penalties, setPenalties] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedPenalty, setSelectedPenalty] = useState(null);
    const [actionNote, setActionNote] = useState('');
    const [refundAmount, setRefundAmount] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [histRes, statRes] = await Promise.all([
                api.get('/food/admin/penalties'),
                api.get('/food/admin/penalties/analytics')
            ]);
            setPenalties(histRes.data?.data?.penalties || []);
            setAnalytics(statRes.data?.data?.analytics || null);
        } catch (error) {
            toast.error('Failed to fetch penalty data');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action) => {
        if (!selectedPenalty) return;
        try {
            const payload = {
                action,
                resolutionNote: actionNote
            };
            if (action === 'REFUND' || action === 'APPROVE_APPEAL') {
                payload.amount = Number(refundAmount) || selectedPenalty.penaltyAmount;
            }
            await api.post(`/food/admin/penalty/${selectedPenalty._id}/refund`, payload);
            toast.success(`Penalty ${action.toLowerCase()}ed successfully`);
            setSelectedPenalty(null);
            setActionNote('');
            setRefundAmount('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || `Failed to ${action.toLowerCase()} penalty`);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Late Delivery Penalties</h1>

            {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500">Today's Penalties</p>
                        <h3 className="text-2xl font-bold text-gray-800">{analytics.todayLateDeliveries || 0}</h3>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500">Total Deducted</p>
                        <h3 className="text-2xl font-bold text-red-600">₹{analytics.totalPenaltyAmount || 0}</h3>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500">Avg Delay</p>
                        <h3 className="text-2xl font-bold text-orange-600">{analytics.averageDelayMins || 0} mins</h3>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500">Active Appeals</p>
                        <h3 className="text-2xl font-bold text-blue-600">{analytics.refundRequests || 0}</h3>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="p-4 font-semibold text-gray-600 text-sm">Date</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm">Rider</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm">Order ID</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm">Delay (Mins)</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm">Penalty</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm">Status</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {penalties.map(p => (
                                <tr key={p._id} className="hover:bg-gray-50 transition">
                                    <td className="p-4 text-sm text-gray-700">{format(new Date(p.createdAt), 'dd MMM yyyy, hh:mm a')}</td>
                                    <td className="p-4 text-sm text-gray-700">
                                        {p.riderId?.firstName} {p.riderId?.lastName}
                                        <div className="text-xs text-gray-500">{p.riderId?.phone}</div>
                                    </td>
                                    <td className="p-4 text-sm text-blue-600 hover:underline cursor-pointer">
                                        #{p.orderId?.order_id || 'N/A'}
                                    </td>
                                    <td className="p-4 text-sm text-gray-700 font-medium">{p.lateMinutes} mins</td>
                                    <td className="p-4 text-sm text-red-600 font-medium">₹{p.penaltyAmount}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                            p.status === 'APPLIED' ? 'bg-red-100 text-red-700' :
                                            p.status === 'APPEALED' ? 'bg-blue-100 text-blue-700' :
                                            p.status === 'REFUNDED' ? 'bg-green-100 text-green-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {p.status}
                                        </span>
                                        {p.status === 'APPEALED' && (
                                            <div className="text-xs text-blue-600 mt-1 mt-1 font-semibold truncate max-w-xs" title={p.appealReason}>
                                                Reason: {p.appealReason}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {['APPLIED', 'APPEALED'].includes(p.status) && (
                                            <button 
                                                onClick={() => setSelectedPenalty(p)}
                                                className="text-orange-600 text-sm font-medium hover:underline"
                                            >
                                                Manage
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {penalties.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-500">No penalties recorded yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedPenalty && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Manage Penalty</h3>
                            <button onClick={() => setSelectedPenalty(null)} className="text-gray-500 hover:text-gray-700">&times;</button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                                <p><span className="text-gray-500">Rider:</span> {selectedPenalty.riderId?.firstName}</p>
                                <p><span className="text-gray-500">Delay:</span> <span className="font-semibold">{selectedPenalty.lateMinutes} mins</span></p>
                                <p><span className="text-gray-500">Deducted:</span> <span className="text-red-600 font-semibold">₹{selectedPenalty.penaltyAmount}</span></p>
                                {selectedPenalty.status === 'APPEALED' && (
                                    <div className="mt-2 p-2 bg-blue-50 text-blue-800 rounded border border-blue-100">
                                        <strong>Appeal Reason:</strong> {selectedPenalty.appealReason}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Refund Amount (₹)</label>
                                <input 
                                    type="number" 
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
                                    placeholder={selectedPenalty.penaltyAmount}
                                    value={refundAmount}
                                    onChange={e => setRefundAmount(e.target.value)}
                                    max={selectedPenalty.penaltyAmount}
                                />
                                <p className="text-xs text-gray-500 mt-1">Leave blank to refund full amount.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Note (Optional)</label>
                                <textarea 
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
                                    rows="2"
                                    value={actionNote}
                                    onChange={e => setActionNote(e.target.value)}
                                    placeholder="Reason for decision..."
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex flex-wrap gap-2 justify-end">
                            {selectedPenalty.status === 'APPEALED' ? (
                                <>
                                    <button onClick={() => handleAction('REJECT_APPEAL')} className="px-4 py-2 border border-red-200 bg-red-50 text-red-600 rounded font-medium hover:bg-red-100">Reject Appeal</button>
                                    <button onClick={() => handleAction('APPROVE_APPEAL')} className="px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700">Approve & Refund</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => handleAction('WAIVE')} className="px-4 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-100">Waive (No Refund)</button>
                                    <button onClick={() => handleAction('REFUND')} className="px-4 py-2 bg-orange-600 text-white rounded font-medium hover:bg-orange-700">Process Refund</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PenaltyHistoryPage;
