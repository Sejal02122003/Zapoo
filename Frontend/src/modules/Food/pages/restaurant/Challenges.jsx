import React, { useState, useEffect } from 'react';
import { restaurantClient } from '@food/api/axios';
import { toast } from 'sonner';

export default function Challenges() {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChallenges();
    }, []);

    const fetchChallenges = async () => {
        try {
            const res = await restaurantClient.get('/food/restaurant/challenges');
            if (res.data?.success) {
                setChallenges(res.data?.data || []);
            } else {
                toast.error(res.data?.message || 'Failed to fetch challenges');
            }
        } catch (error) {
            toast.error('Failed to fetch challenges');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Challenges & Rewards</h1>
                <p className="text-sm text-gray-500">Complete challenges to earn wallet bonuses!</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {challenges.map(item => {
                        const { challenge, participation } = item;
                        const isCompleted = participation?.status === 'COMPLETED';
                        const progress = participation?.progress || 0;
                        const target = challenge.criteria.target;
                        const percent = Math.min(100, Math.round((progress / target) * 100));

                        return (
                            <div key={challenge._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col relative overflow-hidden">
                                {isCompleted && (
                                    <div className="absolute -right-8 top-4 bg-green-500 text-white text-xs font-bold px-10 py-1 rotate-45 shadow-sm">
                                        COMPLETED
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="pr-12">
                                        <h3 className="font-semibold text-lg text-gray-800">{challenge.title}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                            challenge.recurrence === 'DAILY' ? 'bg-blue-100 text-blue-700' :
                                            'bg-purple-100 text-purple-700'
                                        }`}>
                                            {challenge.recurrence}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-blue-600 font-bold text-lg">₹{challenge.reward?.amount}</div>
                                    </div>
                                </div>

                                <p className="text-gray-600 text-sm mb-6 flex-grow">{challenge.description}</p>
                                
                                <div className="mt-auto">
                                    <div className="flex justify-between text-xs font-medium text-gray-600 mb-1.5">
                                        <span>Progress: {progress} / {target}</span>
                                        <span>{percent}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                        <div 
                                            className={`h-2.5 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-blue-600'}`}
                                            style={{ width: `${percent}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {challenges.length === 0 && (
                        <div className="col-span-full text-center py-20 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
                            No active challenges available right now. Check back later!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
