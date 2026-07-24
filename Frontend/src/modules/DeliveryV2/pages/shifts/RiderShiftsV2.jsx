import React, { useState, useEffect } from 'react';
import apiClient from '@/services/api/axios';
import { useNavigate } from 'react-router-dom';

export default function RiderShiftsV2() {
    const navigate = useNavigate();
    const [shifts, setShifts] = useState([]);
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

    useEffect(() => {
        fetchShifts();
    }, []);

    const handleBookShift = async (shiftId) => {
        try {
            // Confirm with rider
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
            <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="text-gray-600 p-1">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-lg font-bold text-gray-800">Available Shifts</h1>
            </div>

            <div className="p-4 space-y-4">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading available shifts...</div>
                ) : shifts.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-4xl mb-3">📭</div>
                        <h3 className="text-gray-800 font-semibold mb-1">No Shifts Available</h3>
                        <p className="text-gray-500 text-sm px-6">There are no open shifts right now. Check back later!</p>
                    </div>
                ) : (
                    shifts.map((shift) => (
                        <div key={shift._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
                            {shift.bonusEnabled && (
                                <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                                    Guarantee Inside
                                </div>
                            )}
                            <div className="p-4 pt-5">
                                <h3 className="text-lg font-bold text-gray-800 mb-1">{shift.name}</h3>
                                <div className="text-gray-500 text-sm mb-3 flex items-center gap-1.5">
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
                                            <span className="text-green-800 text-sm font-semibold">Minimum Guarantee</span>
                                            <span className="text-green-600 font-bold">₹{shift.guaranteeAmount}</span>
                                        </div>
                                        <div className="text-xs text-green-700 flex justify-between">
                                            <span>Min Orders: {shift.minimumOrders}</span>
                                            <span>Required Online: {shift.minimumLoginPercentage}%</span>
                                        </div>
                                    </div>
                                )}

                                <button 
                                    onClick={() => handleBookShift(shift._id)}
                                    disabled={shift.bookedCount >= shift.maxPartners}
                                    className={`w-full py-3 rounded-xl font-bold text-sm transition ${shift.bookedCount >= shift.maxPartners ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'}`}
                                >
                                    {shift.bookedCount >= shift.maxPartners ? 'Shift Full' : 'Book Shift'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
