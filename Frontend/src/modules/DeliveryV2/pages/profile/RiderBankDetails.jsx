import React, { useState, useEffect } from 'react';
import apiClient from '@/services/api/axios';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Upload, CheckCircle2, ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react';

export default function RiderBankDetails() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        accountHolderName: '',
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        upiId: ''
    });
    const [qrFile, setQrFile] = useState(null);
    const [qrPreview, setQrPreview] = useState('');
    const [errors, setErrors] = useState({});

    const fetchBankDetails = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/food/delivery/profile/bank-details');
            if (response.data?.success && response.data?.data) {
                const b = response.data.data.bankDetails || response.data.data;
                setFormData({
                    accountHolderName: b.accountHolderName || '',
                    accountNumber: b.accountNumber || '',
                    ifscCode: b.ifscCode || '',
                    bankName: b.bankName || '',
                    upiId: b.upiId || ''
                });
                if (b.upiQrCode) {
                    setQrPreview(b.upiQrCode);
                }
            }
        } catch (error) {
            console.error('Error fetching bank details', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBankDetails();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setErrors({ ...errors, [name]: null });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setQrFile(file);
            setQrPreview(URL.createObjectURL(file));
        }
    };

    const validate = () => {
        const newErrors = {};
        const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        const ACC_REGEX = /^\d{9,18}$/;

        if (formData.ifscCode && !IFSC_REGEX.test(formData.ifscCode.trim().toUpperCase())) {
            newErrors.ifscCode = 'Invalid IFSC code (e.g. SBIN0001234)';
        }

        if (formData.accountNumber && !ACC_REGEX.test(formData.accountNumber.trim())) {
            newErrors.accountNumber = 'Account number must be 9 to 18 digits';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setSaving(true);
            const body = new FormData();
            body.append('accountHolderName', (formData.accountHolderName || '').trim());
            body.append('accountNumber', (formData.accountNumber || '').trim());
            body.append('ifscCode', (formData.ifscCode || '').trim().toUpperCase());
            body.append('bankName', (formData.bankName || '').trim());
            body.append('upiId', (formData.upiId || '').trim());

            body.append('documents[bankDetails][accountHolderName]', (formData.accountHolderName || '').trim());
            body.append('documents[bankDetails][accountNumber]', (formData.accountNumber || '').trim());
            body.append('documents[bankDetails][ifscCode]', (formData.ifscCode || '').trim().toUpperCase());
            body.append('documents[bankDetails][bankName]', (formData.bankName || '').trim());
            body.append('documents[bankDetails][upiId]', (formData.upiId || '').trim());

            if (qrFile) {
                body.append('upiQrCode', qrFile);
            }

            const response = await apiClient.patch('/food/delivery/profile/bank-details', body, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data?.success) {
                alert('Bank details updated successfully! Audit log entry recorded.');
                fetchBankDetails();
            }
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to update bank details');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="text-gray-600 p-1">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-bold text-gray-800">Bank & Payout Details</h1>
            </div>

            <div className="p-4 max-w-lg mx-auto space-y-4">
                <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-2xl flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-900 leading-relaxed">
                        Your account number is encrypted securely. Bank details are used by administration to process manual shift completion payouts directly to your bank account or UPI.
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-gray-400 text-xs">Loading bank details...</div>
                ) : (
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Account Holder Name</label>
                            <input
                                type="text"
                                name="accountHolderName"
                                value={formData.accountHolderName}
                                onChange={handleChange}
                                placeholder="As per bank passbook"
                                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Account Number</label>
                            <input
                                type="text"
                                name="accountNumber"
                                value={formData.accountNumber}
                                onChange={handleChange}
                                placeholder="9 to 18 digit account number"
                                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                required
                            />
                            {errors.accountNumber && (
                                <p className="text-[11px] text-red-500 mt-1">{errors.accountNumber}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">IFSC Code</label>
                            <input
                                type="text"
                                name="ifscCode"
                                value={formData.ifscCode}
                                onChange={handleChange}
                                placeholder="e.g. SBIN0001234"
                                className="w-full px-3 py-2 border rounded-xl text-xs uppercase focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                required
                            />
                            {errors.ifscCode && (
                                <p className="text-[11px] text-red-500 mt-1">{errors.ifscCode}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name</label>
                            <input
                                type="text"
                                name="bankName"
                                value={formData.bankName}
                                onChange={handleChange}
                                placeholder="e.g. State Bank of India"
                                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">UPI ID (Optional)</label>
                            <input
                                type="text"
                                name="upiId"
                                value={formData.upiId}
                                onChange={handleChange}
                                placeholder="name@upi"
                                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">UPI QR Code Image (Optional)</label>
                            <div className="flex items-center gap-3">
                                {qrPreview && (
                                    <img src={qrPreview} alt="QR Preview" className="w-16 h-16 object-contain rounded-xl border" />
                                )}
                                <label className="flex-1 px-3 py-2 border border-dashed rounded-xl text-xs text-gray-600 hover:bg-gray-50 cursor-pointer flex items-center justify-center gap-2">
                                    <Upload className="w-4 h-4 text-gray-400" />
                                    <span>{qrFile ? qrFile.name : 'Upload QR Image'}</span>
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-sm transition disabled:opacity-50"
                        >
                            {saving ? 'Saving Details...' : 'Save Bank Details'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
