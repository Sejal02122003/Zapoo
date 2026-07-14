import React, { useState, useEffect } from 'react';
import { adminClient } from '@food/api/axios';
import { toast } from 'sonner';

export default function RestaurantChallenges() {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'Active',
        recurrence: 'ONCE',
        criteriaType: 'TOTAL_ORDERS',
        criteriaTarget: 100,
        rewardType: 'WALLET_CREDIT',
        rewardAmount: 500,
        restaurantFilter: 'ALL'
    });

    useEffect(() => {
        fetchChallenges();
    }, []);

    const fetchChallenges = async () => {
        try {
            const res = await adminClient.get('/food/admin/restaurant-challenges');
            setChallenges(res.data?.data || []);
        } catch (error) {
            toast.error('Failed to fetch challenges');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                status: formData.status,
                recurrence: formData.recurrence,
                criteria: {
                    type: formData.criteriaType,
                    target: Number(formData.criteriaTarget)
                },
                reward: {
                    type: formData.rewardType,
                    amount: Number(formData.rewardAmount)
                },
                restaurantFilter: {
                    type: formData.restaurantFilter
                }
            };
            await adminClient.post('/food/admin/restaurant-challenges', payload);
            toast.success('Challenge created successfully');
            setShowModal(false);
            fetchChallenges();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create challenge');
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await adminClient.patch(`/food/admin/restaurant-challenges/${id}`, { status });
            toast.success('Status updated');
            fetchChallenges();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this challenge?')) return;
        try {
            await adminClient.delete(`/food/admin/restaurant-challenges/${id}`);
            toast.success('Challenge deleted');
            fetchChallenges();
        } catch (err) {
            toast.error('Failed to delete challenge');
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Restaurant Challenges</h1>
                    <p className="text-sm text-gray-500">Manage gamification and rewards for restaurants</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow font-medium"
                >
                    + Create Challenge
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {challenges.map(challenge => (
                        <div key={challenge._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-800">{challenge.title}</h3>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        challenge.status === 'Active' ? 'bg-green-100 text-green-700' :
                                        challenge.status === 'Paused' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                        {challenge.status}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="text-blue-600 font-bold text-lg">₹{challenge.reward?.amount}</div>
                                    <div className="text-xs text-gray-400">Reward</div>
                                </div>
                            </div>

                            <p className="text-gray-600 text-sm mb-4 flex-grow">{challenge.description}</p>
                            
                            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                                <div className="flex justify-between mb-1">
                                    <span className="text-gray-500">Criteria:</span>
                                    <span className="font-medium text-gray-700">{challenge.criteria?.type?.replace(/_/g, ' ')}</span>
                                </div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-gray-500">Target:</span>
                                    <span className="font-medium text-gray-700">{challenge.criteria?.target}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Recurrence:</span>
                                    <span className="font-medium text-gray-700">{challenge.recurrence}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100">
                                {challenge.status === 'Active' ? (
                                    <button onClick={() => handleUpdateStatus(challenge._id, 'Paused')} className="flex-1 py-1.5 text-sm bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100 transition">Pause</button>
                                ) : (
                                    <button onClick={() => handleUpdateStatus(challenge._id, 'Active')} className="flex-1 py-1.5 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 transition">Activate</button>
                                )}
                                <button onClick={() => handleDelete(challenge._id)} className="flex-1 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition">Delete</button>
                            </div>
                        </div>
                    ))}
                    {challenges.length === 0 && (
                        <div className="col-span-full text-center py-20 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
                            No challenges found. Create one to get started!
                        </div>
                    )}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800">Create New Challenge</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Challenge Title</label>
                                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Century Order Milestone" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows="2" placeholder="Describe the challenge..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Criteria Type</label>
                                    <select value={formData.criteriaType} onChange={e => setFormData({...formData, criteriaType: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="TOTAL_ORDERS">Total Orders</option>
                                        <option value="NEW_CUSTOMERS">New Customers</option>
                                        <option value="TOTAL_REVENUE">Total Revenue</option>
                                        <option value="DELIVERY_ORDERS">Delivery Orders</option>
                                        <option value="TAKEAWAY_ORDERS">Takeaway Orders</option>
                                        <option value="VEGAN_ORDERS">Vegan Orders</option>
                                        <option value="CATEGORY_ORDERS">Category Orders</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Count/Amount</label>
                                    <input required type="number" min="1" value={formData.criteriaTarget} onChange={e => setFormData({...formData, criteriaTarget: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reward Type</label>
                                    <select value={formData.rewardType} onChange={e => setFormData({...formData, rewardType: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="WALLET_CREDIT">Wallet Credit (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reward Amount</label>
                                    <input required type="number" min="1" value={formData.rewardAmount} onChange={e => setFormData({...formData, rewardAmount: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
                                    <select value={formData.recurrence} onChange={e => setFormData({...formData, recurrence: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="ONCE">Once</option>
                                        <option value="DAILY">Daily</option>
                                        <option value="WEEKLY">Weekly</option>
                                        <option value="MONTHLY">Monthly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Initial Status</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="Active">Active</option>
                                        <option value="Draft">Draft</option>
                                        <option value="Paused">Paused</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button onClick={handleCreate} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm">Create Challenge</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
