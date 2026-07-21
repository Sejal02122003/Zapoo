import React, { useState, useEffect } from 'react';
import { adminAPI } from '@food/api';
import { toast } from 'sonner';
import { Loader2, TrendingUp, DollarSign, CheckCircle, MapPin } from 'lucide-react';

export default function IncentivesAnalytics() {
  const [summary, setSummary] = useState(null);
  const [byCity, setByCity] = useState([]);
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // We will need to add getIncentivesSummary, getIncentivesByCity, getIncentivesImpact to adminAPI
      const [sumRes, cityRes, impactRes] = await Promise.all([
        adminAPI.getIncentivesSummary(),
        adminAPI.getIncentivesByCity(),
        adminAPI.getIncentivesAcceptanceImpact()
      ]);
      
      if (sumRes?.data?.success) setSummary(sumRes.data.data);
      if (cityRes?.data?.success) setByCity(cityRes.data.data);
      if (impactRes?.data?.success) setImpact(impactRes.data.data);
      
    } catch (error) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Incentives Analytics</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Paid</p>
            <p className="text-2xl font-bold text-gray-800">₹{summary?.totalIncentivesPaid || 0}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Avg. Per Order</p>
            <p className="text-2xl font-bold text-gray-800">₹{summary?.avgIncentivePerOrder || 0}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Incentivized Orders</p>
            <p className="text-2xl font-bold text-gray-800">{summary?.incentivizedOrdersCount || 0}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Cancelled / Saved</p>
            <p className="text-2xl font-bold text-gray-800">₹{summary?.totalIncentivesCancelled || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acceptance Impact */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">Acceptance Impact</h2>
          {impact && (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-semibold text-gray-800">With Incentive</p>
                  <p className="text-xs text-gray-500">{impact.withIncentive.accepted} / {impact.withIncentive.offered} accepted</p>
                </div>
                <div className="text-xl font-bold text-green-600">{impact.withIncentive.acceptanceRate}%</div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-semibold text-gray-800">Without Incentive</p>
                  <p className="text-xs text-gray-500">{impact.withoutIncentive.accepted} / {impact.withoutIncentive.offered} accepted</p>
                </div>
                <div className="text-xl font-bold text-gray-600">{impact.withoutIncentive.acceptanceRate}%</div>
              </div>
              
              <div className="mt-4 p-4 bg-primary/10 rounded-lg text-primary text-center">
                <span className="font-bold text-xl">+{impact.upliftPct}%</span>
                <span className="text-sm ml-2">Uplift in acceptance rate</span>
              </div>
            </div>
          )}
        </div>

        {/* By City */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">Incentives By City</h2>
          <div className="space-y-3">
            {byCity.map(city => (
              <div key={city.city} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-semibold text-gray-800">{city.city || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{city.orderCount} orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">₹{city.totalPaid}</p>
                  <p className="text-xs text-gray-500">₹{city.avgIncentive} avg</p>
                </div>
              </div>
            ))}
            {byCity.length === 0 && (
              <p className="text-gray-500 text-center py-4">No city data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
