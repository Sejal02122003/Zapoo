import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
    {
        riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodDeliveryPartner', required: true, index: true },
        shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodShift', required: true, index: true },
        
        // Calculated continuously
        loginTime: { type: Date, default: Date.now },
        logoutTime: { type: Date },
        onlineMinutes: { type: Number, default: 0 },
        offlineMinutes: { type: Number, default: 0 },
        loginPercentage: { type: Number, default: 0 },
        
        lastHeartbeatAt: { type: Date, default: Date.now },
        
        // Populated by anti-fraud checks
        gpsAnomalyFlags: [{
            flagType: { type: String }, // e.g. 'GPS_OFF', 'NO_MOVEMENT'
            timestamp: { type: Date, default: Date.now },
            details: { type: String }
        }]
    },
    { collection: 'food_shift_attendances', timestamps: true }
);

// One attendance record per rider per shift (keeps logic simple)
attendanceSchema.index({ shiftId: 1, riderId: 1 }, { unique: true });

export const FoodShiftAttendance = mongoose.model('FoodShiftAttendance', attendanceSchema);
