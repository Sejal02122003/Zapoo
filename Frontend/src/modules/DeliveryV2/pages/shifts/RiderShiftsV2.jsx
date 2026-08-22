import React, { useState, useEffect } from 'react';
import apiClient from '@/services/api/axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function RiderShiftsV2() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('available'); // 'available' | 'my-shifts' | 'payouts'
    const [shifts, setShifts] = useState([]);
    const [myShifts, setMyShifts] = useState([]);
    const [payouts, setPayouts] = useState([]);
    const [riderZone, setRiderZone] = useState({ zoneId: null, zoneName: '' });
    const [selectedZone, setSelectedZone] = useState(null); // null = use rider's default assigned zone
    const [availableZones, setAvailableZones] = useState([]);
    const [showZoneModal, setShowZoneModal] = useState(false);
    const [loadingZones, setLoadingZones] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchShifts = async (overrideZoneId = selectedZone?._id) => {
        try {
            setLoading(true);
            const params = overrideZoneId ? { zoneId: overrideZoneId } : {};
            const response = await apiClient.get('/food/delivery/shifts/rider', { params });
            if (response.data?.success) {
                setShifts(response.data.data || []);
                if (response.data.riderZone) {
                    setRiderZone(response.data.riderZone);
                }
            }
        } catch (error) {
            console.error("Error fetching available shifts", error);
            toast.error("Failed to load shifts");
        } finally {
            setLoading(false);
        }
    };

    const loadZones = async () => {
        try {
            setLoadingZones(true);
            const res = await apiClient.get('/food/zones/public');
            const list = res.data?.data?.zones || res.data?.zones || (Array.isArray(res.data) ? res.data : []);
            setAvailableZones(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error("Failed to load zones", err);
        } finally {
            setLoadingZones(false);
        }
    };

    const fetchMyShifts = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/food/delivery/shifts/rider/my-shifts');
            if (response.data?.success) {
                setMyShifts(response.data.data || []);
            }
        } catch (error) {
            console.error("Error fetching my booked shifts", error);
            toast.error("Failed to load booked shifts");
        } finally {
            setLoading(false);
        }
    };

    const fetchPayouts = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/food/delivery/shifts/rider/payouts');
            if (response.data?.success) {
                setPayouts(response.data.data || []);
            }
        } catch (error) {
            console.error("Error fetching payouts", error);
            toast.error("Failed to load payouts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'available') fetchShifts();
        if (activeTab === 'my-shifts') fetchMyShifts();
        if (activeTab === 'payouts') fetchPayouts();
    }, [activeTab]);

    const handleBookShift = async (shiftId) => {
        try {
            if (!window.confirm("Are you sure you want to book this shift? You must maintain minimum login hours to get the guarantee.")) return;
            
            const response = await apiClient.post(`/food/delivery/shifts/rider/${shiftId}/book`);
            if (response.data?.success) {
                toast.success("Shift booked successfully!");
                fetchShifts();
            } else {
                toast.error(response.data?.message || "Failed to book shift");
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Error booking shift");
        }
    };

    const handleCancelBooking = async (bookingId) => {
        try {
            if (!window.confirm("Are you sure you want to cancel this shift booking?")) return;
            const response = await apiClient.post(`/food/delivery/shifts/rider/${bookingId}/cancel`);
            if (response.data?.success) {
                toast.success("Shift booking cancelled successfully!");
                fetchMyShifts();
            } else {
                toast.error(response.data?.message || "Failed to cancel shift booking");
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Error cancelling shift booking");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="text-gray-600 p-1">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className="text-lg font-bold text-gray-800">Shift Operations</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => {
                                setShowZoneModal(true);
                                loadZones();
                            }}
                            className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-full text-[11px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-xs"
                            title="Click to switch operating zone"
                        >
                            <span>📍 {selectedZone?.name || selectedZone?.zoneName || riderZone?.zoneName || 'Select Zone'}</span>
                            <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <button 
                            onClick={() => {
                                if (activeTab === 'available') fetchShifts();
                                if (activeTab === 'my-shifts') fetchMyShifts();
                                if (activeTab === 'payouts') fetchPayouts();
                            }}
                            disabled={loading}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-xs transition"
                            title="Refresh Shifts"
                        >
                            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    </div>
                </div>

                {/* Sub tabs */}
                <div className="flex border-b border-gray-100 gap-4 text-xs font-bold pt-1 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('available')}
                        className={`pb-2 border-b-2 transition whitespace-nowrap ${activeTab === 'available' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400'}`}
                    >
                        Available Shifts
                    </button>
                    <button
                        onClick={() => setActiveTab('my-shifts')}
                        className={`pb-2 border-b-2 transition whitespace-nowrap ${activeTab === 'my-shifts' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400'}`}
                    >
                        My Shifts
                    </button>
                    <button
                        onClick={() => setActiveTab('payouts')}
                        className={`pb-2 border-b-2 transition whitespace-nowrap ${activeTab === 'payouts' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400'}`}
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
                                <p className="text-gray-500 text-xs px-6">There are no open shifts in {riderZone?.zoneName || 'your zone'} right now. Check back later!</p>
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
                                                <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium flex items-center gap-1">
                                                    📍 {shift.zoneName || shift.city || 'Active Zone'}
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

                {activeTab === 'my-shifts' && (
                    <>
                        {loading ? (
                            <div className="text-center py-10 text-gray-500 text-xs">Loading booked shifts...</div>
                        ) : myShifts.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-xl border border-gray-100 shadow-sm">
                                <div className="text-4xl mb-3">📅</div>
                                <h3 className="text-gray-800 font-semibold mb-1 text-sm">No Booked Shifts</h3>
                                <p className="text-gray-500 text-xs px-6 mb-4">You haven't booked any shifts yet. Explore available shifts to start earning minimum guarantees!</p>
                                <button 
                                    onClick={() => setActiveTab('available')}
                                    className="px-4 py-2 bg-orange-500 text-white font-bold text-xs rounded-lg shadow-sm hover:bg-orange-600 transition"
                                >
                                    Browse Available Shifts
                                </button>
                            </div>
                        ) : (
                            myShifts.map((booking) => {
                                const shift = booking.shiftId || {};
                                const statusColors = {
                                    BOOKED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                    COMPLETED: 'bg-blue-50 text-blue-700 border-blue-200',
                                    CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
                                    NO_SHOW: 'bg-red-50 text-red-700 border-red-200'
                                };

                                const rules = booking.snapshotRules || {};
                                const guaranteeAmount = rules.guaranteeAmount ?? shift.guaranteeAmount;
                                const minimumOrders = rules.minimumOrders ?? shift.minimumOrders;
                                const minimumLoginPercentage = rules.minimumLoginPercentage ?? shift.minimumLoginPercentage;

                                return (
                                    <div key={booking._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-base font-bold text-gray-800">{shift.name || 'Shift Booking'}</h3>
                                                <div className="text-gray-500 text-xs mt-1 flex items-center gap-1.5">
                                                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {shift.startTime ? new Date(shift.startTime).toLocaleString([], {hour: '2-digit', minute:'2-digit', month: 'short', day: 'numeric'}) : 'N/A'} - {shift.endTime ? new Date(shift.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusColors[booking.status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                                {booking.status === 'BOOKED' ? 'ACTIVE / BOOKED' : booking.status}
                                            </span>
                                        </div>

                                        <div className="flex gap-2 text-xs">
                                            {shift.zoneName && (
                                                <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-[11px] font-medium flex items-center gap-1">
                                                    📍 {shift.zoneName}
                                                </span>
                                            )}
                                            <span className="px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-[11px] font-medium flex items-center gap-1">
                                                📅 Booked: {new Date(booking.bookedAt || booking.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>

                                        {booking.payout ? (
                                            <div className="bg-emerald-50/80 rounded-xl p-3 border border-emerald-200 text-xs space-y-1.5">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-emerald-900 font-black flex items-center gap-1">
                                                        <span>💰</span> Guaranteed Payout
                                                    </span>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                        booking.payout.status === 'PAID' ? 'bg-green-600 text-white' :
                                                        booking.payout.status === 'ON_HOLD' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                                        'bg-blue-100 text-blue-800 border border-blue-200'
                                                    }`}>
                                                        {booking.payout.status === 'PAID' ? '✓ PAID TO BANK' : booking.payout.status}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center pt-1 border-t border-emerald-100">
                                                    <span className="text-emerald-800 text-[11px] font-semibold">Payout Amount</span>
                                                    <span className="text-emerald-700 font-black text-base">₹{booking.payout.amount}</span>
                                                </div>
                                                {booking.payout.referenceNumber && (
                                                    <div className="text-[10px] text-gray-600 bg-white/70 px-2 py-1 rounded font-mono">
                                                        Bank Ref: {booking.payout.referenceNumber}
                                                    </div>
                                                )}
                                            </div>
                                        ) : guaranteeAmount > 0 ? (
                                            <div className="bg-green-50/60 rounded-lg p-3 border border-green-100 text-xs space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-green-800 font-semibold">Minimum Guarantee</span>
                                                    <span className="text-green-600 font-bold text-sm">₹{guaranteeAmount}</span>
                                                </div>
                                                <div className="text-[11px] text-green-700 flex justify-between pt-1 border-t border-green-100/60">
                                                    <span>Min Orders: {minimumOrders}</span>
                                                    <span>Required Online: {minimumLoginPercentage}%</span>
                                                </div>
                                            </div>
                                        ) : null}

                                        {booking.canCancel && (
                                            <button
                                                onClick={() => handleCancelBooking(booking._id)}
                                                className="w-full py-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl font-bold text-xs transition"
                                            >
                                                Cancel Booking
                                            </button>
                                        )}
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

            {/* Zone Switcher Modal */}
            {showZoneModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                                    <span>📍</span> Select Operating Zone
                                </h3>
                                <p className="text-xs text-gray-500">Choose a location to view available shifts</p>
                            </div>
                            <button 
                                onClick={() => setShowZoneModal(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto space-y-2 py-1 flex-1">
                            {/* Default Assigned Zone Option */}
                            {riderZone?.zoneName && (
                                <button
                                    onClick={() => {
                                        setSelectedZone(null);
                                        setShowZoneModal(false);
                                        fetchShifts(riderZone.zoneId);
                                    }}
                                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                                        !selectedZone ? 'bg-orange-50/70 border-orange-300 ring-1 ring-orange-400' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    <div>
                                        <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                                            {riderZone.zoneName}
                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-[10px] rounded-full font-semibold">My Assigned Zone</span>
                                        </div>
                                        <div className="text-[11px] text-gray-500 mt-0.5">Your primary registered shift zone</div>
                                    </div>
                                    {!selectedZone && (
                                        <span className="text-orange-600 font-bold text-sm">✓</span>
                                    )}
                                </button>
                            )}

                            {/* Other Available Zones */}
                            {loadingZones ? (
                                <div className="text-center py-6 text-xs text-gray-400">Loading available zones...</div>
                            ) : availableZones.length === 0 ? (
                                <div className="text-center py-6 text-xs text-gray-400">No other zones found</div>
                            ) : (
                                availableZones
                                    .filter(z => !riderZone?.zoneId || String(z._id) !== String(riderZone.zoneId))
                                    .map((zone) => {
                                        const isSelected = selectedZone?._id === zone._id;
                                        return (
                                            <button
                                                key={zone._id}
                                                onClick={() => {
                                                    setSelectedZone(zone);
                                                    setShowZoneModal(false);
                                                    fetchShifts(zone._id);
                                                }}
                                                className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                                                    isSelected ? 'bg-orange-50/70 border-orange-300 ring-1 ring-orange-400' : 'bg-white border-gray-200 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div>
                                                    <div className="font-bold text-sm text-gray-900">{zone.name || zone.zoneName}</div>
                                                    {zone.serviceLocation && (
                                                        <div className="text-[11px] text-gray-500 mt-0.5">{zone.serviceLocation}</div>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <span className="text-orange-600 font-bold text-sm">✓</span>
                                                )}
                                            </button>
                                        );
                                    })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
