import mongoose from 'mongoose';

const foodDisbursementSchema = new mongoose.Schema({
    targetType: { 
        type: String, 
        enum: ['delivery_man', 'restaurant'], 
        required: true 
    },
    targetId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        refPath: 'targetTypeModel' 
    },
    targetTypeModel: {
        type: String,
        required: true,
        enum: ['FoodDeliveryPartner', 'FoodRestaurant']
    },
    amount: { 
        type: Number, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'canceled'], 
        default: 'pending' 
    },
    paymentMethod: { 
        type: String, 
        default: 'bank_transfer'
    },
    transactionIds: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'FoodTransaction' 
    }],
    adminNote: {
        type: String,
        default: ''
    }
}, { timestamps: true });

export default mongoose.model('FoodDisbursement', foodDisbursementSchema);
