import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Loader2, Save, Upload, ShieldCheck, QrCode } from 'lucide-react';
import apiClient from '@/services/api/axios';
import { toast } from 'sonner';
import useDeliveryBackNavigation from '../../hooks/useDeliveryBackNavigation';

export const ProfileBankV2 = () => {
  const goBack = useDeliveryBackNavigation();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    upiId: ''
  });
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchBankDetails = async () => {
    try {
      const response = await apiClient.get('/food/delivery/profile/bank-details');
      if (response?.data?.success && response?.data?.data) {
        const b = response.data.data.bankDetails || response.data.data;
        setForm({
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
    } catch (e) {
      toast.error('Failed to load bank details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const handleSave = async () => {
    const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    const ACC_REGEX = /^\d{9,18}$/;

    if (form.accountNumber && !ACC_REGEX.test(form.accountNumber.trim())) {
      return toast.error('Account number must be 9 to 18 digits');
    }
    if (form.ifscCode && !IFSC_REGEX.test(form.ifscCode.trim().toUpperCase())) {
      return toast.error('Invalid IFSC Code format (e.g. SBIN0001234)');
    }

    setIsSaving(true);
    try {
      const body = new FormData();
      body.append('accountHolderName', (form.accountHolderName || '').trim());
      body.append('accountNumber', (form.accountNumber || '').trim());
      body.append('ifscCode', (form.ifscCode || '').trim().toUpperCase());
      body.append('bankName', (form.bankName || '').trim());
      body.append('upiId', (form.upiId || '').trim());

      body.append('documents[bankDetails][accountHolderName]', (form.accountHolderName || '').trim());
      body.append('documents[bankDetails][accountNumber]', (form.accountNumber || '').trim());
      body.append('documents[bankDetails][ifscCode]', (form.ifscCode || '').trim().toUpperCase());
      body.append('documents[bankDetails][bankName]', (form.bankName || '').trim());
      body.append('documents[bankDetails][upiId]', (form.upiId || '').trim());

      if (qrFile) {
        body.append('upiQrCode', qrFile);
      }

      const response = await apiClient.patch('/food/delivery/profile/bank-details', body, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response?.data?.success) {
        toast.success('Bank details saved successfully');
        setIsEditing(false);
        setQrFile(null);
        const updated = response.data.data?.bankDetails || response.data.data;
        if (updated) {
          setForm({
            accountHolderName: updated.accountHolderName || form.accountHolderName,
            accountNumber: updated.accountNumber || form.accountNumber,
            ifscCode: updated.ifscCode || form.ifscCode,
            bankName: updated.bankName || form.bankName,
            upiId: updated.upiId || form.upiId
          });
          if (updated.upiQrCode) {
            setQrPreview(updated.upiQrCode);
          }
        } else {
          fetchBankDetails();
        }
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-poppins">
      <div className="bg-white px-4 py-5 flex items-center gap-4 fixed top-0 w-full z-50 shadow-sm">
        <button onClick={goBack}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-black">Bank & UPI Details</h1>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="ml-auto p-2 bg-orange-50 text-orange-600 rounded-xl">
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="pt-24 px-4 pb-10 space-y-6">
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
          <span>Your bank account number is stored with AES-256 encryption. Changes are recorded in security audit logs.</span>
        </div>

        <div className="space-y-4">
          {[
            ['Account Holder', 'accountHolderName', 'As per bank passbook'],
            ['Account Number', 'accountNumber', '9 to 18 digits'],
            ['IFSC Code', 'ifscCode', 'e.g. SBIN0001234'],
            ['Bank Name', 'bankName', 'State Bank of India'],
            ['UPI ID', 'upiId', 'name@upi']
          ].map(([label, key, placeholder]) => (
            <div key={key} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">{label}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={form[key]}
                  placeholder={placeholder}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-950 focus:ring-2 focus:ring-orange-500/20"
                />
              ) : (
                <p className="text-sm font-bold text-gray-950">{form[key] || 'Not provided'}</p>
              )}
            </div>
          ))}

          {/* QR Code Upload */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">UPI QR Code</label>
            {qrPreview && (
              <img src={qrPreview} alt="QR Code" className="w-32 h-32 object-contain rounded-xl border mb-3" />
            )}
            {isEditing && (
              <label className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-dashed rounded-xl cursor-pointer text-xs font-bold text-gray-700 hover:bg-gray-100">
                <Upload className="w-4 h-4 text-orange-500" />
                <span>{qrFile ? qrFile.name : 'Upload New UPI QR Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      setQrFile(e.target.files[0]);
                      setQrPreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {isEditing && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-orange-700 transition"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Bank Details
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileBankV2;
