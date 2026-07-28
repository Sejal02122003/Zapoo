import React, { useState, useEffect } from 'react';
import apiClient from '@/services/api/axios';
import { Search, Filter, CheckCircle2, Clock, AlertCircle, Eye, ExternalLink, QrCode, FileText } from 'lucide-react';

export default function PendingPayouts() {
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal states
    const [selectedPayout, setSelectedPayout] = useState(null);
    const [showPaidModal, setShowPaidModal] = useState(false);
    const [showHoldModal, setShowHoldModal] = useState(false);
    const [showQrModal, setShowQrModal] = useState(null);
    const [referenceNumber, setReferenceNumber] = useState('');
    const [note, setNote] = useState('');
    const [holdReason, setHoldReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchPayouts = async () => {
        try {
            setLoading(true);
            const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
            const response = await apiClient.get(`/food/admin/shifts/payouts${query}`);
            const list = response.data?.data || response.data?.payouts;
            if (response.data?.success && Array.isArray(list)) {
                setPayouts(list);
            } else {
                setPayouts([]);
            }
        } catch (error) {
            console.error('Error fetching payouts', error);
            setPayouts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayouts();
    }, [statusFilter]);

    const handleMarkPaid = async (e) => {
        e.preventDefault();
        if (!selectedPayout) return;
        try {
            setSubmitting(true);
            const response = await apiClient.post(`/food/admin/shifts/payouts/${selectedPayout._id}/mark-paid`, {
                referenceNumber,
                note
            });
            if (response.data?.success) {
                alert('Payout marked as paid!');
                setShowPaidModal(false);
                setSelectedPayout(null);
                setReferenceNumber('');
                setNote('');
                fetchPayouts();
            }
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to mark payout as paid');
        } finally {
            setSubmitting(false);
        }
    };

    const handleHold = async (e) => {
        e.preventDefault();
        if (!selectedPayout) return;
        try {
            setSubmitting(true);
            const response = await apiClient.post(`/food/admin/shifts/payouts/${selectedPayout._id}/hold`, {
                holdReason
            });
            if (response.data?.success) {
                alert('Payout placed on hold');
                setShowHoldModal(false);
                setSelectedPayout(null);
                setHoldReason('');
                fetchPayouts();
            }
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to hold payout');
        } finally {
            setSubmitting(false);
        }
    };

    const safePayouts = Array.isArray(payouts) ? payouts : [];
    const filteredPayouts = safePayouts.filter((p) => {
        if (!p) return false;
        const name = p.riderId?.name || p.bankDetailsSnapshot?.accountHolderName || '';
        const phone = p.riderId?.phone || '';
        return name.toLowerCase().includes((searchTerm || '').toLowerCase()) || phone.includes(searchTerm || '');
    });

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Shift Completion Payouts</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Bank transfer obligations auto-created upon shift completion & settlement.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:w-64">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search rider name/phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                        />
                    </div>

                    {/* Filter Status */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border rounded-xl text-xs font-semibold bg-gray-50/50 text-gray-700 outline-none"
                    >
                        <option value="PENDING">Pending Only</option>
                        <option value="PAID">Paid</option>
                        <option value="ON_HOLD">On Hold</option>
                        <option value="ALL">All Payouts</option>
                    </select>
                </div>
            </div>

            {/* Payouts Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400 text-sm">Loading payouts...</div>
                ) : filteredPayouts.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        No payouts found matching criteria.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-gray-50 border-b border-gray-100 font-bold text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Rider Details</th>
                                    <th className="px-6 py-4">Shift & Date</th>
                                    <th className="px-6 py-4">Payout Amount</th>
                                    <th className="px-6 py-4">Bank & UPI Details</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredPayouts.map((payout) => {
                                    const bank = payout.bankDetailsSnapshot || {};
                                    const hasDetails = bank.accountNumber !== 'N/A' || bank.upiId !== 'N/A' || bank.upiQrCode;

                                    return (
                                        <tr key={payout._id} className="hover:bg-gray-50/50 transition">
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                <div className="font-bold text-sm text-gray-900">{payout.riderId?.name || bank.accountHolderName}</div>
                                                <div className="text-gray-400">{payout.riderId?.phone || 'N/A'}</div>
                                            </td>

                                            <td className="px-6 py-4 text-gray-600">
                                                <div className="font-semibold text-gray-800">{payout.shiftId?.name || 'Shift'}</div>
                                                <div className="text-gray-400 text-[11px]">
                                                    {new Date(payout.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 font-bold text-green-600 text-sm">
                                                ₹{payout.amount}
                                            </td>

                                            <td className="px-6 py-4 text-gray-700">
                                                {!hasDetails ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                                                        <AlertCircle className="w-3 h-3 mr-1" /> Details Missing
                                                    </span>
                                                ) : (
                                                    <div className="space-y-0.5">
                                                        {bank.accountNumber !== 'N/A' && (
                                                            <div><span className="text-gray-400">Acc:</span> {bank.accountNumber}</div>
                                                        )}
                                                        {bank.ifscCode !== 'N/A' && (
                                                            <div><span className="text-gray-400">IFSC:</span> {bank.ifscCode}</div>
                                                        )}
                                                        {bank.upiId !== 'N/A' && (
                                                            <div><span className="text-gray-400">UPI:</span> {bank.upiId}</div>
                                                        )}
                                                        {bank.upiQrCode && (
                                                            <button
                                                                onClick={() => setShowQrModal(bank.upiQrCode)}
                                                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                                                            >
                                                                <QrCode className="w-3 h-3" /> View QR Code
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                                        payout.status === 'PAID'
                                                            ? 'bg-green-50 text-green-700 border border-green-200'
                                                            : payout.status === 'ON_HOLD'
                                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                    }`}
                                                >
                                                    {payout.status}
                                                </span>
                                                {payout.referenceNumber && (
                                                    <div className="text-[10px] text-gray-400 mt-1">Ref: {payout.referenceNumber}</div>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-right space-x-2">
                                                {payout.status === 'PENDING' && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedPayout(payout);
                                                                setShowPaidModal(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition text-[11px] shadow-sm"
                                                        >
                                                            Mark as Paid
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedPayout(payout);
                                                                setShowHoldModal(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition text-[11px]"
                                                        >
                                                            Hold
                                                        </button>
                                                    </>
                                                )}
                                                {payout.status === 'ON_HOLD' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPayout(payout);
                                                            setShowPaidModal(true);
                                                        }}
                                                        className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition text-[11px]"
                                                    >
                                                        Override & Pay
                                                    </button>
                                                )}
                                                {payout.status === 'PAID' && (
                                                    <span className="text-gray-400 font-medium">Completed</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Mark as Paid Modal */}
            {showPaidModal && selectedPayout && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">Mark Payout as Paid</h3>
                        <p className="text-xs text-gray-500">
                            Confirm that you have transferred <span className="font-bold text-gray-900">₹{selectedPayout.amount}</span> to {selectedPayout.riderId?.name || selectedPayout.bankDetailsSnapshot?.accountHolderName}.
                        </p>

                        <div className="p-3 bg-gray-50 rounded-xl space-y-1 text-xs border border-gray-100">
                            <div><span className="text-gray-400">Account:</span> {selectedPayout.bankDetailsSnapshot?.accountNumber}</div>
                            <div><span className="text-gray-400">IFSC:</span> {selectedPayout.bankDetailsSnapshot?.ifscCode}</div>
                            <div><span className="text-gray-400">UPI ID:</span> {selectedPayout.bankDetailsSnapshot?.upiId}</div>
                        </div>

                        <form onSubmit={handleMarkPaid} className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    UTR / Transaction Reference Number (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. UTR123456789"
                                    value={referenceNumber}
                                    onChange={(e) => setReferenceNumber(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Note (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Sent via GPay/IMPS"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPaidModal(false)}
                                    className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-sm transition"
                                >
                                    {submitting ? 'Confirming...' : 'Confirm Paid'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Hold Modal */}
            {showHoldModal && selectedPayout && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">Hold Payout</h3>
                        <form onSubmit={handleHold} className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Hold</label>
                                <textarea
                                    rows="3"
                                    placeholder="e.g. Bank account number incorrect, awaiting clarification"
                                    value={holdReason}
                                    onChange={(e) => setHoldReason(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowHoldModal(false)}
                                    className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition"
                                >
                                    {submitting ? 'Holding...' : 'Place on Hold'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQrModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowQrModal(null)}>
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-xs text-center space-y-3" onClick={(e) => e.stopPropagation()}>
                        <h4 className="font-bold text-sm text-gray-900">Rider UPI QR Code</h4>
                        <img src={showQrModal} alt="UPI QR" className="w-64 h-64 object-contain rounded-xl border mx-auto" />
                        <button
                            onClick={() => setShowQrModal(null)}
                            className="w-full py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
