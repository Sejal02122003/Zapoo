import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { ArrowLeft, FileText, Loader2, Shield, Utensils, Bike, AlertTriangle, Scale, Award } from "lucide-react"
import { motion } from "framer-motion"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { Button } from "@food/components/ui/button"
import api from "@food/api"
import useAppBackNavigation from "@food/hooks/useAppBackNavigation"
import { API_ENDPOINTS } from "@food/api/config"

export default function Terms() {
  const navigate = useNavigate()
  const goBack = useAppBackNavigation()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("customer")
  const [termsData, setTermsData] = useState({
    title: 'Master Terms, Conditions & Code of Conduct',
    content: ''
  })

  useEffect(() => {
    fetchTermsData()
  }, [])

  const fetchTermsData = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN.TERMS_PUBLIC)
      if (response.data.success && response.data.data?.content) {
        setTermsData(response.data.data)
      }
    } catch (error) {
      // Silently keep default master terms
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
               Master Terms, Conditions & Code of Conduct
             </h1>
             <p className="text-[11px] text-[#E23744] font-bold uppercase tracking-widest mt-1">Effective Date: 15 August 2026</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Category Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white dark:bg-[#111] p-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <button
            onClick={() => setActiveTab("customer")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              activeTab === "customer"
                ? "bg-[#E23744] text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Shield className="w-4 h-4" /> Part A: Customer Terms
          </button>
          <button
            onClick={() => setActiveTab("restaurant")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              activeTab === "restaurant"
                ? "bg-[#E23744] text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Utensils className="w-4 h-4" /> Part B: Restaurant Partner
          </button>
          <button
            onClick={() => setActiveTab("delivery")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              activeTab === "delivery"
                ? "bg-[#E23744] text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Bike className="w-4 h-4" /> Part C: Delivery Partner
          </button>
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              activeTab === "general"
                ? "bg-[#E23744] text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Scale className="w-4 h-4" /> General & Conduct
          </button>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-[#111] rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 space-y-8"
        >
          {termsData.content ? (
            <div
              className="prose prose-slate dark:prose-invert max-w-none
                prose-headings:font-black prose-headings:text-gray-900 dark:prose-headings:text-white
                prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-p:leading-relaxed
                prose-strong:text-gray-900 dark:prose-strong:text-white
                prose-a:text-[#E23744] dark:prose-a:text-primary
                prose-li:text-gray-600 dark:prose-li:text-gray-400"
              dangerouslySetInnerHTML={{ __html: termsData.content }}
            />
          ) : (
            <>
              {/* PART A: CUSTOMER TERMS */}
              {activeTab === "customer" && (
                <div className="space-y-8">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <span className="text-[#E23744] font-black text-xs uppercase tracking-widest">Part A</span>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">Customer Terms & Conditions</h2>
                  </div>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">1. About Zapoo</h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      Zapoo is a technology-enabled food ordering and delivery platform that connects customers with participating restaurants and delivery partners. Zapoo facilitates food ordering, takeaway orders, home delivery, online payments, cash-on-delivery (COD), offers/discounts/cashback, and restaurant discovery. Food is prepared and supplied by the respective restaurant.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">2. Customer Account & Security</h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      Customers must provide accurate information (Name, Mobile number, Delivery address). Customers are responsible for account confidentiality. Creating fraudulent accounts, using another person's account without permission, manipulating referral programs, using bots, or placing fraudulent orders will lead to immediate account suspension.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">3. Placing an Order & Food Prices</h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      Orders transmitted to selected restaurants must be accepted by the restaurant before final confirmation. Food prices include applicable menu prices, delivery charges, platform service fees, payment gateway fees, and taxes. All charges are transparently displayed before payment.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">4. Cancellation & Refund Policy</h3>
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 text-sm text-amber-900 dark:text-amber-300 space-y-2">
                      <p className="font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" /> Cancellation Guidelines:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-xs text-amber-800 dark:text-amber-400">
                        <li><strong>Before Preparation:</strong> Eligible for cancellation and refund according to payment method.</li>
                        <li><strong>After Preparation Started:</strong> Orders cannot be cancelled for a refund merely due to change of mind or wrong address.</li>
                        <li><strong>Failed Deliveries:</strong> Incorrect address, unreachable phone number, or refusal to accept COD will be treated as customer-side failure.</li>
                      </ul>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">5. Cash on Delivery (COD) & Offers</h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      Repeated refusal to accept or pay for COD orders will result in permanent disabling of COD for the account. Cashback and promotional rewards are subject to minimum order values, caps, and expiry periods. Cashback is not equivalent to cash withdrawal and is usable only within the platform.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">6. Customer Code of Conduct</h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      Customers must treat restaurant staff and delivery partners with respect. Threatening delivery partners, harassing restaurant employees, making fraudulent complaints, or misusing customer support will result in permanent termination of platform access.
                    </p>
                  </section>
                </div>
              )}

              {/* PART B: RESTAURANT PARTNER TERMS */}
              {activeTab === "restaurant" && (
                <div className="space-y-8">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <span className="text-[#E23744] font-black text-xs uppercase tracking-widest">Part B</span>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">Restaurant Partner Terms & Conditions</h2>
                  </div>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">1. Restaurant Partnership & Licences</h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      Restaurants agree to provide accurate business, banking, FSSAI, GSTIN, and tax information. The restaurant must maintain all licences required under law to operate a food business.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">2. Restaurant Commission & Payout Settlement</h3>
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 text-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-red-200/50 pb-2">
                        <span className="font-bold text-gray-900 dark:text-white">Platform Commission</span>
                        <span className="font-black text-[#E23744] text-base">10% of Order Value</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-red-200/50 pb-2">
                        <span className="font-bold text-gray-900 dark:text-white">Settlement Schedule</span>
                        <span className="font-bold text-gray-900 dark:text-white">Next Business Day</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Commission is deducted from settlements along with payment gateway fees, taxes, and adjustments. Next-day settlement applies to completed orders.
                      </p>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">3. Cancellation Entitlements</h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      If an order is cancelled <strong>before preparation</strong>, the restaurant is not entitled to payment. If food preparation has started and cancellation is not attributable to the restaurant, Zapoo recognizes the restaurant's entitlement to order compensation.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">4. Food Safety, Hygiene & FSSAI Compliance</h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      Restaurants are solely responsible for food preparation, quality, packaging, hygiene, allergen disclosure, menu price accuracy, and strict FSSAI compliance.
                    </p>
                  </section>
                </div>
              )}

              {/* PART C: DELIVERY PARTNER TERMS */}
              {activeTab === "delivery" && (
                <div className="space-y-8">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <span className="text-[#E23744] font-black text-xs uppercase tracking-widest">Part C</span>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">Delivery Partner Terms & Conditions</h2>
                  </div>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">1. Earnings & Payout Schedule</h3>
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-5 text-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-emerald-200/50 pb-2">
                        <span className="font-bold text-gray-900 dark:text-white">Payout Cycle</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">Weekly (Every Monday)</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Payouts include completed delivery earnings, distance fees, tips, and bad-weather incentives minus authorized COD reconciliations or penalties.
                      </p>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">2. Bad Weather Incentives</h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      Additional delivery incentives are offered during heavy rain, storms, flooding, or severe weather conditions to support delivery partners. Safety always takes priority over speed.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">3. Delivery Delay Penalty Protection</h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      Penalties do not apply if delays are caused by restaurant preparation delays, customer unavailability, traffic congestion, severe weather, or technical app glitches outside rider control.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">4. Cash Collection & Code of Conduct</h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      COD cash collected belongs to Zapoo/settlement accounts and must be deposited promptly. Food tampering, consuming customer food, fake deliveries, or location spoofing will cause instant deactivation and legal action.
                    </p>
                  </section>
                </div>
              )}

              {/* GENERAL & CODE OF CONDUCT */}
              {activeTab === "general" && (
                <div className="space-y-8">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <span className="text-[#E23744] font-black text-xs uppercase tracking-widest">Part E, F, G</span>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">General Terms & Core Code of Conduct</h2>
                  </div>

                  {/* Core 5 Principles Card */}
                  <div className="bg-gradient-to-br from-[#E23744] to-red-700 text-white rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
                    <div className="flex items-center gap-3">
                      <Award className="w-8 h-8 text-amber-300" />
                      <h3 className="text-xl font-black uppercase tracking-tight">Zapoo Core 5 Principles</h3>
                    </div>

                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                        <span className="text-amber-300 font-black text-xs">01</span>
                        <h4 className="font-bold text-base mt-1">Fairness</h4>
                        <p className="text-xs text-white/80 mt-1">Treat customers, restaurants & riders with complete equity.</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                        <span className="text-amber-300 font-black text-xs">02</span>
                        <h4 className="font-bold text-base mt-1">Transparency</h4>
                        <p className="text-xs text-white/80 mt-1">Clear commissions, charges, payouts & refund policies.</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                        <span className="text-amber-300 font-black text-xs">03</span>
                        <h4 className="font-bold text-base mt-1">Respect</h4>
                        <p className="text-xs text-white/80 mt-1">Zero tolerance for abuse, harassment or discrimination.</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                        <span className="text-amber-300 font-black text-xs">04</span>
                        <h4 className="font-bold text-base mt-1">Safety</h4>
                        <p className="text-xs text-white/80 mt-1">Food hygiene, rider safety & customer data security first.</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 sm:col-span-2 md:col-span-1">
                        <span className="text-amber-300 font-black text-xs">05</span>
                        <h4 className="font-bold text-base mt-1">Integrity</h4>
                        <p className="text-xs text-white/80 mt-1">No fake orders, rating manipulation or platform misuse.</p>
                      </div>
                    </div>
                  </div>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Fraud, Misuse & Platform Security</h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      All users, restaurant partners, and delivery partners must not commit fraud, manipulate orders/coupons/referrals, submit false refund claims, or attempt unauthorized access to Zapoo infrastructure.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Governing Law & Dispute Resolution</h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      These Master Terms shall be governed by the laws of India. Disputes shall be subject to the jurisdiction of appropriate courts having jurisdiction over Zapoo's registered office.
                    </p>
                  </section>
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
