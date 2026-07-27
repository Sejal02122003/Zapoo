import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, Edit3, Loader2 } from 'lucide-react';
import VehicleFields from './VehicleFields';
import { deliveryAPI } from '@food/api';
import { toast } from 'sonner';

export default function VehicleSettings({ onUpdated }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [needsConfirmation, setNeedsConfirmation] = useState(false);
    const [vehicleType, setVehicleType] = useState('BIKE');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [maxRangeKm, setMaxRangeKm] = useState(10);
    const [rangeConfigs, setRangeConfigs] = useState({});
    const [errors, setErrors] = useState({});

    const fetchVehicleConfig = async () => {
        try {
            setLoading(true);
            const res = await deliveryAPI.getVehicleConfig();
            if (res?.data?.success && res.data.data) {
                const data = res.data.data;
                setVehicleType((data.vehicleType || 'BIKE').toUpperCase());
                setVehicleNumber(data.vehicleNumber || '');
                setNeedsConfirmation(data.needsVehicleConfirmation || false);
                setMaxRangeKm(data.maxRangeKm || 10);
                setRangeConfigs(data.allVehicleRanges || {});

                if (data.needsVehicleConfirmation) {
                    setIsEditing(true);
                }
            }
        } catch (err) {
            console.error('fetchVehicleConfig error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicleConfig();
    }, []);

    const validate = () => {
        const errs = {};
        const isBicycle = vehicleType === 'BICYCLE';
        if (!isBicycle) {
            if (!vehicleNumber.trim()) {
                errs.vehicleNumber = 'Vehicle registration number is required';
            } else if (vehicleNumber.trim().length < 3) {
                errs.vehicleNumber = 'Registration number must be at least 3 characters';
            }
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;

        try {
            setSaving(true);
            const res = await deliveryAPI.updateVehicleType({
                vehicleType,
                vehicleNumber: vehicleType === 'BICYCLE' ? undefined : vehicleNumber.trim()
            });

            if (res?.data?.success) {
                toast.success('Vehicle details updated successfully!');
                setNeedsConfirmation(false);
                setIsEditing(false);
                if (onUpdated) onUpdated(res.data.data);
                await fetchVehicleConfig();
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to update vehicle details';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 bg-white rounded-2xl border border-gray-200 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm">
            {/* Confirmation Alert Banner */}
            {needsConfirmation && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-sm text-amber-900">Vehicle Confirmation Required</h4>
                        <p className="text-xs text-amber-800 mt-0.5">
                            Please confirm your vehicle type and registration number to ensure accurate order delivery distance matching.
                        </p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                    <h3 className="font-bold text-base text-gray-900">Vehicle & Delivery Range</h3>
                    <p className="text-xs text-gray-500">Your vehicle type determines your max delivery radius.</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Vehicle
                    </button>
                )}
            </div>

            {/* Content View / Edit */}
            {isEditing ? (
                <div className="space-y-4">
                    <VehicleFields
                        vehicleType={vehicleType}
                        vehicleNumber={vehicleNumber}
                        onVehicleTypeChange={(type) => {
                            setVehicleType(type);
                            if (errors.vehicleNumber) setErrors({});
                        }}
                        onVehicleNumberChange={(num) => {
                            setVehicleNumber(num);
                            if (errors.vehicleNumber) setErrors({});
                        }}
                        errors={errors}
                        rangeConfigMap={rangeConfigs}
                    />

                    <div className="flex items-center justify-end gap-3 pt-2">
                        {!needsConfirmation && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditing(false);
                                    fetchVehicleConfig();
                                }}
                                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Confirm & Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-[11px] text-gray-400 font-medium">Vehicle Type</p>
                        <p className="font-bold text-sm text-gray-800 mt-0.5">{vehicleType}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-[11px] text-gray-400 font-medium">Registration Number</p>
                        <p className="font-bold text-sm text-gray-800 mt-0.5">
                            {vehicleType === 'BICYCLE' ? 'N/A (Bicycle)' : vehicleNumber || 'Not Set'}
                        </p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl">
                        <p className="text-[11px] text-emerald-600 font-medium">Max Radius</p>
                        <p className="font-bold text-sm text-emerald-900 mt-0.5">{maxRangeKm} km</p>
                    </div>
                </div>
            )}
        </div>
    );
}
