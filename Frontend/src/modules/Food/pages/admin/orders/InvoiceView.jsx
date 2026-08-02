import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const InvoiceView = () => {
    const { id: orderId } = useParams();
    const [invoiceData, setInvoiceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                // Assuming admin uses the same token, but user endpoint is accessible if user is logged in
                const token = localStorage.getItem('token');
                // Check if admin token exists, else user
                const adminToken = localStorage.getItem('adminToken');
                const usedToken = adminToken || token;

                const response = await axios.get(`http://localhost:5000/api/food/orders/${orderId}/invoice`, {
                    headers: {
                        Authorization: `Bearer ${usedToken}`
                    }
                });
                
                if (response.data.success) {
                    setInvoiceData(response.data.data);
                } else {
                    setError('Failed to load invoice');
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Error fetching invoice');
            } finally {
                setLoading(false);
            }
        };

        fetchInvoice();
    }, [orderId]);

    if (loading) return <div className="p-8 text-center">Loading Invoice...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!invoiceData) return null;

    const { restaurantInvoice, platformInvoice } = invoiceData;

    return (
        <div className="bg-gray-100 min-h-screen py-8 print:py-0 print:bg-white font-sans text-sm">
            <div className="max-w-4xl mx-auto mb-4 flex justify-end print:hidden">
                <button 
                    onClick={() => window.print()} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print / Download PDF
                </button>
            </div>

            {/* Restaurant Invoice Page */}
            <div className="max-w-4xl mx-auto bg-white p-12 shadow-lg mb-8 print:shadow-none print:m-0 print:p-8" style={{ pageBreakAfter: 'always' }}>
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900">eternal</h1>
                    </div>
                    <div className="text-center">
                        <h2 className="font-bold text-lg mb-1">Tax Invoice</h2>
                        <p className="font-bold text-md">ORIGINAL FOR RECIPIENT</p>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="font-bold mb-2 text-md">Tax Invoice on behalf of -</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p><span className="font-bold">Legal Entity Name:</span> {restaurantInvoice.legalEntityName}</p>
                            <p><span className="font-bold">Restaurant Name:</span> {restaurantInvoice.restaurantName}</p>
                            <p><span className="font-bold">Restaurant Address:</span> {restaurantInvoice.address}</p>
                            <p><span className="font-bold">Restaurant GSTIN:</span> {restaurantInvoice.gstin}</p>
                            <p><span className="font-bold">Restaurant FSSAI:</span> {restaurantInvoice.fssai}</p>
                            <p><span className="font-bold">Invoice No.:</span> {restaurantInvoice.invoiceNo}</p>
                            <p><span className="font-bold">Invoice Date:</span> {restaurantInvoice.invoiceDate}</p>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <p><span className="font-bold">Customer Name:</span> {restaurantInvoice.customerName}</p>
                    <p><span className="font-bold">Delivery Address:</span> {restaurantInvoice.deliveryAddress}</p>
                    <p><span className="font-bold">State name and Place of Supply:</span> {restaurantInvoice.stateName} ({restaurantInvoice.stateCode})</p>
                </div>

                <div className="mb-6">
                    <p><span className="font-bold">HSN Code:</span> {restaurantInvoice.hsnCode}</p>
                    <p><span className="font-bold">Service Description:</span> {restaurantInvoice.serviceDescription}</p>
                </div>

                <table className="w-full text-left border-collapse border border-gray-400 mb-6 text-sm">
                    <thead>
                        <tr className="bg-gray-50 text-center">
                            <th className="border border-gray-400 p-2 w-1/3">Particulars</th>
                            <th className="border border-gray-400 p-2">Gross value</th>
                            <th className="border border-gray-400 p-2">Discount</th>
                            <th className="border border-gray-400 p-2">Net value</th>
                            <th className="border border-gray-400 p-2">CGST<br/>(Rate)</th>
                            <th className="border border-gray-400 p-2">CGST<br/>(INR)</th>
                            <th className="border border-gray-400 p-2">SGST<br/>(Rate)</th>
                            <th className="border border-gray-400 p-2">SGST<br/>(INR)</th>
                            <th className="border border-gray-400 p-2">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {restaurantInvoice.items.map((item, idx) => (
                            <tr key={idx} className="text-right">
                                <td className="border border-gray-400 p-2 text-left">{item.name}</td>
                                <td className="border border-gray-400 p-2">{item.grossValue.toFixed(2)}</td>
                                <td className="border border-gray-400 p-2">{item.discount.toFixed(3)}</td>
                                <td className="border border-gray-400 p-2">{item.netValue.toFixed(3)}</td>
                                <td className="border border-gray-400 p-2 text-center">{item.cgstRate}</td>
                                <td className="border border-gray-400 p-2">{item.cgstAmount.toFixed(3)}</td>
                                <td className="border border-gray-400 p-2 text-center">{item.sgstRate}</td>
                                <td className="border border-gray-400 p-2">{item.sgstAmount.toFixed(3)}</td>
                                <td className="border border-gray-400 p-2">{item.total.toFixed(2)}</td>
                            </tr>
                        ))}
                        <tr className="font-bold text-right bg-gray-50">
                            <td className="border border-gray-400 p-2 text-left">Item(s) Total</td>
                            <td className="border border-gray-400 p-2">
                                {restaurantInvoice.items.reduce((a,b)=>a+b.grossValue,0).toFixed(2)}
                            </td>
                            <td className="border border-gray-400 p-2">
                                {restaurantInvoice.items.reduce((a,b)=>a+b.discount,0).toFixed(2)}
                            </td>
                            <td className="border border-gray-400 p-2">
                                {restaurantInvoice.items.reduce((a,b)=>a+b.netValue,0).toFixed(2)}
                            </td>
                            <td className="border border-gray-400 p-2 bg-gray-200"></td>
                            <td className="border border-gray-400 p-2">
                                {restaurantInvoice.items.reduce((a,b)=>a+b.cgstAmount,0).toFixed(3)}
                            </td>
                            <td className="border border-gray-400 p-2 bg-gray-200"></td>
                            <td className="border border-gray-400 p-2">
                                {restaurantInvoice.items.reduce((a,b)=>a+b.sgstAmount,0).toFixed(3)}
                            </td>
                            <td className="border border-gray-400 p-2">
                                {restaurantInvoice.items.reduce((a,b)=>a+b.total,0).toFixed(2)}
                            </td>
                        </tr>
                        {restaurantInvoice.packagingCharge.grossValue > 0 && (
                        <tr className="text-right">
                            <td className="border border-gray-400 p-2 text-left">Restaurant Packaging<br/>Charge</td>
                            <td className="border border-gray-400 p-2">{restaurantInvoice.packagingCharge.grossValue.toFixed(2)}</td>
                            <td className="border border-gray-400 p-2">{restaurantInvoice.packagingCharge.discount.toFixed(2)}</td>
                            <td className="border border-gray-400 p-2">{restaurantInvoice.packagingCharge.netValue.toFixed(2)}</td>
                            <td className="border border-gray-400 p-2 text-center">{restaurantInvoice.packagingCharge.cgstRate}</td>
                            <td className="border border-gray-400 p-2">{restaurantInvoice.packagingCharge.cgstAmount.toFixed(2)}</td>
                            <td className="border border-gray-400 p-2 text-center">{restaurantInvoice.packagingCharge.sgstRate}</td>
                            <td className="border border-gray-400 p-2">{restaurantInvoice.packagingCharge.sgstAmount.toFixed(2)}</td>
                            <td className="border border-gray-400 p-2">{restaurantInvoice.packagingCharge.total.toFixed(2)}</td>
                        </tr>
                        )}
                        <tr className="font-bold text-right bg-gray-50">
                            <td className="border border-gray-400 p-2 text-left">Total Value</td>
                            <td className="border border-gray-400 p-2 bg-gray-200"></td>
                            <td className="border border-gray-400 p-2 bg-gray-200"></td>
                            <td className="border border-gray-400 p-2">{(restaurantInvoice.items.reduce((a,b)=>a+b.netValue,0) + restaurantInvoice.packagingCharge.netValue).toFixed(2)}</td>
                            <td className="border border-gray-400 p-2 bg-gray-200"></td>
                            <td className="border border-gray-400 p-2">{(restaurantInvoice.items.reduce((a,b)=>a+b.cgstAmount,0) + restaurantInvoice.packagingCharge.cgstAmount).toFixed(2)}</td>
                            <td className="border border-gray-400 p-2 bg-gray-200"></td>
                            <td className="border border-gray-400 p-2">{(restaurantInvoice.items.reduce((a,b)=>a+b.sgstAmount,0) + restaurantInvoice.packagingCharge.sgstAmount).toFixed(2)}</td>
                            <td className="border border-gray-400 p-2">{restaurantInvoice.finalAmount.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                <div className="mb-4">
                    <p><span className="font-bold">Amount (in words):</span> {restaurantInvoice.amountInWords}</p>
                </div>
                
                <div className="mb-4 text-gray-700">
                    <p>Amount of INR {restaurantInvoice.finalAmount.toFixed(2)} settled digitally against Order ID {restaurantInvoice.orderId} dated {restaurantInvoice.orderDate}.</p>
                    <p>Supply attracts reverse charge : No</p>
                </div>

                <div className="mt-24 flex justify-between items-end">
                    <div className="text-sm font-bold">
                        For {platformInvoice.legalEntityName.toUpperCase()}
                        <div className="mt-2 text-xs font-normal">
                            <p><span className="font-bold">Eternal PAN:</span> {platformInvoice.pan}</p>
                            <p><span className="font-bold">Eternal CIN:</span> {platformInvoice.cin}</p>
                            <p><span className="font-bold">Eternal GST :</span> {platformInvoice.gstin}</p>
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-black w-48 mb-2 h-16 flex items-end justify-center italic text-xl">Sign</div>
                        <p>Authorised Signatory</p>
                    </div>
                </div>
            </div>

            {/* Platform Invoice Page */}
            <div className="max-w-4xl mx-auto bg-white p-12 shadow-lg print:shadow-none print:m-0 print:p-8">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900">eternal</h1>
                    </div>
                    <div className="text-center">
                        <h2 className="font-bold text-lg mb-1">ORIGINAL FOR RECIPIENT</h2>
                    </div>
                </div>

                <h3 className="font-bold text-xl mb-4">Tax Invoice</h3>

                <div className="bg-gray-200 p-2 font-bold border border-black mb-2">
                    {platformInvoice.legalEntityName.toUpperCase()}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div>
                        <p><span className="font-bold">Address:</span> {platformInvoice.address}</p>
                        <p><span className="font-bold">State:</span> West Bengal</p>
                        <p><span className="font-bold">Email ID:</span> support@zapoo.com</p>
                        <p><span className="font-bold">Invoice No:</span> {platformInvoice.invoiceNo}</p>
                    </div>
                    <div>
                        <p><span className="font-bold">PAN:</span> {platformInvoice.pan}</p>
                        <p><span className="font-bold">CIN:</span> {platformInvoice.cin}</p>
                        <p><span className="font-bold">GSTIN:</span> {platformInvoice.gstin}</p>
                        <p><span className="font-bold">Invoice Date:</span> {platformInvoice.invoiceDate}</p>
                    </div>
                </div>

                <div className="bg-gray-200 p-2 font-bold border border-black mb-2">
                    Customer Details
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div>
                        <p><span className="font-bold">Name:</span> {platformInvoice.customerName}</p>
                        <p><span className="font-bold">Delivery Address:</span> {platformInvoice.deliveryAddress}</p>
                    </div>
                    <div>
                        <p><span className="font-bold">GSTIN:</span> UNREGISTERED</p>
                        <p><span className="font-bold">Place of Supply:</span> West Bengal(19)</p>
                    </div>
                </div>

                <div className="bg-gray-200 p-2 font-bold border border-black mb-2">
                    Service Details
                </div>
                
                <div className="flex justify-between mb-4 text-sm">
                    <p><span className="font-bold">HSN Code:</span> {platformInvoice.hsnCode}</p>
                    <p><span className="font-bold">Supply Description:</span> {platformInvoice.supplyDescription}</p>
                </div>

                <table className="w-full text-center border-collapse border border-black mb-6 text-sm">
                    <thead>
                        <tr className="font-bold border border-black">
                            <th className="border border-black p-2 w-16">Sr.No</th>
                            <th className="border border-black p-2 text-left">Particulars</th>
                            <th className="border border-black p-2">Taxable Amount</th>
                            <th className="border border-black p-2">CGST</th>
                            <th className="border border-black p-2">SGST</th>
                            <th className="border border-black p-2">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border border-black">
                            <td className="border border-black p-2">1</td>
                            <td className="border border-black p-2 text-left">Platform / Delivery Fee</td>
                            <td className="border border-black p-2">{platformInvoice.taxableAmount.toFixed(2)}</td>
                            <td className="border border-black p-2">{platformInvoice.cgstAmount.toFixed(2)}</td>
                            <td className="border border-black p-2">{platformInvoice.sgstAmount.toFixed(2)}</td>
                            <td className="border border-black p-2">{platformInvoice.total.toFixed(3)}</td>
                        </tr>
                        <tr className="font-bold border border-black">
                            <td className="border border-black p-2" colSpan={2} style={{textAlign: 'left'}}>Total</td>
                            <td className="border border-black p-2">{platformInvoice.taxableAmount.toFixed(2)}</td>
                            <td className="border border-black p-2">{platformInvoice.cgstAmount.toFixed(2)}</td>
                            <td className="border border-black p-2">{platformInvoice.sgstAmount.toFixed(2)}</td>
                            <td className="border border-black p-2">{platformInvoice.total.toFixed(3)}</td>
                        </tr>
                    </tbody>
                </table>

                <div className="mb-24 text-sm text-gray-700">
                    <p>Amount of ₹{platformInvoice.total.toFixed(3)} settled through digital mode/payment received against Order id ({platformInvoice.orderId}) dated ({platformInvoice.orderDate})</p>
                    <p>Tax is not payable on reverse charge basis</p>
                </div>

                <div className="flex justify-end items-end text-sm">
                    <div className="text-center">
                        <p className="font-bold mb-4">For {platformInvoice.legalEntityName.toUpperCase()}</p>
                        <div className="border-b border-black w-48 mb-2 h-16 mx-auto flex items-end justify-center italic text-xl">Sign</div>
                        <p>Authorized Signatory</p>
                    </div>
                </div>

                <div className="mt-12 text-center text-xs border-t border-gray-400 pt-4 pb-4">
                    <p>Communication Address: Sector V, Salt Lake, Kolkata, West Bengal 700091</p>
                    <p className="mt-2">Please refer to https://www.zapoo.com/conditions for current version of full terms and conditions which are incorporated in this invoice by reference.</p>
                </div>
            </div>
        </div>
    );
};

export default InvoiceView;
