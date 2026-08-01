import React from 'react';
import { Settings, Tool, Wrench } from 'lucide-react';

export default function MaintenanceScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 text-slate-100 opacity-50">
          <Settings className="w-48 h-48 animate-[spin_10s_linear_infinite]" />
        </div>
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 text-slate-100 opacity-50">
          <Settings className="w-32 h-32 animate-[spin_8s_linear_infinite_reverse]" />
        </div>

        <div className="relative z-10">
          <div className="w-24 h-24 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Wrench className="w-12 h-12" />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
            We'll be back soon!
          </h1>
          
          <p className="text-slate-600 text-lg mb-8 leading-relaxed">
            Sorry for the inconvenience. We're performing some routine maintenance at the moment. We'll be back online shortly!
          </p>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              Refresh Page
            </button>
            <p className="text-sm text-slate-400 mt-2">
              Thank you for your patience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
