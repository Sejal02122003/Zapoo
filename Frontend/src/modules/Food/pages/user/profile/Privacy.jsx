import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { ArrowLeft, Lock, Loader2, ShieldCheck, Eye, KeyRound, Server, UserCheck, ShieldAlert, FileCode } from "lucide-react"
import { motion } from "framer-motion"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { Button } from "@food/components/ui/button"
import api from "@food/api"
import useAppBackNavigation from "@food/hooks/useAppBackNavigation"
import { API_ENDPOINTS } from "@food/api/config"

export default function Privacy() {
  const navigate = useNavigate()
  const goBack = useAppBackNavigation()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("customer")
  const [privacyData, setPrivacyData] = useState({
    title: 'Privacy Policy & Data Protection',
    content: ''
  })

  useEffect(() => {
    fetchPrivacyData()
  }, [])

  const fetchPrivacyData = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN.PRIVACY_PUBLIC)
      if (response.data.success && response.data.data?.content) {
        setPrivacyData(response.data.data)
      }
    } catch (error) {
      // Silently keep default privacy data
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
               Privacy Policy & Data Security
             </h1>
             <p className="text-[11px] text-[#E23744] font-bold uppercase tracking-widest mt-1">Effective Date: 15 August 2026</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white dark:bg-[#111] p-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <button
            onClick={() => setActiveTab("customer")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              activeTab === "customer"
                ? "bg-[#E23744] text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Customer Data Privacy
          </button>
          <button
            onClick={() => setActiveTab("restaurant")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              activeTab === "restaurant"
                ? "bg-[#E23744] text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <UserCheck className="w-4 h-4" /> Partner Data Guidelines
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              activeTab === "security"
                ? "bg-[#E23744] text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <KeyRound className="w-4 h-4" /> Payment Credentials & Security
          </button>
          <button
            onClick={() => setActiveTab("ip")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              activeTab === "ip"
                ? "bg-[#E23744] text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <FileCode className="w-4 h-4" /> Intellectual Property
          </button>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-[#111] rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 space-y-8"
        >
          {privacyData.content ? (
            <div
              className="prose prose-slate dark:prose-invert max-w-none
                prose-headings:font-black prose-headings:text-gray-900 dark:prose-headings:text-white
                prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-p:leading-relaxed
                prose-strong:text-gray-900 dark:prose-strong:text-white
                prose-a:text-[#E23744] dark:prose-a:text-primary
                prose-li:text-gray-600 dark:prose-li:text-gray-400"
              dangerouslySetInnerHTML={{ __html: privacyData.content }}
            />
          ) : (
            <>
              {/* TAB 1: CUSTOMER DATA PRIVACY */}
              {activeTab === "customer" && (
                <div className="space-y-8">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <span className="text-[#E23744] font-black text-xs uppercase tracking-widest">Section 17</span>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">Customer Privacy & Data Processing</h2>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-900/60 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2">
                      <div className="w-9 h-9 rounded-xl bg-[#E23744]/10 text-[#E23744] flex items-center justify-center font-bold">
                        <Eye className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">Information We Collect</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        Name, Mobile number, delivery address, payment transaction references, and location details required to process food orders, facilitate delivery, and prevent fraud.
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/60 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">Strict Phone Number Masking</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        Customer contact numbers are strictly masked during order fulfillment. Neither restaurants nor delivery riders receive real personal phone numbers.
                      </p>
                    </div>
                  </div>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Why We Process Your Data</h3>
                    <ul className="list-disc pl-5 text-sm space-y-1.5 text-gray-600 dark:text-gray-400">
                      <li>To create and manage your Zapoo account safely</li>
                      <li>To transmit order details to partner restaurants</li>
                      <li>To enable delivery tracking and navigation for delivery partners</li>
                      <li>To process online payments and issue refunds</li>
                      <li>To prevent fraudulent orders, coupon abuse, and platform security breaches</li>
                    </ul>
                  </section>
                </div>
              )}

              {/* TAB 2: PARTNER DATA GUIDELINES */}
              {activeTab === "restaurant" && (
                <div className="space-y-8">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <span className="text-[#E23744] font-black text-xs uppercase tracking-widest">Part B - Section 12</span>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">Restaurant & Delivery Partner Data Confidentiality</h2>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 text-sm space-y-2">
                    <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-amber-600" /> Confidentiality Obligations for Partners:
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                      Customer information received through Zapoo is strictly confidential. Partners are permitted to use customer details solely for legitimate order fulfillment.
                    </p>
                  </div>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Strict Prohibitions for Partners</h3>
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 p-3.5 rounded-xl text-red-900 dark:text-red-300">
                        ❌ <strong>No Data Selling:</strong> Partners must never sell or trade customer information.
                      </div>
                      <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 p-3.5 rounded-xl text-red-900 dark:text-red-300">
                        ❌ <strong>No Spam/Marketing:</strong> Contacting customers for off-platform promotional offers is strictly prohibited.
                      </div>
                      <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 p-3.5 rounded-xl text-red-900 dark:text-red-300">
                        ❌ <strong>No Third-Party Sharing:</strong> Sharing customer details with unauthorized entities is forbidden.
                      </div>
                      <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 p-3.5 rounded-xl text-red-900 dark:text-red-300">
                        ❌ <strong>No Bypassing Platform:</strong> Contacting customers to solicit direct off-platform orders leads to deactivation.
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 3: PAYMENT CREDENTIALS & SECURITY */}
              {activeTab === "security" && (
                <div className="space-y-8">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <span className="text-[#E23744] font-black text-xs uppercase tracking-widest">Section 14</span>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">Payment Credentials & PCI-DSS Security</h2>
                  </div>

                  <div className="bg-gradient-to-br from-gray-900 to-black text-white p-6 rounded-3xl border border-gray-800 space-y-4 shadow-xl">
                    <div className="flex items-center gap-3">
                      <KeyRound className="w-7 h-7 text-[#E23744]" />
                      <h3 className="text-lg font-bold">Zero Credential Storage Policy</h3>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Zapoo <strong>never stores sensitive payment credentials</strong> (such as full debit/credit card numbers, CVVs, net-banking passwords, or UPI PINs). All online financial transactions are routed directly through PCI-DSS Level 1 certified payment gateways.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 4: INTELLECTUAL PROPERTY */}
              {activeTab === "ip" && (
                <div className="space-y-8">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <span className="text-[#E23744] font-black text-xs uppercase tracking-widest">Section 16</span>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">Intellectual Property Rights</h2>
                  </div>

                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    The Zapoo brand name, logo, mobile applications, web designs, algorithms, code, database schemas, trademarks, and graphics belong exclusively to Zapoo Inc. Users and partners may not copy, reverse engineer, modify, or commercially exploit any Zapoo IP without explicit written authorization.
                  </p>
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
