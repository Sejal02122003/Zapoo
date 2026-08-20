import React, { useState, useEffect } from 'react';
import apiClient from '@/services/api/axios';
import ShiftTemplateEditor from './ShiftTemplateEditor';
import PendingPayouts from './PendingPayouts';
import { 
  Calendar, Layers, DollarSign, Plus, RefreshCw, X, 
  User, Phone, CreditCard, QrCode, CheckCircle2, Clock, 
  AlertCircle, ShieldCheck, Copy, ExternalLink, ChevronRight,
  Edit2, Trash2, Check, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

export default function ShiftSlots() {
    const [activeTab, setActiveTab] = useState('templates'); // 'shifts' | 'templates' | 'payouts'
    const [shifts, setShifts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [zones, setZones] = useState([]);
    const [selectedZoneId, setSelectedZoneId] = useState('All');
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    
    // Template editing state
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [showTemplateEditor, setShowTemplateEditor] = useState(false);

    // Shift instance create / edit state
    const [editingShift, setEditingShift] = useState(null); // null when not open, object or { isNew: true }
    const [showShiftEditor, setShowShiftEditor] = useState(false);
    const [savingShift, setSavingShift] = useState(false);

    // Shift form fields
    const [shiftForm, setShiftForm] = useState({
        name: '',
        startTime: '',
        endTime: '',
        guaranteeAmount: 350,
        minimumOrders: 6,
        minimumLoginPercentage: 80,
        maxPartners: 50,
        zoneId: '',
        zoneName: 'All',
        city: 'All',
        isActive: true
    });

    // Shift Card Modal state (Rider details)
    const [selectedShiftId, setSelectedShiftId] = useState(null);
    const [shiftModalData, setShiftModalData] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);

    // Direct Payment Modal state
    const [payTargetRider, setPayTargetRider] = useState(null); // { riderId, name, amount }
    const [utrInput, setUtrInput] = useState('');
    const [payNotesInput, setPayNotesInput] = useState('');
    const [paying, setPaying] = useState(false);

    useEffect(() => {
        const fetchZones = async () => {
            try {
                const res = await apiClient.get('/food/admin/zones');
                const rawData = res.data?.data;
                const zonesList = Array.isArray(rawData) ? rawData : (rawData?.zones || res.data?.zones || []);
                setZones(zonesList);
            } catch (err) {
                console.warn('Could not fetch zones in ShiftSlots', err);
                setZones([]);
            }
        };
        fetchZones();
    }, []);

    const fetchShifts = async () => {
        try {
            setLoading(true);
            const params = selectedZoneId && selectedZoneId !== 'All' ? { zoneId: selectedZoneId } : {};
            const res = await apiClient.get('/food/admin/shifts', { params });
            const list = res.data?.data || res.data?.shifts;
            if (res.data?.success && Array.isArray(list)) {
                setShifts(list);
            } else {
                setShifts([]);
            }
        } catch (error) {
            console.error('Error fetching shifts', error);
            setShifts([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const params = selectedZoneId && selectedZoneId !== 'All' ? { zoneId: selectedZoneId } : {};
            const res = await apiClient.get('/food/admin/shifts/templates', { params });
            const list = res.data?.data || res.data?.templates;
            if (res.data?.success && Array.isArray(list)) {
                setTemplates(list);
            } else {
                setTemplates([]);
            }
        } catch (error) {
            console.error('Error fetching templates', error);
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'shifts') fetchShifts();
        if (activeTab === 'templates') fetchTemplates();
    }, [activeTab, selectedZoneId]);

    const handleGenerateShifts = async () => {
        try {
            setGenerating(true);
            const payload = { targetDate: new Date() };
            if (selectedZoneId && selectedZoneId !== 'All') {
                payload.zoneId = selectedZoneId;
            }
            const res = await apiClient.post('/food/admin/shifts/generate', payload);
            if (res.data?.success) {
                const msg = res.data.message || 'Shifts auto-generated from templates successfully!';
                toast.success(msg);
                setActiveTab('shifts');
                setShowTemplateEditor(false);
                await fetchShifts();
                await fetchTemplates();
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to generate shifts');
        } finally {
            setGenerating(false);
        }
    };

    // Delete Template
    const handleDeleteTemplate = async (templateId, templateName) => {
        if (!window.confirm(`Are you sure you want to delete template "${templateName}"?`)) return;
        try {
            const res = await apiClient.delete(`/food/admin/shifts/templates/${templateId}`);
            if (res.data?.success) {
                toast.success('Template deleted successfully');
                fetchTemplates();
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to delete template');
        }
    };

    // Open Shift Editor (Create or Edit)
    const handleOpenShiftEditor = (shift = null) => {
        if (shift) {
            // Edit existing shift
            const formatForInput = (dateStr) => {
                if (!dateStr) return '';
                const d = new Date(dateStr);
                const pad = (n) => String(n).padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            };

            setEditingShift(shift);
            setShiftForm({
                name: shift.name || '',
                startTime: formatForInput(shift.startTime),
                endTime: formatForInput(shift.endTime),
                guaranteeAmount: shift.guaranteeAmount ?? 350,
                minimumOrders: shift.minimumOrders ?? 6,
                minimumLoginPercentage: shift.minimumLoginPercentage ?? 80,
                maxPartners: shift.maxPartners ?? 50,
                zoneId: shift.zoneId || '',
                zoneName: shift.zoneName || shift.city || 'All',
                city: shift.city || 'All',
                isActive: shift.isActive !== false
            });
        } else {
            // Create new shift
            const now = new Date();
            const start = new Date(now);
            start.setHours(11, 0, 0, 0);
            const end = new Date(now);
            end.setHours(13, 0, 0, 0);

            const formatForInput = (d) => {
                const pad = (n) => String(n).padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            };

            setEditingShift({ isNew: true });
            setShiftForm({
                name: 'Custom Peak Shift Slot',
                startTime: formatForInput(start),
                endTime: formatForInput(end),
                guaranteeAmount: 350,
                minimumOrders: 6,
                minimumLoginPercentage: 80,
                maxPartners: 50,
                zoneId: selectedZoneId && selectedZoneId !== 'All' ? selectedZoneId : '',
                zoneName: selectedZoneId && selectedZoneId !== 'All' ? (zones.find(z => z._id === selectedZoneId)?.name || 'Zone') : 'All',
                city: 'All',
                isActive: true
            });
        }
        setShowShiftEditor(true);
    };

    // Save Shift (Create or Update)
    const handleSaveShift = async (e) => {
        e.preventDefault();
        if (!shiftForm.name.trim()) return toast.error('Shift name is required');
        if (!shiftForm.startTime) return toast.error('Start time is required');
        if (!shiftForm.endTime) return toast.error('End time is required');

        setSavingShift(true);
        try {
            const payload = {
                ...shiftForm,
                guaranteeAmount: Number(shiftForm.guaranteeAmount || 0),
                minimumOrders: Number(shiftForm.minimumOrders || 0),
                minimumLoginPercentage: Number(shiftForm.minimumLoginPercentage || 0),
                maxPartners: Number(shiftForm.maxPartners || 1),
                startTime: new Date(shiftForm.startTime),
                endTime: new Date(shiftForm.endTime)
            };

            if (editingShift?.isNew) {
                const res = await apiClient.post('/food/admin/shifts', payload);
                if (res.data?.success) {
                    toast.success('Shift slot created successfully!');
                    setShowShiftEditor(false);
                    fetchShifts();
                }
            } else {
                const res = await apiClient.patch(`/food/admin/shifts/${editingShift._id}`, payload);
                if (res.data?.success) {
                    toast.success('Shift slot updated successfully!');
                    setShowShiftEditor(false);
                    fetchShifts();
                }
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save shift');
        } finally {
            setSavingShift(false);
        }
    };

    // Delete Shift
    const handleDeleteShift = async (shiftId, shiftName) => {
        if (!window.confirm(`Are you sure you want to delete shift "${shiftName}"? This will also remove any existing rider bookings for this slot.`)) return;
        try {
            const res = await apiClient.delete(`/food/admin/shifts/${shiftId}`);
            if (res.data?.success) {
                toast.success('Shift slot deleted successfully!');
                fetchShifts();
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to delete shift');
        }
    };

    // Open Shift Card Modal & fetch rider data
    const handleOpenShiftModal = async (shiftId) => {
        setSelectedShiftId(shiftId);
        setShiftModalData(null);
        setModalLoading(true);
        try {
            const res = await apiClient.get(`/food/admin/shifts/${shiftId}/riders-detail`);
            if (res.data?.success) {
                setShiftModalData(res.data.data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load shift details');
        } finally {
            setModalLoading(false);
        }
    };

    // Confirm Payment for a Rider in Shift Modal
    const handleConfirmDirectPay = async () => {
        if (!payTargetRider || !selectedShiftId) return;
        if (!utrInput.trim()) {
            return toast.error('Please enter UTR / Transaction reference number');
        }

        setPaying(true);
        try {
            const res = await apiClient.post(`/food/admin/shifts/${selectedShiftId}/riders/${payTargetRider.riderId}/pay`, {
                utrReference: utrInput.trim(),
                notes: payNotesInput.trim(),
                amount: payTargetRider.amount
            });

            if (res.data?.success) {
                toast.success(`Payment of ₹${payTargetRider.amount} recorded for ${payTargetRider.name}`);
                setPayTargetRider(null);
                setUtrInput('');
                setPayNotesInput('');
                // Refresh modal details & shifts list
                handleOpenShiftModal(selectedShiftId);
                fetchShifts();
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Payment processing failed');
        } finally {
            setPaying(false);
        }
    };

    // Helper for shift status
    const getShiftActivityStatus = (startTime, endTime) => {
        const now = new Date();
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (now >= start && now <= end) return { label: 'Active Now', color: 'bg-green-500 text-white animate-pulse' };
        if (now < start) return { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' };
        return { label: 'Shift Ended', color: 'bg-gray-100 text-gray-600' };
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 font-poppins">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Shift Operations & Rider Payouts</h1>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">
                        Create and edit shift templates, manage active shift slots, view working riders & issue instant payouts.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
                        <span className="text-xs font-bold text-gray-500 uppercase">Zone Filter:</span>
                        <select
                            value={selectedZoneId}
                            onChange={(e) => setSelectedZoneId(e.target.value)}
                            className="bg-transparent text-xs font-bold text-gray-900 outline-none cursor-pointer"
                        >
                            <option value="All">All Active Zones</option>
                            {zones.map((z) => (
                                <option key={z._id} value={z._id}>
                                    📍 {z.name || z.zoneName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleGenerateShifts}
                        disabled={generating}
                        className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                        Auto-Generate Shifts
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 gap-6 text-sm font-bold">
                <button
                    onClick={() => { setActiveTab('templates'); setShowTemplateEditor(false); setShowShiftEditor(false); }}
                    className={`pb-3 transition flex items-center gap-2 border-b-2 ${
                        activeTab === 'templates'
                            ? 'border-orange-600 text-orange-600 font-black'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <Layers className="w-4 h-4" /> Shift Templates (11AM–11PM)
                </button>

                <button
                    onClick={() => { setActiveTab('shifts'); setShowTemplateEditor(false); setShowShiftEditor(false); }}
                    className={`pb-3 transition flex items-center gap-2 border-b-2 ${
                        activeTab === 'shifts'
                            ? 'border-orange-600 text-orange-600 font-black'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <Calendar className="w-4 h-4" /> Active Shift Slots ({shifts.length})
                </button>

                <button
                    onClick={() => { setActiveTab('payouts'); setShowTemplateEditor(false); setShowShiftEditor(false); }}
                    className={`pb-3 transition flex items-center gap-2 border-b-2 ${
                        activeTab === 'payouts'
                            ? 'border-orange-600 text-orange-600 font-black'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <DollarSign className="w-4 h-4" /> Pending Bank Payouts
                </button>
            </div>

            {/* Tab 1: Shift Templates */}
            {activeTab === 'templates' && (
                <div>
                    {showTemplateEditor ? (
                        <ShiftTemplateEditor
                            template={editingTemplate}
                            onSaved={() => {
                                setShowTemplateEditor(false);
                                setEditingTemplate(null);
                                fetchTemplates();
                            }}
                            onCancel={() => {
                                setShowTemplateEditor(false);
                                setEditingTemplate(null);
                            }}
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-bold text-gray-800">Configured Shift Templates</h3>
                                <button
                                    onClick={() => { setEditingTemplate(null); setShowTemplateEditor(true); }}
                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" /> Create New Template
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {loading ? (
                                    <div className="p-8 text-center text-gray-400 col-span-2 text-sm">Loading templates...</div>
                                ) : templates.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 border border-dashed rounded-2xl col-span-2 bg-white">
                                        No templates found. Click "Create New Template" to get started!
                                    </div>
                                ) : (
                                    templates.map((tpl) => (
                                        <div key={tpl._id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 hover:shadow-md transition">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-base text-gray-900">{tpl.name}</h4>
                                                    <p className="text-xs text-gray-400">Zone: {tpl.city || 'All'} • {tpl.slots?.length || 0} Time Slots</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => { setEditingTemplate(tpl); setShowTemplateEditor(true); }}
                                                        className="px-3 py-1.5 bg-gray-100 hover:bg-orange-50 hover:text-orange-600 text-gray-700 font-bold rounded-xl text-xs transition flex items-center gap-1"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" /> Edit Slots
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTemplate(tpl._id, tpl.name)}
                                                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs transition"
                                                        title="Delete Template"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {tpl.slots?.map((s, idx) => (
                                                    <div key={idx} className="flex justify-between items-center p-2.5 bg-gray-50/70 rounded-xl text-xs border border-gray-100">
                                                        <div>
                                                            <span className="font-bold text-gray-900">Slot {s.slotOrder}:</span> {s.startTime} - {s.endTime}
                                                            {s.isNightSlot && <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">Night</span>}
                                                        </div>
                                                        <div className="font-bold text-green-600">₹{s.guaranteeAmount} Min</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Shift Operations Cards */}
            {activeTab === 'shifts' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100">
                        <div>
                            <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                Live Shift Slot Instances
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Edit or delete individual slots below, or click any card to view active working riders.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleOpenShiftEditor(null)}
                                className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                            >
                                <Plus className="w-4 h-4" /> Create Single Shift
                            </button>
                            <span className="text-xs font-bold bg-orange-50 text-orange-600 px-3 py-1.5 rounded-xl border border-orange-100">
                                {shifts.length} Active Slots
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-gray-400 text-sm">Loading shift cards...</div>
                    ) : shifts.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 border border-dashed rounded-2xl bg-white space-y-3">
                            <div className="text-3xl">📅</div>
                            <p className="font-medium text-sm text-gray-600">No shift instances found. Create a single shift slot or auto-generate from templates!</p>
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => handleOpenShiftEditor(null)}
                                    className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-orange-700 transition"
                                >
                                    + Create Single Shift
                                </button>
                                <button
                                    onClick={handleGenerateShifts}
                                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
                                >
                                    Auto-Generate Today's Shifts
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {shifts.map((shift) => {
                                const activityStatus = getShiftActivityStatus(shift.startTime, shift.endTime);
                                return (
                                    <div
                                        key={shift._id}
                                        onClick={() => handleOpenShiftModal(shift._id)}
                                        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer relative flex flex-col justify-between space-y-4 group"
                                    >
                                        <div className="space-y-3">
                                            {/* Top badges + Action buttons */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${activityStatus.color}`}>
                                                        {activityStatus.label}
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border">
                                                        📍 {shift.zoneName || shift.city || 'All'}
                                                    </span>
                                                </div>

                                                {/* Edit & Delete Action Buttons */}
                                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleOpenShiftEditor(shift)}
                                                        className="p-1.5 bg-gray-50 hover:bg-orange-100 text-gray-600 hover:text-orange-600 rounded-lg transition"
                                                        title="Edit Shift Details"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteShift(shift._id, shift.name)}
                                                        className="p-1.5 bg-gray-50 hover:bg-red-100 text-gray-600 hover:text-red-600 rounded-lg transition"
                                                        title="Delete Shift Slot"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Shift Title & Time */}
                                            <div>
                                                <h3 className="font-extrabold text-base text-gray-900 group-hover:text-orange-600 transition-colors">
                                                    {shift.name}
                                                </h3>
                                                <div className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-1">
                                                    <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                                    <span>
                                                        {new Date(shift.startTime).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })} - {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Guarantee Rule Box */}
                                            <div className="bg-green-50/70 border border-green-100 p-3 rounded-xl flex items-center justify-between text-xs">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-green-700 block">Guarantee Pay</span>
                                                    <span className="font-extrabold text-sm text-green-900">₹{shift.guaranteeAmount}</span>
                                                </div>
                                                <div className="text-right text-[11px] text-green-800 font-semibold">
                                                    <div>Min {shift.minimumOrders} Orders</div>
                                                    <div>{shift.minimumLoginPercentage}% Login</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Action Footer */}
                                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5 text-gray-700 font-bold">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <span>Booked: {shift.bookedCount || 0} / {shift.maxPartners}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-orange-600 font-black group-hover:translate-x-1 transition-transform">
                                                <span>View Riders & Pay</span>
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 3: Pending Bank Payouts */}
            {activeTab === 'payouts' && <PendingPayouts selectedZoneId={selectedZoneId} />}

            {/* CREATE / EDIT SHIFT INSTANCE MODAL */}
            {showShiftEditor && (
                <div className="fixed inset-0 bg-black/60 z-[1100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl p-6 space-y-5 my-8">
                        <div className="flex justify-between items-center border-b pb-3">
                            <div>
                                <h3 className="font-extrabold text-lg text-gray-900">
                                    {editingShift?.isNew ? 'Create New Shift Slot' : 'Edit Shift Slot'}
                                </h3>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">
                                    Configure shift schedule, minimum guarantee, and quota.
                                </p>
                            </div>
                            <button onClick={() => setShowShiftEditor(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveShift} className="space-y-4">
                            {/* Shift Name */}
                            <div>
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                                    Shift Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={shiftForm.name}
                                    onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                                    placeholder="e.g. Lunch Peak Slot (11:00 AM - 01:00 PM)"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-orange-500/20"
                                />
                            </div>

                            {/* Zone Selector */}
                            <div>
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                                    Operating Zone
                                </label>
                                <select
                                    value={shiftForm.zoneId}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const found = zones.find(z => z._id === val);
                                        setShiftForm({
                                            ...shiftForm,
                                            zoneId: val,
                                            zoneName: found ? (found.name || found.zoneName) : 'All Zones',
                                            city: found ? (found.serviceLocation || found.name) : 'All'
                                        });
                                    }}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900"
                                >
                                    <option value="">All Active Zones (Universal)</option>
                                    {zones.map((z) => (
                                        <option key={z._id} value={z._id}>
                                            📍 {z.name || z.zoneName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Start Time & End Time */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                                        Start Date & Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={shiftForm.startTime}
                                        onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                                        End Date & Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={shiftForm.endTime}
                                        onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-900"
                                    />
                                </div>
                            </div>

                            {/* Guarantee Amount & Max Partners */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                                        Guarantee Pay (₹)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={shiftForm.guaranteeAmount}
                                        onChange={(e) => setShiftForm({ ...shiftForm, guaranteeAmount: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                                        Max Rider Capacity
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={shiftForm.maxPartners}
                                        onChange={(e) => setShiftForm({ ...shiftForm, maxPartners: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-900"
                                    />
                                </div>
                            </div>

                            {/* Min Orders & Required Online % */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                                        Min Orders Required
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={shiftForm.minimumOrders}
                                        onChange={(e) => setShiftForm({ ...shiftForm, minimumOrders: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                                        Required Online %
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={shiftForm.minimumLoginPercentage}
                                        onChange={(e) => setShiftForm({ ...shiftForm, minimumLoginPercentage: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowShiftEditor(false)}
                                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingShift}
                                    className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {savingShift ? 'Saving...' : editingShift?.isNew ? 'Create Shift' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tab 3: Pending Bank Payouts */}
            {activeTab === 'payouts' && <PendingPayouts selectedZoneId={selectedZoneId} />}

            {/* SHIFT RIDERS & BANK DETAILS MODAL */}
            {selectedShiftId && (
                <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="bg-gray-900 text-white p-6 flex items-center justify-between sticky top-0 z-10">
                            <div>
                                <h2 className="text-xl font-black">{shiftModalData?.shift?.name || 'Shift Rider Details'}</h2>
                                <p className="text-xs text-gray-400 font-medium mt-0.5">
                                    Zone: {shiftModalData?.shift?.city || 'All'} • Guarantee: ₹{shiftModalData?.shift?.guaranteeAmount || 0} • Booked Riders: {shiftModalData?.totalBooked || 0}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedShiftId(null)}
                                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50">
                            {modalLoading ? (
                                <div className="py-16 text-center text-gray-400 text-sm">Loading rider details & bank accounts...</div>
                            ) : !shiftModalData || shiftModalData.riders?.length === 0 ? (
                                <div className="py-16 text-center bg-white rounded-2xl border border-dashed text-gray-400">
                                    No delivery partners have booked this shift slot yet.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {shiftModalData.riders.map((rider) => {
                                        const isPaid = rider.payout?.status === 'PAID';
                                        const isShiftActive = rider.shiftActiveStatus === 'ACTIVE';

                                        return (
                                            <div key={rider.riderId} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 space-y-4">
                                                {/* Rider Info Header + 2 Badges */}
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gray-100">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-extrabold text-base text-gray-900">{rider.name}</h3>
                                                            <span className="text-xs text-gray-400 font-medium">({rider.deliveryId || 'Rider'})</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 font-medium">
                                                            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-gray-400" /> {rider.phone}</span>
                                                        </div>
                                                    </div>

                                                    {/* 2 STATUS BADGES (Active Status & Payment Status) */}
                                                    <div className="flex items-center gap-2">
                                                        {/* Slot 1 Badge: Active vs Not Active */}
                                                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                                                            isShiftActive 
                                                                ? 'bg-green-100 text-green-800 border-green-300 animate-pulse'
                                                                : 'bg-gray-100 text-gray-500 border-gray-200'
                                                        }`}>
                                                            {isShiftActive ? '🟢 Active (Online)' : '⚪ Not Active'}
                                                        </span>

                                                        {/* Slot 2 Badge: Pay Pending vs Paid */}
                                                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                                                            isPaid 
                                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                                : 'bg-amber-100 text-amber-900 border-amber-300'
                                                        }`}>
                                                            {isPaid ? '✅ Paid' : '🟡 Pay Pending'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Bank Account Details Box */}
                                                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                                                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                                                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                                                            <CreditCard className="w-4 h-4 text-orange-500" />
                                                            <span>Rider Bank Account & UPI Details</span>
                                                        </div>
                                                        <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                            AES-256 Decrypted
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Account Holder</span>
                                                            <span className="font-extrabold text-gray-900">{rider.bankDetails?.accountHolderName || 'Not provided'}</span>
                                                        </div>

                                                        <div>
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Account Number</span>
                                                            <div className="flex items-center gap-1 font-mono font-extrabold text-gray-900">
                                                                <span>{rider.bankDetails?.accountNumber || 'Not provided'}</span>
                                                                {rider.bankDetails?.accountNumber && (
                                                                    <button
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(rider.bankDetails.accountNumber);
                                                                            toast.success('Account number copied!');
                                                                        }}
                                                                        className="p-1 hover:bg-slate-200 rounded text-gray-500"
                                                                    >
                                                                        <Copy className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">IFSC / Bank</span>
                                                            <span className="font-extrabold text-gray-900">{rider.bankDetails?.ifscCode || 'N/A'} ({rider.bankDetails?.bankName || 'Bank'})</span>
                                                        </div>

                                                        <div>
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">UPI ID</span>
                                                            <span className="font-extrabold text-blue-600">{rider.bankDetails?.upiId || 'Not provided'}</span>
                                                        </div>

                                                        {rider.bankDetails?.upiQrCode && (
                                                            <div>
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">UPI QR Code</span>
                                                                <a
                                                                    href={rider.bankDetails.upiQrCode}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline"
                                                                >
                                                                    <QrCode className="w-4 h-4" /> View QR Image
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Shift Performance Metrics & Action Button */}
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
                                                    <div className="flex items-center gap-4 text-xs font-semibold text-gray-600">
                                                        <span>Orders Completed: <strong className="text-gray-900 font-extrabold">{rider.attendance?.ordersCompleted || 0}</strong></span>
                                                        <span>Login %: <strong className="text-gray-900 font-extrabold">{rider.attendance?.loginPercentage || 0}%</strong></span>
                                                        <span>Guarantee Amount: <strong className="text-green-600 font-black">₹{rider.payout?.amount || shiftModalData.shift?.guaranteeAmount}</strong></span>
                                                    </div>

                                                    {/* Direct Pay Action */}
                                                    {isPaid ? (
                                                        <div className="text-xs text-right text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
                                                            Paid via UTR: <span className="font-mono">{rider.payout?.utr}</span>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setPayTargetRider({
                                                                riderId: rider.riderId,
                                                                name: rider.name,
                                                                amount: rider.payout?.amount || shiftModalData.shift?.guaranteeAmount
                                                            })}
                                                            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition flex items-center gap-2"
                                                        >
                                                            <DollarSign className="w-4 h-4" /> Pay Rider & Mark Paid
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* DIRECT PAYMENT UTR CONFIRMATION MODAL */}
            {payTargetRider && (
                <div className="fixed inset-0 bg-black/70 z-[1100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-extrabold text-lg text-gray-900">Process Bank Payout</h3>
                            <button onClick={() => setPayTargetRider(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                            <span className="text-xs font-bold text-green-700 uppercase tracking-widest block mb-1">Paying Delivery Partner</span>
                            <h4 className="text-xl font-black text-green-950">{payTargetRider.name}</h4>
                            <div className="text-2xl font-black text-green-600 mt-1">₹{payTargetRider.amount}</div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                                    UTR / Transaction Reference No. <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. UTR1234567890"
                                    value={utrInput}
                                    onChange={(e) => setUtrInput(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono font-bold focus:ring-2 focus:ring-green-500/20"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                                    Payment Notes (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Paid via IMPS from SBI Admin Account"
                                    value={payNotesInput}
                                    onChange={(e) => setPayNotesInput(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-green-500/20"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setPayTargetRider(null)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDirectPay}
                                disabled={paying}
                                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                                {paying ? 'Processing...' : 'Confirm & Mark Paid'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
