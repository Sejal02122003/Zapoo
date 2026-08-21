import React, { useState, useEffect } from 'react';
import { adminAPI } from '@food/api';
import { Award, Plus, Pencil, Trash2, Check, X, Loader2, DollarSign, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function WorkingHoursIncentivePage() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ tierName: '', minHours: '', incentiveAmount: '', description: '', isEnabled: true });
    const [saving, setSaving] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newForm, setNewForm] = useState({ tierName: '', minHours: '', incentiveAmount: '', description: '' });

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const res = await adminAPI.getWorkingHoursIncentiveConfigs();
            if (res?.data?.success && res.data.data) {
                setConfigs(res.data.data);
            }
        } catch (err) {
            console.error('Failed to load working hours incentive rules:', err);
            toast.error('Failed to load working hours incentive rules');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const startEditing = (rule) => {
        setEditingId(rule._id);
        setEditForm({
            tierName: rule.tierName,
            minHours: rule.minHours,
            incentiveAmount: rule.incentiveAmount,
            description: rule.description || '',
            isEnabled: rule.isEnabled
        });
    };

    const handleSaveEdit = async (id) => {
        try {
            setSaving(true);
            const res = await adminAPI.updateWorkingHoursIncentiveConfig(id, {
                tierName: editForm.tierName,
                minHours: Number(editForm.minHours),
                incentiveAmount: Number(editForm.incentiveAmount),
                description: editForm.description,
                isEnabled: editForm.isEnabled
            });
            if (res?.data?.success) {
                toast.success('Incentive rule updated successfully!');
                setEditingId(null);
                fetchConfigs();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update incentive rule');
        } finally {
            setSaving(false);
        }
    };

    const handleCreate = async () => {
        if (!newForm.tierName || !newForm.minHours || !newForm.incentiveAmount) {
            return toast.error('Please fill in Tier Name, Min Hours, and Incentive Amount');
        }
        try {
            setSaving(true);
            const res = await adminAPI.createWorkingHoursIncentiveConfig({
                tierName: newForm.tierName,
                minHours: Number(newForm.minHours),
                incentiveAmount: Number(newForm.incentiveAmount),
                description: newForm.description
            });
            if (res?.data?.success) {
                toast.success('New Incentive Tier added successfully!');
                setShowAddModal(false);
                setNewForm({ tierName: '', minHours: '', incentiveAmount: '', description: '' });
                fetchConfigs();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create incentive tier');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this incentive tier rule?')) return;
        try {
            const res = await adminAPI.deleteWorkingHoursIncentiveConfig(id);
            if (res?.data?.success) {
                toast.success('Incentive tier deleted successfully');
                setConfigs((prev) => prev.filter((item) => item._id !== id));
                fetchConfigs();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete incentive tier');
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
                        <Award className="w-7 h-7 text-amber-500" />
                        Working Hours Incentive Rules
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure and edit bonus amounts credited to delivery partners based on order delivery working hours targets.
                    </p>
                </div>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Incentive Tier
                </button>
            </div>

            {/* Content Table / Cards */}
            {loading ? (
                <div className="p-12 bg-white rounded-2xl border border-gray-200 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                </div>
            ) : configs.length === 0 ? (
                <div className="p-12 bg-white rounded-2xl border border-gray-200 text-center space-y-4 shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto text-amber-500">
                        <Award className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-lg text-gray-900">No Incentive Rules Configured</h3>
                        <p className="text-sm text-gray-500 max-w-md mx-auto">
                            There are currently no working hours incentive tiers for delivery partners. Click the button below to add a new tier rule.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl inline-flex items-center gap-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Incentive Tier
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {configs.map((rule) => {
                        const isEditing = editingId === rule._id;
                        return (
                            <div key={rule._id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4 relative">
                                <div className="flex items-center justify-between">
                                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${rule.isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {rule.isEnabled ? 'Active' : 'Disabled'}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {!isEditing ? (
                                            <>
                                                <button onClick={() => startEditing(rule)} className="p-1.5 text-gray-500 hover:text-emerald-600 rounded-lg hover:bg-gray-100">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(rule._id)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => handleSaveEdit(rule._id)} disabled={saving} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {!isEditing ? (
                                    <>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">{rule.tierName}</h3>
                                            <p className="text-xs text-gray-400 mt-0.5">{rule.description || 'Target working hours bonus'}</p>
                                        </div>

                                        <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-xl space-y-2">
                                            <div className="flex items-center justify-between text-xs font-medium text-amber-900">
                                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-600" /> Target Hours:</span>
                                                <span className="font-bold text-amber-950">{rule.minHours} hrs</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs font-medium text-amber-900">
                                                <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Bonus Amount:</span>
                                                <span className="font-black text-emerald-700 text-base">₹{rule.incentiveAmount}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-3 pt-2">
                                        <div>
                                            <label className="text-xs font-bold text-gray-600">Tier Name</label>
                                            <input
                                                type="text"
                                                value={editForm.tierName}
                                                onChange={(e) => setEditForm({ ...editForm, tierName: e.target.value })}
                                                className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs font-bold text-gray-600">Min Hours</label>
                                                <input
                                                    type="number"
                                                    value={editForm.minHours}
                                                    onChange={(e) => setEditForm({ ...editForm, minHours: e.target.value })}
                                                    className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-emerald-700">Bonus (₹)</label>
                                                <input
                                                    type="number"
                                                    value={editForm.incentiveAmount}
                                                    onChange={(e) => setEditForm({ ...editForm, incentiveAmount: e.target.value })}
                                                    className="w-full mt-1 px-3 py-1.5 border border-emerald-300 rounded-lg text-sm font-bold text-emerald-800"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-600">Description</label>
                                            <input
                                                type="text"
                                                value={editForm.description}
                                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                            <input
                                                type="checkbox"
                                                id={`enable-${rule._id}`}
                                                checked={editForm.isEnabled}
                                                onChange={(e) => setEditForm({ ...editForm, isEnabled: e.target.checked })}
                                                className="rounded text-emerald-600"
                                            />
                                            <label htmlFor={`enable-${rule._id}`} className="text-xs font-bold text-gray-700">Enable this Tier Rule</label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="font-bold text-lg text-gray-900">Add New Incentive Tier</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-600">Tier Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Platinum Tier"
                                    value={newForm.tierName}
                                    onChange={(e) => setNewForm({ ...newForm, tierName: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-600">Min Target Hours</label>
                                    <input
                                        type="number"
                                        placeholder="75"
                                        value={newForm.minHours}
                                        onChange={(e) => setNewForm({ ...newForm, minHours: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-emerald-700">Incentive Bonus (₹)</label>
                                    <input
                                        type="number"
                                        placeholder="2000"
                                        value={newForm.incentiveAmount}
                                        onChange={(e) => setNewForm({ ...newForm, incentiveAmount: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 border border-emerald-300 rounded-xl text-sm font-bold text-emerald-800"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600">Description</label>
                                <input
                                    type="text"
                                    placeholder="Complete 75 hours in 7 days"
                                    value={newForm.description}
                                    onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-600 font-bold hover:bg-gray-100 rounded-xl">
                                Cancel
                            </button>
                            <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Incentive Tier'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
