import React, { useState, useEffect } from 'react';
import apiClient from '@/services/api/axios';

export default function ShiftSlots() {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        startTime: '',
        endTime: '',
        city: 'All',
        maxPartners: 50,
        bonusEnabled: true,
        guaranteeAmount: 500,
        minimumOrders: 10,
        minimumLoginPercentage: 80
    });

    const fetchShifts = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/food/admin/shifts');
            if (response.data?.success) {
                setShifts(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching shifts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShifts();
    }, []);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Need to convert date strings to actual Date objects or ISO strings depending on backend
            // For now just pass them as strings assuming backend handles it
            const payload = { ...formData };
            if (!payload.name || !payload.startTime || !payload.endTime) {
                alert("Please fill required fields");
                return;
            }
            
            const response = await apiClient.post('/food/admin/shifts', payload);
            if (response.data?.success) {
                alert("Shift created successfully!");
                setShowModal(false);
                fetchShifts();
            } else {
                alert("Failed to create shift");
            }
        } catch (error) {
            console.error(error);
            alert("Error creating shift: " + error.response?.data?.message || error.message);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-800">Shift Management</h1>
                    <p className="text-sm text-neutral-500">Configure time slots and guarantee rules</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium shadow-sm transition"
                >
                    + Create Shift
                </button>
            </div>
            
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-semibold text-gray-800">Create New Shift</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                                ✕
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700">Shift Name</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Morning Rush" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" required />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700">Start Time</label>
                                    <input type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700">End Time</label>
                                    <input type="datetime-local" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" required />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700">City/Zone</label>
                                    <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700">Max Partners</label>
                                    <input type="number" name="maxPartners" value={formData.maxPartners} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" required />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    Guaranteed Earnings Rules
                                </h3>
                                
                                <label className="flex items-center gap-2 mb-4 p-3 bg-orange-50/50 rounded-lg border border-orange-100 cursor-pointer">
                                    <input type="checkbox" name="bonusEnabled" checked={formData.bonusEnabled} onChange={handleChange} className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500" />
                                    <span className="text-sm font-medium text-orange-900">Enable Minimum Guarantee</span>
                                </label>
                                
                                {formData.bonusEnabled && (
                                    <div className="space-y-4 pl-1">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="block text-sm font-medium text-gray-700">Guarantee Amount (₹)</label>
                                                <input type="number" name="guaranteeAmount" value={formData.guaranteeAmount} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-sm font-medium text-gray-700">Min. Orders Needed</label>
                                                <input type="number" name="minimumOrders" value={formData.minimumOrders} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-gray-700">Required Online Time (%)</label>
                                            <input type="number" name="minimumLoginPercentage" value={formData.minimumLoginPercentage} onChange={handleChange} max="100" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
                                            <p className="text-xs text-gray-500">Riders must stay online for this percentage of the shift.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition">
                                    Cancel
                                </button>
                                <button type="submit" className="px-5 py-2 bg-neutral-900 text-white font-medium rounded-lg hover:bg-black shadow-sm transition">
                                    Create Shift
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-neutral-400">Loading shifts...</div>
                ) : shifts.length === 0 ? (
                    <div className="p-12 text-center text-neutral-400">
                        <div className="mb-2 text-3xl">📅</div>
                        No shifts configured yet.
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/80 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Shift Name</th>
                                <th className="px-6 py-4">Timing</th>
                                <th className="px-6 py-4">Zone</th>
                                <th className="px-6 py-4">Guarantee Rules</th>
                                <th className="px-6 py-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {shifts.map((shift, i) => (
                                <tr key={shift._id || i} className="hover:bg-gray-50/50 transition">
                                    <td className="px-6 py-4 font-medium text-gray-900">{shift.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <div>{new Date(shift.startTime).toLocaleString()}</div>
                                        <div className="text-gray-400">to {new Date(shift.endTime).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{shift.city}</td>
                                    <td className="px-6 py-4">
                                        {shift.bonusEnabled ? (
                                            <div className="text-sm">
                                                <div className="font-semibold text-green-600">₹{shift.guaranteeAmount} Min.</div>
                                                <div className="text-gray-500 text-xs mt-0.5">{shift.minimumOrders} ord. | {shift.minimumLoginPercentage}% online</div>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">Disabled</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${shift.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                                            {shift.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
