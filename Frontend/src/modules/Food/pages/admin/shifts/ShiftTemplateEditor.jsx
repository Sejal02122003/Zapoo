import React, { useState, useEffect } from 'react';
import apiClient from '@/services/api/axios';
import { Plus, Trash2, AlertTriangle, CheckCircle2, Moon, Clock, ShieldCheck } from 'lucide-react';

export default function ShiftTemplateEditor({ template = null, onSaved, onCancel }) {
    const [name, setName] = useState(template?.name || 'Standard 11AM-11PM Daily Template');
    const [city, setCity] = useState(template?.city || 'All');
    const [slots, setSlots] = useState(template?.slots || [
        { slotOrder: 1, startTime: '11:00', endTime: '13:00', guaranteeAmount: 350, minimumOrders: 6, minimumLoginPercentage: 80, maxPartners: 50, isNightSlot: false },
        { slotOrder: 2, startTime: '13:00', endTime: '15:00', guaranteeAmount: 350, minimumOrders: 6, minimumLoginPercentage: 80, maxPartners: 50, isNightSlot: false },
        { slotOrder: 3, startTime: '15:00', endTime: '18:00', guaranteeAmount: 450, minimumOrders: 8, minimumLoginPercentage: 80, maxPartners: 50, isNightSlot: false },
        { slotOrder: 4, startTime: '18:00', endTime: '21:00', guaranteeAmount: 500, minimumOrders: 10, minimumLoginPercentage: 85, maxPartners: 50, isNightSlot: false },
        { slotOrder: 5, startTime: '21:00', endTime: '23:00', guaranteeAmount: 650, minimumOrders: 7, minimumLoginPercentage: 85, maxPartners: 50, isNightSlot: true }
    ]);
    const [saving, setSaving] = useState(false);
    const [warnings, setWarnings] = useState([]);

    // Check gaps and overlaps whenever slots change
    useEffect(() => {
        analyzeTimeline(slots);
    }, [slots]);

    const analyzeTimeline = (currentSlots) => {
        const newWarnings = [];
        if (currentSlots.length === 0) {
            setWarnings(['Template has no slots configured.']);
            return;
        }

        // Sort slots by start time for analysis
        const sorted = [...currentSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));

        // Check overall 11:00 to 23:00 coverage
        if (sorted[0].startTime > '11:00') {
            newWarnings.push(`Gap detected: Missing coverage between 11:00 AM and ${sorted[0].startTime}`);
        }
        if (sorted[sorted.length - 1].endTime < '23:00') {
            newWarnings.push(`Gap detected: Missing coverage between ${sorted[sorted.length - 1].endTime} and 11:00 PM`);
        }

        for (let i = 0; i < sorted.length - 1; i++) {
            const currentEnd = sorted[i].endTime;
            const nextStart = sorted[i + 1].startTime;

            if (currentEnd < nextStart) {
                newWarnings.push(`Gap detected: ${currentEnd} to ${nextStart} has no shift scheduled.`);
            } else if (currentEnd > nextStart) {
                newWarnings.push(`Overlap detected: Slot ${sorted[i].slotOrder} (${currentEnd}) overlaps with Slot ${sorted[i + 1].slotOrder} (${nextStart}).`);
            }
        }
        setWarnings(newWarnings);
    };

    const handleAddSlot = () => {
        const lastSlot = slots[slots.length - 1];
        let nextStart = lastSlot ? lastSlot.endTime : '11:00';
        let nextEnd = '23:00';

        // Calculate next 2 hour interval
        if (lastSlot) {
            const [h, m] = lastSlot.endTime.split(':').map(Number);
            const endHour = Math.min(23, h + 2);
            nextEnd = `${String(endHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }

        const isNight = nextEnd >= '21:00';
        const newSlot = {
            slotOrder: slots.length + 1,
            startTime: nextStart,
            endTime: nextEnd,
            guaranteeAmount: isNight ? 650 : 400, // Night shift boost recommendation
            minimumOrders: 7,
            minimumLoginPercentage: 80,
            maxPartners: 50,
            isNightSlot: isNight
        };
        setSlots([...slots, newSlot]);
    };

    const handleRemoveSlot = (index) => {
        const updated = slots.filter((_, i) => i !== index).map((slot, i) => ({ ...slot, slotOrder: i + 1 }));
        setSlots(updated);
    };

    const handleSlotChange = (index, field, value) => {
        const updated = [...slots];
        updated[index][field] = value;
        
        // Auto-detect night slot flag if end time is >= 21:00
        if (field === 'endTime') {
            const isNight = value >= '21:00';
            updated[index].isNightSlot = isNight;
            if (isNight && updated[index].guaranteeAmount < 500) {
                updated[index].guaranteeAmount = 650; // Auto nudge night incentive
            }
        }
        setSlots(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            const payload = { name, city, slots };
            let response;
            if (template?._id) {
                response = await apiClient.patch(`/food/admin/shifts/templates/${template._id}`, payload);
            } else {
                response = await apiClient.post('/food/admin/shifts/templates', payload);
            }

            if (response.data?.success) {
                alert('Shift template saved successfully!');
                onSaved?.();
            }
        } catch (error) {
            console.error('Error saving template', error);
            alert(error.response?.data?.message || 'Failed to save shift template');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">
                        {template ? 'Edit Shift Template' : 'Create Daily Time-Slot Template'}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Define repeating 11:00 AM – 11:00 PM shift slots with independent guarantee rules.
                    </p>
                </div>
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-sm">
                    Cancel
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Template Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Standard 11AM-11PM Template"
                            className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">City / Zone</label>
                        <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g. All, Mumbai, Delhi"
                            className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm"
                            required
                        />
                    </div>
                </div>

                {/* Timeline Warnings / Gap Detection */}
                {warnings.length > 0 && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-amber-800">
                            <AlertTriangle className="w-4 h-4 text-amber-600" /> Timeline Validation Warning
                        </div>
                        <ul className="list-disc pl-5 space-y-0.5">
                            {warnings.map((w, idx) => (
                                <li key={idx}>{w}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Slots Configuration */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-500" /> Configured Time Slots ({slots.length})
                        </h3>
                        <button
                            type="button"
                            onClick={handleAddSlot}
                            className="px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg font-semibold text-xs transition flex items-center gap-1"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Time Slot
                        </button>
                    </div>

                    <div className="space-y-3">
                        {slots.map((slot, index) => (
                            <div
                                key={index}
                                className={`p-4 rounded-xl border transition-all ${
                                    slot.isNightSlot
                                        ? 'bg-purple-50/40 border-purple-200'
                                        : 'bg-gray-50/50 border-gray-200'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-gray-900 text-white font-bold text-xs flex items-center justify-center">
                                            {slot.slotOrder}
                                        </span>
                                        <span className="font-semibold text-sm text-gray-900">
                                            Slot {slot.slotOrder} ({slot.startTime} – {slot.endTime})
                                        </span>
                                        {slot.isNightSlot && (
                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 font-bold text-[10px] rounded-full flex items-center gap-1">
                                                <Moon className="w-3 h-3" /> Night Incentive Boost
                                            </span>
                                        )}
                                    </div>
                                    {slots.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSlot(index)}
                                            className="text-red-500 hover:text-red-700 p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
                                    <div>
                                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Start Time</label>
                                        <input
                                            type="time"
                                            value={slot.startTime}
                                            onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                                            className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-gray-500 mb-1">End Time</label>
                                        <input
                                            type="time"
                                            value={slot.endTime}
                                            onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                                            className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Guarantee (₹)</label>
                                        <input
                                            type="number"
                                            value={slot.guaranteeAmount}
                                            onChange={(e) => handleSlotChange(index, 'guaranteeAmount', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-bold text-green-600"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Min Orders</label>
                                        <input
                                            type="number"
                                            value={slot.minimumOrders}
                                            onChange={(e) => handleSlotChange(index, 'minimumOrders', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Min Online %</label>
                                        <input
                                            type="number"
                                            value={slot.minimumLoginPercentage}
                                            onChange={(e) => handleSlotChange(index, 'minimumLoginPercentage', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                                            max="100"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Max Partners</label>
                                        <input
                                            type="number"
                                            value={slot.maxPartners}
                                            onChange={(e) => handleSlotChange(index, 'maxPartners', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 font-medium rounded-xl text-sm transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-sm shadow-sm transition disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Shift Template'}
                    </button>
                </div>
            </form>
        </div>
    );
}
