import { z } from 'zod';
import { ValidationError } from '../../../../core/auth/errors.js';

const phoneSchema = z
    .string()
    .min(8, 'Phone must be at least 8 digits')
    .max(15, 'Phone must be at most 15 digits');

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const aadharRegex = /^[0-9]{12}$/;
const drivingLicenseRegex = /^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/;

const deliveryRegisterSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    phone: phoneSchema,
    email: z.string().email().optional().or(z.literal('')),
    countryCode: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    vehicleType: z.string().optional(),
    vehicleName: z.string().optional(),
    vehicleNumber: z.string().optional(),
    drivingLicenseNumber: z
        .string()
        .regex(drivingLicenseRegex, 'Invalid driving license format')
        .optional()
        .or(z.literal('')),
    ref: z.string().trim().max(64).optional().or(z.literal('')),
    panNumber: z
        .string()
        .regex(panRegex, 'Invalid PAN format')
        .optional()
        .or(z.literal('')),
    aadharNumber: z
        .string()
        .regex(aadharRegex, 'Invalid Aadhar format')
        .optional()
        .or(z.literal('')),
    fcmToken: z.string().optional().nullable(),
    platform: z.enum(['web', 'mobile']).optional().default('web')
});

export const validateDeliveryRegisterDto = (body) => {
    const result = deliveryRegisterSchema.safeParse(body);
    if (!result.success) {
        throw new ValidationError(result.error.errors[0].message);
    }
    return result.data;
};

const deliveryProfileUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    countryCode: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    vehicleType: z.string().optional(),
    vehicleName: z.string().optional(),
    vehicleNumber: z.string().optional(),
    drivingLicenseNumber: z
        .string()
        .regex(drivingLicenseRegex, 'Invalid driving license format')
        .optional()
        .or(z.literal('')),
    fcmToken: z.string().optional().nullable(),
    platform: z.enum(['web', 'mobile']).optional().default('web')
});

export const validateDeliveryProfileUpdateDto = (body) => {
    const result = deliveryProfileUpdateSchema.safeParse(body);
    if (!result.success) {
        throw new ValidationError(result.error.errors[0].message);
    }
    return result.data;
};

const bankDetailsSchema = z.object({
    accountHolderName: z.string().optional().or(z.literal('')),
    accountNumber: z.string().optional().or(z.literal('')),
    ifscCode: z.string().optional().or(z.literal('')),
    bankName: z.string().optional().or(z.literal('')),
    upiId: z.string().optional().or(z.literal('')),
    upiQrCode: z.string().optional().or(z.literal(''))
});

const bankDetailsUpdateSchema = z.object({
    accountHolderName: z.string().optional().or(z.literal('')),
    accountNumber: z.string().optional().or(z.literal('')),
    ifscCode: z.string().optional().or(z.literal('')),
    bankName: z.string().optional().or(z.literal('')),
    upiId: z.string().optional().or(z.literal('')),
    upiQrCode: z.string().optional().or(z.literal('')),
    panNumber: z.string().optional().or(z.literal('')),
    documents: z.object({
        bankDetails: bankDetailsSchema.optional(),
        pan: z.object({ number: z.string().optional().or(z.literal('')) }).optional()
    }).optional()
}).passthrough();

export const validateDeliveryBankDetailsDto = (body = {}) => {
    const raw = typeof body === 'object' && body !== null ? body : {};

    // Extract values from flat keys, bracket notation, or nested objects
    const accountHolderName = raw.accountHolderName ?? raw['documents[bankDetails][accountHolderName]'] ?? raw.documents?.bankDetails?.accountHolderName;
    const accountNumber = raw.accountNumber ?? raw['documents[bankDetails][accountNumber]'] ?? raw.documents?.bankDetails?.accountNumber;
    const ifscCode = raw.ifscCode ?? raw['documents[bankDetails][ifscCode]'] ?? raw.documents?.bankDetails?.ifscCode;
    const bankName = raw.bankName ?? raw['documents[bankDetails][bankName]'] ?? raw.documents?.bankDetails?.bankName;
    const upiId = raw.upiId ?? raw['documents[bankDetails][upiId]'] ?? raw.documents?.bankDetails?.upiId;
    const upiQrCode = raw.upiQrCode ?? raw['documents[bankDetails][upiQrCode]'] ?? raw.documents?.bankDetails?.upiQrCode;
    const panNumber = raw.panNumber ?? raw['documents[pan][number]'] ?? raw.documents?.pan?.number;

    const processed = {
        ...(accountHolderName !== undefined ? { accountHolderName: String(accountHolderName) } : {}),
        ...(accountNumber !== undefined ? { accountNumber: String(accountNumber) } : {}),
        ...(ifscCode !== undefined ? { ifscCode: String(ifscCode) } : {}),
        ...(bankName !== undefined ? { bankName: String(bankName) } : {}),
        ...(upiId !== undefined ? { upiId: String(upiId) } : {}),
        ...(upiQrCode !== undefined ? { upiQrCode: String(upiQrCode) } : {}),
        ...(panNumber !== undefined ? { panNumber: String(panNumber) } : {}),
        documents: {
            bankDetails: {
                ...(accountHolderName !== undefined ? { accountHolderName: String(accountHolderName) } : {}),
                ...(accountNumber !== undefined ? { accountNumber: String(accountNumber) } : {}),
                ...(ifscCode !== undefined ? { ifscCode: String(ifscCode) } : {}),
                ...(bankName !== undefined ? { bankName: String(bankName) } : {}),
                ...(upiId !== undefined ? { upiId: String(upiId) } : {}),
                ...(upiQrCode !== undefined ? { upiQrCode: String(upiQrCode) } : {})
            },
            pan: {
                ...(panNumber !== undefined ? { number: String(panNumber) } : {})
            }
        }
    };

    const result = bankDetailsUpdateSchema.safeParse(processed);
    if (!result.success) {
        throw new ValidationError(result.error.errors[0].message);
    }
    return result.data;
};

const deliveryPhoneChangeRequestSchema = z.object({
    newPhone: phoneSchema
});

export const validateDeliveryPhoneChangeRequestDto = (body) => {
    const result = deliveryPhoneChangeRequestSchema.safeParse(body);
    if (!result.success) {
        throw new ValidationError(result.error.errors[0].message);
    }
    return result.data;
};

const deliveryPhoneChangeVerifySchema = z.object({
    newPhone: phoneSchema,
    otp: z.string().min(4, 'OTP must be at least 4 digits').max(8, 'OTP must be at most 8 digits')
});

export const validateDeliveryPhoneChangeVerifyDto = (body) => {
    const result = deliveryPhoneChangeVerifySchema.safeParse(body);
    if (!result.success) {
        throw new ValidationError(result.error.errors[0].message);
    }
    return result.data;
};


