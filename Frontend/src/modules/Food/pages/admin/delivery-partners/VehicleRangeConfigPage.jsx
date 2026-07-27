import React, { useState, useEffect } from 'react';
import { adminAPI } from '@food/api';
import { toast } from 'sonner';
import { Bike, Navigation, Car, Save, Loader2, RefreshCw } from 'lucide-react';

const VEHICLE_ICONS = {
    BICYCLE: Bike,
    BIKE: Navigation,
    SCOOTER: Navigation,
    CAR: Car
};

export default function VehicleRangeConfigPage() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState({});

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const res = await adminAPI.getVehicleRangeConfigs();
            if (res?.data?.success && Array.isArray(res.data.data)) {
                setConfigs(res.data.data);
            }
        } catch (err) {
            toast.error('Failed to load vehicle range configurations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const handleChange = (index, field, value) => {
        setConfigs((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleSave = async (cfg, index) => {
        try {
            setSaving((prev) => ({ ...prev, [index]: true }));
            const res = await adminAPI.updateVehicleRangeConfig(cfg.vehicleType, {
                maxRangeKm: Number(cfg.maxRangeKm),
                allowFallbackToLargerVehicle: Boolean(cfg.allowFallbackToLargerVehicle),
                description: cfg.description
            });

            if (res?.data?.success) {
                toast.success(`${cfg.vehicleType} range configuration updated successfully`);
                await fetchConfigs();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update vehicle range config');
        } finally {
            setSaving((prev) => ({ ...prev, [index]: false }));
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Vehicle Range & Dispatch Rules</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure max delivery radius per vehicle type and set automatic fallback behavior.
                    </p>
                </div>
                <button
                    onClick={fetchConfigs}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="p-12 bg-white rounded-2xl border border-gray-200 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {configs.map((cfg, idx) => {
                        const IconComponent = VEHICLE_ICONS[cfg.vehicleType] || Navigation;
                        const isSaving = saving[idx];

                        return (
                            <div key={cfg.vehicleType} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                                            <IconComponent className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-base text-gray-900">{cfg.vehicleType}</h3>
                                            <p className="text-xs text-gray-500">Max Delivery Radius</p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full">
                                        {cfg.maxRangeKm} km limit
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Max Range (km)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0.5"
                                            max="100"
                                            value={cfg.maxRangeKm || ''}
                                            onChange={(e) => handleChange(idx, 'maxRangeKm', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                        <input
                                            type="checkbox"
                                            id={`fallback-${cfg.vehicleType}`}
                                            checked={cfg.allowFallbackToLargerVehicle !== false}
                                            onChange={(e) => handleChange(idx, 'allowFallbackToLargerVehicle', e.target.checked)}
                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                        />
                                        <label htmlFor={`fallback-${cfg.vehicleType}`} className="text-xs text-gray-700 font-medium">
                                            Allow fallback to larger vehicles if unavailable
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <button
                                        onClick={() => handleSave(cfg, idx)}
                                        disabled={isSaving}
                                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
