import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const CustomerReceiptView = () => {
    const { id: orderId } = useParams();
    const [receiptData, setReceiptData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchReceipt = async () => {
            try {
                const token = localStorage.getItem('token');
                const adminToken = localStorage.getItem('adminToken');
                const usedToken = adminToken || token;

                const response = await axios.get(`http://localhost:5000/api/food/orders/${orderId}/invoice`, {
                    headers: {
                        Authorization: `Bearer ${usedToken}`
                    }
                });
                
                if (response.data.success) {
                    setReceiptData(response.data.data.customerReceipt);
                } else {
                    setError('Failed to load receipt');
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Error fetching receipt');
            } finally {
                setLoading(false);
            }
        };

        fetchReceipt();
    }, [orderId]);

    if (loading) return <div className="p-8 text-center">Loading Receipt...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!receiptData) return null;

    return (
        <div className="bg-gray-100 min-h-screen py-8 print:py-0 print:bg-white font-sans text-sm text-gray-800">
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

            <div className="max-w-4xl mx-auto bg-white p-12 shadow-lg print:shadow-none print:m-0 print:p-8">
                <h1 className="text-2xl font-bold mb-8">Zapoo Food Order: Summary and Receipt</h1>

                <div className="grid grid-cols-[1fr_2fr] gap-y-3 mb-8">
                    <div className="font-bold">Order ID:</div>
                    <div>{receiptData.orderId}</div>
                    
                    <div className="font-bold">Order Time:</div>
                    <div>{receiptData.orderTime}</div>
                    
                    <div className="font-bold">Customer Name:</div>
                    <div>{receiptData.customerName}</div>
                    
                    <div className="font-bold">Delivery Address:</div>
                    <div>{receiptData.deliveryAddress}</div>
                    
                    <div className="font-bold">Restaurant Name:</div>
                    <div>{receiptData.restaurantName}</div>
                    
                    <div className="font-bold">Restaurant Address:</div>
                    <div>{receiptData.restaurantAddress}</div>
                    
                    <div className="font-bold">Delivery partner's Name:</div>
                    <div>{receiptData.deliveryPartnerName}</div>
                </div>

                <table className="w-full text-left border-collapse mb-8">
                    <thead>
                        <tr className="bg-gray-300 text-white">
                            <th className="p-2 w-1/2 font-bold text-gray-700">Item</th>
                            <th className="p-2 text-center font-bold text-gray-700">Quantity</th>
                            <th className="p-2 text-right font-bold text-gray-700">Unit Price</th>
                            <th className="p-2 text-right font-bold text-gray-700">Total Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {receiptData.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-200">
                                <td className="p-2">{item.name}</td>
                                <td className="p-2 text-center">{item.quantity}</td>
                                <td className="p-2 text-right">₹{item.unitPrice.toFixed(2)}</td>
                                <td className="p-2 text-right">₹{item.totalPrice.toFixed(2)}</td>
                            </tr>
                        ))}
                        
                        <tr>
                            <td colSpan="3" className="p-2 text-right font-bold pt-4">Taxes</td>
                            <td className="p-2 text-right pt-4">₹{receiptData.taxes.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td colSpan="3" className="p-2 text-right font-bold">Delivery charge subtotal</td>
                            <td className="p-2 text-right">₹{receiptData.deliveryChargeSubtotal.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td colSpan="3" className="p-2 text-right font-bold">Restaurant Packaging Charges</td>
                            <td className="p-2 text-right">₹{receiptData.restaurantPackagingCharges.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td colSpan="3" className="p-2 text-right font-bold">Platform fee</td>
                            <td className="p-2 text-right">₹{receiptData.platformFee.toFixed(2)}</td>
                        </tr>
                        {receiptData.restaurantPromo > 0 && (
                            <tr>
                                <td colSpan="3" className="p-2 text-right font-bold">Restaurant Promo</td>
                                <td className="p-2 text-right">(₹{receiptData.restaurantPromo.toFixed(2)})</td>
                            </tr>
                        )}
                        {receiptData.platformPromo > 0 && (
                            <tr>
                                <td colSpan="3" className="p-2 text-right font-bold">Platform Promo</td>
                                <td className="p-2 text-right">(₹{receiptData.platformPromo.toFixed(2)})</td>
                            </tr>
                        )}
                        
                        <tr className="bg-gray-200">
                            <td colSpan="3" className="p-2 text-right font-bold text-lg">Total</td>
                            <td className="p-2 text-right font-bold text-lg">₹{receiptData.total.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                <div className="text-xs text-gray-600 mb-12">
                    <p className="font-bold mb-2 text-sm text-black">Terms & Conditions (<a href="https://www.zapoo.com/policies/terms-of-service" className="text-blue-600 underline">https://www.zapoo.com/policies/terms-of-service</a>) :</p>
                    <ol className="list-decimal pl-4 space-y-1">
                        <li>W.e.f. 1 January 2022, for items ordered where Zapoo is obligated to raise a tax invoice on behalf of the Restaurant, it can be downloaded from the link provided in email containing order summary.</li>
                        <li>The delivery charges (including surge, etc) are collected by Zapoo on behalf of the person or entity undertaking delivery of this order.</li>
                        <li>If you have any issues or queries in respect of your order, please contact the customer chat support through Zapoo platform.</li>
                        <li>In case you need to get more information about restaurant's FSSAI status, please visit https://foscos.fssai.gov.in/</li>
                        <li>Please note that we do not have a customer care phone number and we never ask for any bank account details such as CVV, account number, UPI Pin etc. across our other support channels.</li>
                        <li>For food safety complaints and grievances, click here to access the Food Safety Connect App of FSSAI - iOS: <a href="#" className="text-blue-600 underline">Food Safety Connect App</a>, Android: <a href="#" className="text-blue-600 underline">Food Safety Connect App</a>.</li>
                    </ol>
                </div>

                <div className="flex justify-between items-end border-t border-gray-300 pt-8 text-gray-400 font-serif">
                    <div>
                        <h2 className="text-2xl mb-1">{receiptData.restaurantName}</h2>
                        <div className="italic text-lg mb-1">fssai</div>
                        <div className="text-xs">Lic. No. {receiptData.restaurantFssai}</div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold tracking-tight mb-1 text-gray-400" style={{fontFamily: 'sans-serif'}}>zapoo</h2>
                        <div className="italic text-lg mb-1">fssai</div>
                        <div className="text-xs">Lic. No. {receiptData.platformFssai}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerReceiptView;
