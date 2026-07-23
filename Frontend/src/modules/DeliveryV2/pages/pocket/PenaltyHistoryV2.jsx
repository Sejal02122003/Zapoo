import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, AlertTriangle, MessageSquare, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deliveryAPI } from '@food/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PenaltyHistoryV2() {
    const navigate = useNavigate();
    const [penalties, setPenalties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPenalty, setSelectedPenalty] = useState(null);
    const [appealReason, setAppealReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPenalties();
    }, []);

    const fetchPenalties = async () => {
        try {
            setLoading(true);
            const res = await deliveryAPI.get('/penalties');
            setPenalties(res.data?.data?.penalties || []);
        } catch (error) {
            console.error('Failed to fetch penalties:', error);
            toast.error('Could not load penalty history');
        } finally {
            setLoading(false);
        }
    };

    const handleAppeal = async () => {
        if (!appealReason.trim()) {
            toast.error('Please enter a reason for your appeal');
            return;
        }

        try {
            setSubmitting(true);
            await deliveryAPI.post(`/penalty/${selectedPenalty._id}/appeal`, {
                appealReason
            });
            toast.success('Appeal submitted successfully');
            setSelectedPenalty(null);
            setAppealReason('');
            fetchPenalties();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit appeal');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-50 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <ChevronLeft className="w-6 h-6 text-gray-700" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Late Delivery Penalties</h1>
            </div>

            <div className="p-4 space-y-4">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading...</div>
                ) : penalties.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">No Penalties!</h3>
                        <p className="text-gray-500 text-sm mt-1">You're doing a great job delivering on time.</p>
                    </div>
                ) : (
                    penalties.map(p => (
                        <div key={p._id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-900">Order #{p.orderId?.order_id || 'N/A'}</h3>
                                    <p className="text-xs text-gray-500">{format(new Date(p.createdAt), 'dd MMM yyyy, hh:mm a')}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                    p.status === 'APPLIED' ? 'bg-red-100 text-red-700' :
                                    p.status === 'APPEALED' ? 'bg-blue-100 text-blue-700' :
                                    p.status === 'REFUNDED' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                    {p.status}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-4 py-3 border-y border-gray-50 mb-3">
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Delay</p>
                                    <p className="font-bold text-gray-800">{p.lateMinutes} mins</p>
                                </div>
                                <div className="w-px h-8 bg-gray-200"></div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Penalty</p>
                                    <p className="font-bold text-red-600">-₹{p.penaltyAmount}</p>
                                </div>
                            </div>

                            {p.status === 'APPLIED' && (
                                <button 
                                    onClick={() => setSelectedPenalty(p)}
                                    className="w-full py-2 bg-orange-50 text-orange-600 font-bold rounded-xl text-sm"
                                >
                                    Appeal Penalty
                                </button>
                            )}

                            {p.status === 'APPEALED' && (
                                <div className="bg-blue-50 p-3 rounded-xl">
                                    <p className="text-xs text-blue-800 font-medium">Appeal pending review: "{p.appealReason}"</p>
                                </div>
                            )}

                            {p.status === 'REFUNDED' && (
                                <div className="bg-green-50 p-3 rounded-xl">
                                    <p className="text-xs text-green-800 font-medium">Refund processed</p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Appeal Modal */}
            {selectedPenalty && (
                <div className="fixed inset-0 z-[600] flex items-end">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedPenalty(null)} />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        className="relative w-full bg-white rounded-t-3xl shadow-2xl p-6 pb-10"
                    >
                        <h2 className="text-xl font-black text-gray-900 mb-2">Appeal Penalty</h2>
                        <p className="text-sm text-gray-600 mb-6">Explain why the delivery was delayed for Order #{selectedPenalty.orderId?.order_id}. Be specific.</p>
                        
                        <textarea
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl mb-6 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                            rows="4"
                            placeholder="E.g., Heavy rain, restaurant delayed the order, extreme traffic..."
                            value={appealReason}
                            onChange={e => setAppealReason(e.target.value)}
                        />

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setSelectedPenalty(null)}
                                className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-2xl"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAppeal}
                                disabled={submitting}
                                className="flex-1 py-3.5 bg-orange-600 text-white font-bold rounded-2xl disabled:opacity-50"
                            >
                                {submitting ? 'Submitting...' : 'Submit Appeal'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
