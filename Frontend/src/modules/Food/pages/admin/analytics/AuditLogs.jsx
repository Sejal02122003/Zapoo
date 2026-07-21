import React, { useState, useEffect } from 'react';
import { adminAPI } from '@food/api';
import { toast } from 'sonner';
import { Download, Loader2, Search } from 'lucide-react';
import dayjs from 'dayjs';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({ action: '', from: '', to: '' });

  useEffect(() => {
    fetchLogs();
  }, [pagination.page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // We will need to add getAuditLogs to adminAPI in index.js
      const res = await adminAPI.getAuditLogs({ page: pagination.page, limit: pagination.limit, ...filters });
      if (res?.data?.success) {
        setLogs(res.data.data.logs);
        setPagination(res.data.data.pagination);
      }
    } catch (error) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    fetchLogs();
  };

  const handleExport = async () => {
    try {
      const res = await adminAPI.exportAuditLogs(filters);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${dayjs().format('YYYY-MM-DD')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Export failed');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <button onClick={handleExport} className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <form onSubmit={handleFilter} className="bg-white p-4 rounded shadow-sm flex flex-wrap gap-4 mb-6">
        <select 
          value={filters.action} 
          onChange={(e) => setFilters({...filters, action: e.target.value})}
          className="border rounded px-3 py-2"
        >
          <option value="">All Actions</option>
          <option value="ASSIGN_RIDER">Assign Rider</option>
          <option value="INCENTIVE_ADDED">Incentive Added</option>
          <option value="INCENTIVE_CANCELLED">Incentive Cancelled</option>
        </select>
        <input 
          type="date" 
          value={filters.from}
          onChange={(e) => setFilters({...filters, from: e.target.value})}
          className="border rounded px-3 py-2"
        />
        <input 
          type="date" 
          value={filters.to}
          onChange={(e) => setFilters({...filters, to: e.target.value})}
          className="border rounded px-3 py-2"
        />
        <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded flex items-center gap-2">
          <Search className="w-4 h-4" /> Filter
        </button>
      </form>

      <div className="bg-white rounded shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Action</th>
                <th className="p-4">Admin</th>
                <th className="p-4">Order / Rider</th>
                <th className="p-4">Bonus (₹)</th>
                <th className="p-4">Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{dayjs(log.createdAt).format('DD MMM YYYY, hh:mm A')}</td>
                  <td className="p-4 font-medium">{log.action.replace('_', ' ')}</td>
                  <td className="p-4">{log.performedBy ? `${log.performedBy.firstName || ''} ${log.performedBy.lastName || ''}` : 'System'}</td>
                  <td className="p-4">
                    <div className="text-xs text-gray-500">Order: {log.orderId || '-'}</div>
                    <div className="text-xs text-gray-500">Rider: {log.riderId?.personalInfo?.firstName || log.riderId?._id || '-'}</div>
                  </td>
                  <td className="p-4 font-bold text-green-600">{log.incentiveAmount ? `₹${log.incentiveAmount}` : '-'}</td>
                  <td className="p-4">{log.reason || '-'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">No logs found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="flex justify-between items-center mt-4">
        <button 
          disabled={pagination.page <= 1} 
          onClick={() => setPagination({...pagination, page: pagination.page - 1})}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">Page {pagination.page} (Total: {pagination.total})</span>
        <button 
          disabled={logs.length < pagination.limit} 
          onClick={() => setPagination({...pagination, page: pagination.page + 1})}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
