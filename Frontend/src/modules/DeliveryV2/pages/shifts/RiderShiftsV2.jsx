import React, { useState, useEffect } from 'react';
import apiClient from '@/services/api/axios';
import { useNavigate } from 'react-router-dom';

export default function RiderShiftsV2() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('available'); // 'available' | 'payouts'
    const [shifts, setShifts] = useState([]);
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchShifts = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/food/admin/shifts/rider');
            if (response.data?.success) {
                setShifts(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching available shifts", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPayouts = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/food/admin/shifts/rider/payouts');
            if (response.data?.success) {
                setPayouts(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching payouts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'available') fetchShifts();
        if (activeTab === 'payouts') fetchPayouts();
    }, [activeTab]);

    const handleBookShift = async (shiftId) => {
        try {
            if (!window.confirm("Are you sure you want to book this shift? You must maintain minimum login hours to get the guarantee.")) return;
            
            const response = await apiClient.post(`/food/admin/shifts/rider/${shiftId}/book`);
            if (response.data?.success) {
                alert("Shift booked successfully!");
                fetchShifts();
            } else {
                alert(response.data?.message || "Failed to book shift");
            }
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || "Error booking shift");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 space-y-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="text-gray-600 p-1">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-lg font-bold text-gray-800">Shift Management</h1>
                </div>

                {/* Sub tabs */}
                <div className="flex border-b border-gray-100 gap-4 text-xs font-bold pt-1">
                    <button
                        onClick={() => setActiveTab('available')}
                        className={`pb-2 border-b-2 transition ${activeTab === 'available' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400'}`}
                    >
                        Available Shifts
                    </button>
                    <button
                        onClick={() => setActiveTab('payouts')}
                        className={`pb-2 border-b-2 transition ${activeTab === 'payouts' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400'}`}
                    >
                        My Shift Payouts
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {activeTab === 'available' && (
                    <>
                        {loading ? (
                            <div className="text-center py-10 text-gray-500 text-xs">Loading available shifts...</div>
                        ) : shifts.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-xl border border-gray-100 shadow-sm">
                                <div className="text-4xl mb-3">📭</div>
                                <h3 className="text-gray-800 font-semibold mb-1 text-sm">No Shifts Available</h3>
                                <p className="text-gray-500 text-xs px-6">There are no open shifts right now. Check back later!</p>
                            </div>
                        ) : (
                            shifts.map((shift) => {
                                const isOpen = shift.isOpenForBooking !== false;
                                const opensAtDate = shift.bookingOpensAt ? new Date(shift.bookingOpensAt) : null;

                                return (
                                    <div key={shift._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
                                        {shift.bonusEnabled && (
                                            <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                                                Guarantee Inside
                                            </div>
                                        )}
                                        <div className="p-4 pt-5">
                                            <h3 className="text-base font-bold text-gray-800 mb-1">{shift.name}</h3>
                                            <div className="text-gray-500 text-xs mb-3 flex items-center gap-1.5">
                                                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {new Date(shift.startTime).toLocaleString([], {hour: '2-digit', minute:'2-digit', month: 'short', day: 'numeric'})} - {new Date(shift.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>

                                            <div className="flex gap-2 mb-4">
                                                <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium flex items-center gap-1">
                                                    📍 {shift.city}
                                                </span>
                                                <span className="px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium flex items-center gap-1">
                                                    👥 {shift.bookedCount || 0}/{shift.maxPartners} Booked
                                                </span>
                                            </div>

                                            {shift.bonusEnabled && (
                                                <div className="bg-green-50/50 rounded-lg p-3 border border-green-100 mb-4">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-green-800 text-xs font-semibold">Minimum Guarantee</span>
                                                        <span className="text-green-600 font-bold text-sm">₹{shift.guaranteeAmount}</span>
                                                    </div>
                                                    <div className="text-[11px] text-green-700 flex justify-between">
                                                        <span>Min Orders: {shift.minimumOrders}</span>
                                                        <span>Required Online: {shift.minimumLoginPercentage}%</span>
                                                    </div>
                                                </div>
                                            )}

                                            {!isOpen ? (
                                                <div className="w-full py-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-center font-bold text-xs">
                                                    🔒 Opens tomorrow at {opensAtDate ? opensAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Midnight'}
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleBookShift(shift._id)}
                                                    disabled={shift.isFullyBooked}
                                                    className={`w-full py-3 rounded-xl font-bold text-xs transition ${shift.isFullyBooked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'}`}
                                                >
                                                    {shift.isFullyBooked ? 'Shift Full' : 'Book Shift'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </>
                )}

                {activeTab === 'payouts' && (
                    <>
                        {loading ? (
                            <div className="text-center py-10 text-gray-500 text-xs">Loading payouts...</div>
                        ) : payouts.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-xl border border-gray-100 shadow-sm">
                                <div className="text-4xl mb-3">💸</div>
                                <h3 className="text-gray-800 font-semibold mb-1 text-sm">No Shift Payouts Yet</h3>
                                <p className="text-gray-500 text-xs px-6">Complete shift slots to earn bank payouts!</p>
                            </div>
                        ) : (
                            payouts.map((payout) => (
                                <div key={payout._id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-2 text-xs">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm">{payout.shiftId?.name || 'Shift Payout'}</h4>
                                            <div className="text-gray-400 text-[11px]">
                                                {new Date(payout.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                            payout.status === 'PAID' ? 'bg-green-50 text-green-700 border border-green-200' :
                                            payout.status === 'ON_HOLD' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                            'bg-blue-50 text-blue-700 border border-blue-200'
                                        }`}>
                                            {payout.status}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                                        <span className="text-gray-500">Amount Owed:</span>
                                        <span className="font-bold text-base text-green-600">₹{payout.amount}</span>
                                    </div>

                                    {payout.referenceNumber && (
                                        <div className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg">
                                            Bank UTR Ref: <span className="font-mono font-bold text-gray-900">{payout.referenceNumber}</span>
                                        </div>
                                    )}

                                    {payout.holdReason && (
                                        <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg">
                                            Hold Reason: {payout.holdReason}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
