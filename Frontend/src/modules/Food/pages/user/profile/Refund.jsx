import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { ArrowLeft, Receipt, Loader2, CheckCircle2, XCircle, AlertCircle, Clock, DollarSign, ShieldAlert, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { Button } from "@food/components/ui/button"
import api from "@food/api"
import useAppBackNavigation from "@food/hooks/useAppBackNavigation"
import { API_ENDPOINTS } from "@food/api/config"

export default function Refund() {
  const navigate = useNavigate()
  const goBack = useAppBackNavigation()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("stages")
  const [refundData, setRefundData] = useState({
    title: 'Common Cancellation & Refund Policy',
    content: ''
  })

  useEffect(() => {
    fetchRefundData()
  }, [])

  const fetchRefundData = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN.REFUND_PUBLIC)
      if (response.data.success && response.data.data?.content) {
        setRefundData(response.data.data)
      }
    } catch (error) {
      // Silently keep default refund data
    }
  }

  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <AnimatedPage className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-16">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-900">
        <div className="max-w-5xl mx-auto px-4 h-16 md:h-20 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-all active:scale-95"
          >
            <ArrowLeft className="h-6 w-6 text-gray-900 dark:text-white" />
          </Button>
          <div className="flex-1">
             <h1 className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-none">
               Common Cancellation & Refund Policy
             </h1>
             <p className="text-[11px] text-[#E23744] font-bold uppercase tracking-widest mt-1">Effective Date: 15 August 2026</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Category Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white dark:bg-[#111] p-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <button
            onClick={() => setActiveTab("stages")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              activeTab === "stages"
                ? "bg-[#E23744] text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Clock className="w-4 h-4" /> 4 Cancellation Stages
          </button>
          <button
            onClick={() => setActiveTab("problems")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              activeTab === "problems"
                ? "bg-[#E23744] text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" /> Covered Order Issues
          </button>
          <button
            onClick={() => setActiveTab("cod")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              activeTab === "cod"
                ? "bg-[#E23744] text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> Failed COD Policy
          </button>
          <button
            onClick={() => setActiveTab("timelines")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              activeTab === "timelines"
                ? "bg-[#E23744] text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <RefreshCw className="w-4 h-4" /> Refund Timelines
          </button>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-[#111] rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 space-y-8"
        >
          {refundData.content ? (
            <div
              className="prose prose-slate dark:prose-invert max-w-none
                prose-headings:font-black prose-headings:text-gray-900 dark:prose-headings:text-white
                prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-p:leading-relaxed
                prose-strong:text-gray-900 dark:prose-strong:text-white
                prose-a:text-[#E23744] dark:prose-a:text-primary
                prose-li:text-gray-600 dark:prose-li:text-gray-400"
              dangerouslySetInnerHTML={{ __html: refundData.content }}
            />
          ) : (
            <>
              {/* TAB 1: 4 CANCELLATION STAGES */}
              {activeTab === "stages" && (
                <div className="space-y-8">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <span className="text-[#E23744] font-black text-xs uppercase tracking-widest">Part D — Stage Guidelines</span>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">4 Order Stages & Cancellation Eligibility</h2>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase">Stage 1</span>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">Before Preparation</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Full refund available if cancelled before restaurant accepts & starts preparing food.</p>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-700 dark:text-amber-400 font-black text-xs uppercase">Stage 2</span>
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">Food Preparing</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Not eligible for full refund as food preparation costs are already incurred by restaurant.</p>
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-2xl p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-orange-700 dark:text-orange-400 font-black text-xs uppercase">Stage 3</span>
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">Out for Delivery</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">No refund unless Zapoo support confirms genuine platform service failure.</p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700 dark:text-blue-400 font-black text-xs uppercase">Stage 4</span>
                        <Receipt className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">Delivered</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Refunds considered only for missing/wrong items or verified quality issues.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: COVERED ORDER PROBLEMS */}
              {activeTab === "problems" && (
                <div className="space-y-8">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <span className="text-[#E23744] font-black text-xs uppercase tracking-widest">Part A — Section 6</span>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">Covered Order Problems & Resolution</h2>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Customers should report order problems as soon as reasonably possible with photographs or order details:
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">Wrong or Missing Items</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Partial or full refund issued based on missing item value.</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">Food Not Delivered</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Full order value refunded if rider fails to deliver order.</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">Damaged Packaging / Spills</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Compensation issued upon verification of damaged food package.</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">Uncreated Paid Orders</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Instant automatic refund if payment was deducted but order failed.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FAILED COD POLICY */}
              {activeTab === "cod" && (
                <div className="space-y-8">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <span className="text-[#E23744] font-black text-xs uppercase tracking-widest">Part D — Section 2</span>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">Failed Cash on Delivery (COD) Policy</h2>
                  </div>

                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 text-sm space-y-3">
                    <h3 className="font-bold text-red-900 dark:text-red-300 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-600" /> COD Misuse Restrictions:
                    </h3>
                    <p className="text-xs text-red-800 dark:text-red-400 leading-relaxed">
                      If a customer repeatedly places COD orders and refuses to accept or pay for them without a legitimate reason, Zapoo records the failed attempt, disables COD for that customer, and requires prepaid orders.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 4: REFUND TIMELINES */}
              {activeTab === "timelines" && (
                <div className="space-y-8">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <span className="text-[#E23744] font-black text-xs uppercase tracking-widest">Part A — Section 15</span>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">Refund Processing & Banking Timelines</h2>
                  </div>

                  <div className="bg-gradient-to-br from-[#E23744] to-red-700 text-white rounded-3xl p-6 md:p-8 shadow-xl space-y-4">
                    <h3 className="text-lg font-bold">Standard Bank Processing Window</h3>
                    <p className="text-xs text-white/90 leading-relaxed">
                      Once a refund is approved by Zapoo Support, money is returned to the original payment source (UPI, Debit/Credit Card, Net Banking) within <strong>3-7 working days</strong>, or credited instantly to <strong>Zapoo Wallet</strong> based on customer choice.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>

        <p className="text-center mt-10 text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] leading-relaxed">
          Effective Date: 15 August 2026 | Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} <br />
          © {new Date().getFullYear()} Zapoo Inc. All Rights Reserved.
        </p>
      </div>
    </AnimatedPage>
  )
}
