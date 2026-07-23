import React, { useState, useEffect } from 'react';
import { adminAPI } from '@food/api';
import { toast } from 'sonner';
import { Loader2, TrendingUp, DollarSign, CheckCircle, Download } from 'lucide-react';
import { exportToCSV } from '@food/components/admin/orders/ordersExportUtils';

export default function IncentivesAnalytics() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchData();
  }, [page, dateFrom, dateTo]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getIncentivesReport({ page, limit: 20, dateFrom, dateTo });
      
      if (res?.data?.success) {
        setData(res.data.data);
        setSummary(res.data.summary);
        setTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data.length) return toast.error('No data to export');
    
    const exportData = data.map(inc => ({
      'Order ID': inc.orderId?.order_id || inc.orderId,
      'Rider Name': inc.deliveryPartnerId?.name || 'N/A',
      'Rider Phone': inc.deliveryPartnerId?.phone || 'N/A',
      'Incentive Type': inc.incentiveType,
      'Amount (₹)': inc.amount,
      'Reason': inc.reason,
      'Status': inc.status,
      'Date': new Date(inc.createdAt).toLocaleString()
    }));
    
    exportToCSV(exportData, `Manual_Incentives_Report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manual Assignment Incentives Report</h1>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From Date</label>
          <input 
            type="date" 
            value={dateFrom} 
            onChange={(e) => setDateFrom(e.target.value)}
            className="border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To Date</label>
          <input 
            type="date" 
            value={dateTo} 
            onChange={(e) => setDateTo(e.target.value)}
            className="border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Paid</p>
            <p className="text-2xl font-bold text-gray-800">₹{summary?.totalIncentivesAmount?.toFixed(2) || 0}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Orders</p>
            <p className="text-2xl font-bold text-gray-800">{summary?.totalOrders || 0}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Average Incentive</p>
            <p className="text-2xl font-bold text-gray-800">₹{summary?.averageIncentive?.toFixed(2) || 0}</p>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Rider Name</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item._id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{new Date(item.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{item.orderId?.order_id || 'N/A'}</td>
                    <td className="px-6 py-4">{item.deliveryPartnerId?.name || 'N/A'}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-600">₹{item.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 max-w-[200px] truncate" title={item.reason}>{item.reason || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${item.status === 'CREDITED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No incentives found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t bg-gray-50">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
