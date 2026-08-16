import React, { useState, useEffect } from 'react';
import { adminClient } from '@food/api/axios';
import { toast } from 'sonner';
import { 
    Trophy, 
    Store, 
    Globe, 
    Plus, 
    Search, 
    Calendar, 
    Target, 
    Gift, 
    X, 
    CheckCircle2, 
    Clock, 
    PauseCircle, 
    PlayCircle, 
    Trash2,
    Building2,
    Users
} from 'lucide-react';

export default function RestaurantChallenges() {
    const [challenges, setChallenges] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'SPECIFIC'
    const [searchQuery, setSearchQuery] = useState('');
    const [restaurantSearch, setRestaurantSearch] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'Active',
        recurrence: 'ONCE',
        criteriaType: 'TOTAL_ORDERS',
        criteriaTarget: 100,
        rewardType: 'WALLET_CREDIT',
        rewardAmount: 500,
        restaurantScope: 'ALL', // 'ALL' | 'SPECIFIC'
        selectedRestaurantId: '',
        selectedRestaurantName: ''
    });

    useEffect(() => {
        fetchChallenges();
        fetchRestaurants();
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

    const fetchRestaurants = async () => {
        try {
            const res = await adminClient.get('/food/admin/restaurants?limit=1000');
            const list = res.data?.data?.restaurants || res.data?.data || [];
            setRestaurants(Array.isArray(list) ? list : []);
        } catch (error) {
            console.error('Failed to fetch restaurants:', error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();

        if (formData.restaurantScope === 'SPECIFIC' && !formData.selectedRestaurantId) {
            toast.error('Please select a specific restaurant');
            return;
        }

        try {
            const selectedRestObj = restaurants.find(
                r => (r._id || r.id) === formData.selectedRestaurantId
            );

            const payload = {
                title: formData.title.trim(),
                description: formData.description.trim(),
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
                restaurantFilter: formData.restaurantScope === 'SPECIFIC'
                    ? {
                        type: 'SPECIFIC',
                        restaurantId: formData.selectedRestaurantId,
                        restaurantName: formData.selectedRestaurantName || selectedRestObj?.restaurantName || 'Specific Restaurant'
                    }
                    : {
                        type: 'ALL'
                    }
            };

            await adminClient.post('/food/admin/restaurant-challenges', payload);
            toast.success('Challenge created successfully');
            setShowModal(false);
            
            // Reset form
            setFormData({
                title: '',
                description: '',
                status: 'Active',
                recurrence: 'ONCE',
                criteriaType: 'TOTAL_ORDERS',
                criteriaTarget: 100,
                rewardType: 'WALLET_CREDIT',
                rewardAmount: 500,
                restaurantScope: 'ALL',
                selectedRestaurantId: '',
                selectedRestaurantName: ''
            });
            setRestaurantSearch('');
            fetchChallenges();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create challenge');
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await adminClient.patch(`/food/admin/restaurant-challenges/${id}`, { status });
            toast.success(`Challenge ${status.toLowerCase()}`);
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

    const filteredRestaurantsForModal = restaurants.filter(r => 
        (r.restaurantName || '').toLowerCase().includes(restaurantSearch.toLowerCase()) ||
        (r.address || r.city || '').toLowerCase().includes(restaurantSearch.toLowerCase())
    );

    const filteredChallenges = challenges.filter(c => {
        const matchesSearch = (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.restaurantFilter?.restaurantName || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        if (!matchesSearch) return false;

        if (activeTab === 'SPECIFIC') {
            return c.restaurantFilter?.type === 'SPECIFIC';
        } else if (activeTab === 'GLOBAL') {
            return !c.restaurantFilter || c.restaurantFilter.type === 'ALL';
        }
        return true;
    });

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Trophy className="w-7 h-7 text-amber-500" />
                        Restaurant Challenges
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Gamify restaurant milestones and reward top performing partners (Global or Individual)
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-sm hover:shadow font-medium text-sm transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Create Challenge
                </button>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('ALL')}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            activeTab === 'ALL'
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        All Challenges ({challenges.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('GLOBAL')}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                            activeTab === 'GLOBAL'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <Globe className="w-3.5 h-3.5" />
                        Global ({challenges.filter(c => !c.restaurantFilter || c.restaurantFilter.type === 'ALL').length})
                    </button>
                    <button
                        onClick={() => setActiveTab('SPECIFIC')}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                            activeTab === 'SPECIFIC'
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <Store className="w-3.5 h-3.5" />
                        Specific Restaurant ({challenges.filter(c => c.restaurantFilter?.type === 'SPECIFIC').length})
                    </button>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search challenges..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Challenges Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredChallenges.map(challenge => {
                        const isSpecific = challenge.restaurantFilter?.type === 'SPECIFIC';
                        const restaurantName = challenge.restaurantFilter?.restaurantName || 'Specific Restaurant';

                        return (
                            <div 
                                key={challenge._id} 
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-all p-5 flex flex-col justify-between"
                            >
                                <div>
                                    {/* Header & Badges */}
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="space-y-1.5">
                                            {isSpecific ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                                    <Store className="w-3 h-3" />
                                                    {restaurantName}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                                    <Globe className="w-3 h-3" />
                                                    All Restaurants
                                                </span>
                                            )}
                                            <h3 className="font-bold text-base text-slate-900 leading-snug">
                                                {challenge.title}
                                            </h3>
                                        </div>

                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                            challenge.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                            challenge.status === 'Paused' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                            'bg-slate-100 text-slate-700 border border-slate-200'
                                        }`}>
                                            {challenge.status}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    {challenge.description && (
                                        <p className="text-xs text-slate-600 mb-4 line-clamp-2">
                                            {challenge.description}
                                        </p>
                                    )}

                                    {/* Challenge Metrics Snapshot */}
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2.5 text-xs mb-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 flex items-center gap-1.5">
                                                <Target className="w-3.5 h-3.5 text-slate-400" />
                                                Target:
                                            </span>
                                            <span className="font-semibold text-slate-800">
                                                {challenge.criteria?.target} {challenge.criteria?.type?.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 flex items-center gap-1.5">
                                                <Gift className="w-3.5 h-3.5 text-slate-400" />
                                                Wallet Reward:
                                            </span>
                                            <span className="font-bold text-emerald-600 text-sm">
                                                ₹{challenge.reward?.amount || 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                                            <span className="text-slate-500 flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                Frequency:
                                            </span>
                                            <span className="font-medium text-slate-700 uppercase tracking-wide text-[10px]">
                                                {challenge.recurrence || 'ONCE'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                                    {challenge.status === 'Active' ? (
                                        <button 
                                            onClick={() => handleUpdateStatus(challenge._id, 'Paused')} 
                                            className="flex-1 py-2 text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition flex items-center justify-center gap-1.5"
                                        >
                                            <PauseCircle className="w-3.5 h-3.5" />
                                            Pause
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleUpdateStatus(challenge._id, 'Active')} 
                                            className="flex-1 py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition flex items-center justify-center gap-1.5"
                                        >
                                            <PlayCircle className="w-3.5 h-3.5" />
                                            Activate
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleDelete(challenge._id)} 
                                        className="py-2 px-3 text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition flex items-center justify-center gap-1"
                                        title="Delete Challenge"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {filteredChallenges.length === 0 && (
                        <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-200">
                            <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-base font-semibold text-slate-800 mb-1">No challenges found</h3>
                            <p className="text-xs text-slate-500 mb-4">Create your first challenge to incentivize restaurant orders.</p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Create Challenge Now
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Create Challenge Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Trophy className="w-4 h-4" />
                                </div>
                                <h2 className="text-base font-bold text-slate-900">Create Restaurant Challenge</h2>
                            </div>
                            <button 
                                onClick={() => setShowModal(false)} 
                                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* Target Scope Selection */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-2">
                                    Applies To (Target Scope)
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, restaurantScope: 'ALL', selectedRestaurantId: '', selectedRestaurantName: '' })}
                                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                                            formData.restaurantScope === 'ALL'
                                                ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <Globe className={`w-4 h-4 mt-0.5 ${formData.restaurantScope === 'ALL' ? 'text-blue-600' : 'text-slate-400'}`} />
                                        <div>
                                            <div className={`text-xs font-bold ${formData.restaurantScope === 'ALL' ? 'text-blue-900' : 'text-slate-800'}`}>
                                                All Restaurants
                                            </div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                Available for all active outlets
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, restaurantScope: 'SPECIFIC' })}
                                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                                            formData.restaurantScope === 'SPECIFIC'
                                                ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500/20'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <Store className={`w-4 h-4 mt-0.5 ${formData.restaurantScope === 'SPECIFIC' ? 'text-purple-600' : 'text-slate-400'}`} />
                                        <div>
                                            <div className={`text-xs font-bold ${formData.restaurantScope === 'SPECIFIC' ? 'text-purple-900' : 'text-slate-800'}`}>
                                                Specific Restaurant
                                            </div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                Target an individual outlet
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Specific Restaurant Selector (Conditional) */}
                            {formData.restaurantScope === 'SPECIFIC' && (
                                <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2">
                                    <label className="block text-xs font-bold text-purple-950">
                                        Select Restaurant <span className="text-rose-500">*</span>
                                    </label>
                                    
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={restaurantSearch}
                                            onChange={(e) => setRestaurantSearch(e.target.value)}
                                            placeholder="Search by restaurant name..."
                                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-purple-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>

                                    <select
                                        required
                                        value={formData.selectedRestaurantId}
                                        onChange={(e) => {
                                            const rId = e.target.value;
                                            const rObj = restaurants.find(r => (r._id || r.id) === rId);
                                            setFormData({
                                                ...formData,
                                                selectedRestaurantId: rId,
                                                selectedRestaurantName: rObj?.restaurantName || ''
                                            });
                                        }}
                                        className="w-full border border-purple-200 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                                    >
                                        <option value="">-- Choose Restaurant ({filteredRestaurantsForModal.length} available) --</option>
                                        {filteredRestaurantsForModal.map(r => (
                                            <option key={r._id || r.id} value={r._id || r.id}>
                                                {r.restaurantName} ({r.city || r.zoneName || 'Outlet'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Challenge Title */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Challenge Title <span className="text-rose-500">*</span>
                                </label>
                                <input 
                                    required 
                                    type="text" 
                                    value={formData.title} 
                                    onChange={e => setFormData({...formData, title: e.target.value})} 
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none" 
                                    placeholder="e.g., Century Order Milestone" 
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                                <textarea 
                                    value={formData.description} 
                                    onChange={e => setFormData({...formData, description: e.target.value})} 
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none" 
                                    rows="2" 
                                    placeholder="Describe milestones, rules or rewards..." 
                                />
                            </div>

                            {/* Criteria and Target */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Criteria Type</label>
                                    <select 
                                        value={formData.criteriaType} 
                                        onChange={e => setFormData({...formData, criteriaType: e.target.value})} 
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="TOTAL_ORDERS">Total Orders</option>
                                        <option value="NEW_CUSTOMERS">New Customers</option>
                                        <option value="TOTAL_REVENUE">Total Revenue (₹)</option>
                                        <option value="DELIVERY_ORDERS">Delivery Orders</option>
                                        <option value="TAKEAWAY_ORDERS">Takeaway Orders</option>
                                        <option value="VEGAN_ORDERS">Vegan Orders</option>
                                        <option value="CATEGORY_ORDERS">Category Orders</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Target Goal <span className="text-rose-500">*</span>
                                    </label>
                                    <input 
                                        required 
                                        type="number" 
                                        min="1" 
                                        value={formData.criteriaTarget} 
                                        onChange={e => setFormData({...formData, criteriaTarget: e.target.value})} 
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none" 
                                    />
                                </div>
                            </div>

                            {/* Reward */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reward Type</label>
                                    <select 
                                        value={formData.rewardType} 
                                        onChange={e => setFormData({...formData, rewardType: e.target.value})} 
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="WALLET_CREDIT">Wallet Credit (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Reward Amount (₹) <span className="text-rose-500">*</span>
                                    </label>
                                    <input 
                                        required 
                                        type="number" 
                                        min="1" 
                                        value={formData.rewardAmount} 
                                        onChange={e => setFormData({...formData, rewardAmount: e.target.value})} 
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none" 
                                    />
                                </div>
                            </div>

                            {/* Recurrence and Status */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Recurrence</label>
                                    <select 
                                        value={formData.recurrence} 
                                        onChange={e => setFormData({...formData, recurrence: e.target.value})} 
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="ONCE">Once</option>
                                        <option value="DAILY">Daily</option>
                                        <option value="WEEKLY">Weekly</option>
                                        <option value="MONTHLY">Monthly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Status</label>
                                    <select 
                                        value={formData.status} 
                                        onChange={e => setFormData({...formData, status: e.target.value})} 
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Draft">Draft</option>
                                        <option value="Paused">Paused</option>
                                    </select>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                                <button 
                                    type="button"
                                    onClick={() => setShowModal(false)} 
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
                                >
                                    Create Challenge
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
