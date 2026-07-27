import React from 'react';
import { Bike, Car, Navigation, ShieldCheck } from 'lucide-react';

export const VEHICLE_OPTIONS = [
    { type: 'BICYCLE', label: 'Bicycle', icon: Bike, defaultRange: '3 km max', requiresNumber: false },
    { type: 'BIKE', label: 'Bike', icon: Navigation, defaultRange: '10 km max', requiresNumber: true },
    { type: 'SCOOTER', label: 'Scooter', icon: Navigation, defaultRange: '12 km max', requiresNumber: true },
    { type: 'CAR', label: 'Car', icon: Car, defaultRange: '25 km max', requiresNumber: true }
];

export default function VehicleFields({
    vehicleType = 'BIKE',
    vehicleNumber = '',
    onVehicleTypeChange,
    onVehicleNumberChange,
    errors = {},
    rangeConfigMap = {}
}) {
    const currentType = (vehicleType || 'BIKE').toUpperCase();
    const isBicycle = currentType === 'BICYCLE';

    const handleTypeSelect = (type) => {
        if (onVehicleTypeChange) {
            onVehicleTypeChange(type);
        }
        if (type === 'BICYCLE' && onVehicleNumberChange) {
            onVehicleNumberChange('');
        }
    };

    return (
        <div className="space-y-4">
            {/* Vehicle Type Selection */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vehicle Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {VEHICLE_OPTIONS.map((opt) => {
                        const IconComponent = opt.icon;
                        const isSelected = currentType === opt.type;
                        const customRange = rangeConfigMap[opt.type]?.maxRangeKm;
                        const rangeText = customRange ? `${customRange} km max` : opt.defaultRange;

                        return (
                            <button
                                key={opt.type}
                                type="button"
                                onClick={() => handleTypeSelect(opt.type)}
                                className={`p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                                    isSelected
                                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20'
                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <IconComponent className={`w-5 h-5 ${isSelected ? 'text-emerald-600' : 'text-gray-500'}`} />
                                    {isSelected && <ShieldCheck className="w-4 h-4 text-emerald-600" />}
                                </div>
                                <div>
                                    <p className={`font-semibold text-sm ${isSelected ? 'text-emerald-900' : 'text-gray-800'}`}>
                                        {opt.label}
                                    </p>
                                    <p className="text-[11px] text-gray-500 mt-0.5">{rangeText}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Vehicle Number (Conditional - Hidden for Bicycle) */}
            {!isBicycle && (
                <div className="transition-all duration-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Vehicle Registration Number <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => onVehicleNumberChange && onVehicleNumberChange(e.target.value.toUpperCase())}
                        maxLength={15}
                        placeholder="e.g. MH12AB1234"
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white ${
                            errors.vehicleNumber ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                        }`}
                    />
                    {errors.vehicleNumber ? (
                        <p className="text-red-500 text-xs mt-1">{errors.vehicleNumber}</p>
                    ) : (
                        <p className="text-gray-400 text-xs mt-1">Enter your vehicle registration number</p>
                    )}
                </div>
            )}
        </div>
    );
}
