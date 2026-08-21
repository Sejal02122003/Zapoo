import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "@food/api";
import {
  MapPin,
  Star,
  Apple,
  Play,
  ShoppingBag,
  Clock,
  Zap,
  ArrowRight,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
  UtensilsCrossed,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Award,
  Sparkles,
  Percent,
  Truck,
  Car,
  Tag,
  Compass,
  Layers,
  HeartHandshake,
  Smartphone,
  Check
} from "lucide-react";

// Asset Constants - Optimized Image URLs (WebP/Auto-format + Compressed Quality)
const HERO_BG = "https://images.unsplash.com/photo-1449844908441-8829872d2607?q=70&w=1200&auto=format&fit=crop";

const HERO_FOOD_IMAGES = [
  "https://images.unsplash.com/photo-1552611052-33e04de081de?q=75&w=700&auto=format&fit=crop", // Spicy Ramen Bowl
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=75&w=700&auto=format&fit=crop", // Gourmet Cheeseburger
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=75&w=700&auto=format&fit=crop", // Loaded Cheesy Pizza
  "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=75&w=700&auto=format&fit=crop"  // Fresh Salmon Sushi
];

const ABOUT_IMG_1 = "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=75&w=800&auto=format&fit=crop";
const ABOUT_IMG_2 = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=75&w=600&auto=format&fit=crop";
const APP_MOCKUP = "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=75&w=500&auto=format&fit=crop";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.zapoo.user1";

export default function MasterLandingPage() {
  const navigate = useNavigate();
  const [landingSettings, setLandingSettings] = useState(null);
  const [currentFoodIndex, setCurrentFoodIndex] = useState(0);
  const [showIosComingSoon, setShowIosComingSoon] = useState(false);

  // Auto-rotate Hero Food Images every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFoodIndex((prev) => (prev + 1) % HERO_FOOD_IMAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Public Landing Settings from Backend
  useEffect(() => {
    api.get("/food/landing/settings/public")
      .then((res) => {
        if (res.data?.success) {
          setLandingSettings(res.data.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load Zapoo landing settings", err);
      });
  }, []);

  const playStoreUrl = landingSettings?.appLinks?.playStore || PLAY_STORE_URL;
  const restaurantPartnerUrl = landingSettings?.appLinks?.restaurantPartner || "https://share.google/LGq4J5ulU5bTmzVqD";
  const deliveryPartnerUrl = landingSettings?.appLinks?.deliveryPartner || "https://play.google.com/store/apps/details?id=com.zapoo.delivery1&hl=en";

  const openAppStore = () => {
    window.open(playStoreUrl, '_blank');
  };

  const handleIosAppClick = () => {
    const iosUrl = landingSettings?.appLinks?.appStore;
    if (iosUrl && typeof iosUrl === 'string' && iosUrl.startsWith('http')) {
      window.open(iosUrl, '_blank');
    } else {
      setShowIosComingSoon(true);
    }
  };

  const scrollToDownloadApp = () => {
    const appSection = document.getElementById('download-app-section') || document.getElementById('zapoo-app-section');
    if (appSection) {
      appSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      openAppStore();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-x-hidden selection:bg-[#E23744] selection:text-white">
      
      {/* --- NAVBAR --- */}
      <nav className="absolute top-0 w-full z-50 flex items-center justify-between px-6 md:px-12 py-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#E23744] flex items-center justify-center shadow-lg shadow-[#E23744]/40 group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white group-hover:text-[#E23744] transition-colors">Zapoo</span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={scrollToDownloadApp}
            className="text-white/80 hover:text-white px-3 py-2 text-xs font-bold tracking-wider uppercase transition-colors hidden sm:block cursor-pointer"
          >
            ORDER ONLINE
          </button>
          <button 
            onClick={scrollToDownloadApp}
            className="bg-[#E23744] text-white px-5 py-2.5 rounded-lg font-bold text-xs tracking-wider uppercase shadow-lg shadow-[#E23744]/30 hover:bg-[#c92f3b] hover:scale-[1.02] transition-all cursor-pointer"
          >
            GET THE APP
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative min-h-screen flex items-center pt-28 pb-20 overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={HERO_BG} 
            alt="Zapoo Background" 
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover opacity-25 scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Hero Left Content */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-start"
          >
            <div className="inline-flex items-center gap-2 bg-[#E23744]/20 border border-[#E23744]/40 text-[#E23744] text-xs font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              ORDER. PICK UP. ENJOY.
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-[4.8rem] font-black leading-[0.95] tracking-tight mb-6">
              {landingSettings?.heroHeading || (
                <>
                  GOOD FOOD,<br />
                  <span className="text-[#E23744]">JUST A TAP AWAY.</span>
                </>
              )}
            </h1>
            
            <p className="text-gray-400 text-lg md:text-xl font-medium max-w-xl leading-relaxed mb-8">
              {landingSettings?.heroSubheading || "Discover the best food around you, order your favourites for delivery, or order ahead for a quick and easy pickup."}
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <button 
                onClick={scrollToDownloadApp}
                className="flex items-center gap-2.5 bg-[#E23744] text-white px-7 py-4 rounded-xl font-bold text-sm tracking-wide shadow-xl shadow-[#E23744]/30 hover:bg-[#c92f3b] hover:scale-[1.03] transition-all cursor-pointer"
              >
                <span>GET THE APP</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                onClick={scrollToDownloadApp}
                className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white px-6 py-4 rounded-xl font-bold text-sm tracking-wide backdrop-blur-md transition-all cursor-pointer"
              >
                <span>ORDER ON WEB</span>
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </motion.div>

          {/* Hero Right Visual & Floating Cards (Purely Visual / Non-Clickable) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className="relative flex justify-center lg:justify-end pointer-events-none select-none"
          >
            <div className="relative w-[340px] h-[340px] sm:w-[450px] sm:h-[450px] rounded-full p-2.5 bg-gradient-to-tr from-[#E23744] via-rose-500/20 to-transparent pointer-events-none">
              <div className="w-full h-full rounded-full overflow-hidden border-8 border-[#0a0a0a] shadow-2xl relative pointer-events-none">
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={currentFoodIndex}
                    src={HERO_FOOD_IMAGES[currentFoodIndex]} 
                    alt="Zapoo Good Food" 
                    initial={{ opacity: 0, scale: 1.15, rotate: -2 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.9, rotate: 2 }}
                    transition={{ duration: 0.7, ease: "easeInOut" }}
                    className="w-full h-full object-cover absolute inset-0 pointer-events-none" 
                  />
                </AnimatePresence>
              </div>
            </div>

            {/* Floating Card 1: Quick Delivery (Non-Clickable) */}
            <motion.div 
              animate={{ y: [-8, 8, -8] }} 
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-2 -left-6 sm:top-6 sm:-left-14 lg:-left-16 bg-[#141414]/90 border border-white/10 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-2xl backdrop-blur-md max-w-[210px] sm:max-w-[230px] z-20 pointer-events-none"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#E23744]/20 text-[#E23744] flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-white font-bold text-xs">QUICK DELIVERY</div>
                <div className="text-gray-400 text-[11px] font-medium leading-tight">Hot food. Right to your doorstep.</div>
              </div>
            </motion.div>

            {/* Floating Card 2: Under ₹99 (Non-Clickable) */}
            <motion.div 
              animate={{ y: [8, -8, 8] }} 
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-1/2 -right-16 sm:-right-28 lg:-right-36 -translate-y-1/2 bg-[#141414]/90 border border-white/10 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-2xl backdrop-blur-md max-w-[200px] sm:max-w-[220px] z-20 pointer-events-none"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <div className="text-white font-bold text-xs">UNDER ₹99</div>
                <div className="text-gray-400 text-[11px] font-medium leading-tight">Big cravings. Small prices.</div>
              </div>
            </motion.div>

            {/* Floating Card 3: Order Ahead (Non-Clickable) */}
            <motion.div 
              animate={{ y: [-6, 6, -6] }} 
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-2 -left-4 sm:bottom-4 sm:-left-12 lg:-left-14 bg-[#141414]/90 border border-white/10 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-2xl backdrop-blur-md max-w-[220px] sm:max-w-[240px] z-20 pointer-events-none"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-white font-bold text-xs">ORDER AHEAD</div>
                <div className="text-gray-400 text-[11px] font-medium leading-tight">Order now. Pick up when ready.</div>
              </div>
            </motion.div>

          </motion.div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. INTRO SECTION */}
      {/* ========================================================================= */}
      <section className="bg-white text-black py-28 px-6 md:px-12 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="text-[#E23744] text-xs font-extrabold uppercase tracking-[0.25em] mb-4">THE ZAPOO EXPERIENCE</div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-tight text-gray-900">
              FOOD FOR <span className="text-[#E23744]">EVERY MOOD.</span>
            </h2>
            <p className="text-gray-600 text-lg font-medium leading-relaxed mb-10 max-w-lg">
              Hungry for something quick? Planning a feast? Or simply looking for your next favourite meal? Zapoo helps you discover restaurants, explore menus, order your favourites and get them delivered or ready for pickup.
            </p>
            
            {/* Live Stats */}
            <div className="grid grid-cols-3 bg-[#f8f8f8] rounded-2xl p-6 border border-gray-100 divide-x divide-gray-200">
              <div className="pr-4 text-center sm:text-left">
                <div className="text-[#E23744] text-2xl sm:text-3xl font-black mb-1">
                  {landingSettings?.stats?.restaurants || "3,00,000+"}
                </div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Restaurants</div>
              </div>
              <div className="px-4 text-center sm:text-left">
                <div className="text-gray-900 text-2xl sm:text-3xl font-black mb-1">
                  {landingSettings?.stats?.cities || "800+"}
                </div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cities</div>
              </div>
              <div className="pl-4 text-center sm:text-left">
                <div className="text-gray-900 text-2xl sm:text-3xl font-black mb-1">
                  {landingSettings?.stats?.orders || "3 Billion+"}
                </div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Orders Delivered</div>
              </div>
            </div>
          </motion.div>

          <div className="relative h-[380px] sm:h-[460px]">
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="absolute right-0 top-0 w-4/5 h-[320px] rounded-2xl overflow-hidden shadow-2xl"
            >
              <img src={ABOUT_IMG_1} alt="Zapoo Dining" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.2 }}
              className="absolute left-0 bottom-0 w-3/4 h-[250px] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.25)] border-8 border-white"
            >
              <img src={ABOUT_IMG_2} alt="Zapoo Meal" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </motion.div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FEATURES SECTION (8 CARDS) */}
      {/* ========================================================================= */}
      <section className="bg-[#111] text-white py-28 px-6 md:px-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[#E23744] text-xs font-extrabold uppercase tracking-[0.25em] mb-3 block">WHAT'S WAITING FOR YOU?</span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">MORE WAYS TO ENJOY YOUR FOOD.</h2>
            <p className="text-gray-400 font-medium text-base">Everything you need to discover, order and enjoy great food—all in one place.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1 */}
            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="bg-[#181818] border border-white/10 rounded-2xl p-6 hover:border-[#E23744] hover:shadow-[0_10px_30px_rgba(226,55,68,0.15)] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Percent className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white group-hover:text-amber-400 transition-colors">Under ₹99</h3>
              <p className="text-gray-400 text-sm font-medium leading-relaxed">Craving something delicious without spending too much? Discover meals, snacks and combos under ₹99.</p>
            </motion.div>

            {/* Card 2 */}
            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="bg-[#181818] border border-white/10 rounded-2xl p-6 hover:border-[#E23744] hover:shadow-[0_10px_30px_rgba(226,55,68,0.15)] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#E23744]/20 text-[#E23744] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white group-hover:text-[#E23744] transition-colors">Quick Delivery</h3>
              <p className="text-gray-400 text-sm font-medium leading-relaxed">Order from your favourite restaurants and get your food delivered straight to your doorstep.</p>
            </motion.div>

            {/* Card 3 */}
            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="bg-[#181818] border border-white/10 rounded-2xl p-6 hover:border-[#E23744] hover:shadow-[0_10px_30px_rgba(226,55,68,0.15)] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white group-hover:text-emerald-400 transition-colors">Takeaway</h3>
              <p className="text-gray-400 text-sm font-medium leading-relaxed">In a hurry? Order ahead and pick up your food without waiting.</p>
            </motion.div>

            {/* Card 4 */}
            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="bg-[#181818] border border-white/10 rounded-2xl p-6 hover:border-[#E23744] hover:shadow-[0_10px_30px_rgba(226,55,68,0.15)] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white group-hover:text-purple-400 transition-colors">Gourmet</h3>
              <p className="text-gray-400 text-sm font-medium leading-relaxed">Looking for something special? Explore premium restaurants and delicious gourmet experiences.</p>
            </motion.div>

            {/* Card 5 */}
            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="bg-[#181818] border border-white/10 rounded-2xl p-6 hover:border-[#E23744] hover:shadow-[0_10px_30px_rgba(226,55,68,0.15)] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Tag className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white group-hover:text-rose-400 transition-colors">Offers & Deals</h3>
              <p className="text-gray-400 text-sm font-medium leading-relaxed">Discover exciting deals and save more on your favourite food.</p>
            </motion.div>

            {/* Card 6 */}
            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="bg-[#181818] border border-white/10 rounded-2xl p-6 hover:border-[#E23744] hover:shadow-[0_10px_30px_rgba(226,55,68,0.15)] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white group-hover:text-blue-400 transition-colors">Live Tracking</h3>
              <p className="text-gray-400 text-sm font-medium leading-relaxed">Know where your order is from the moment it's prepared until it reaches you.</p>
            </motion.div>

            {/* Card 7 */}
            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="bg-[#181818] border border-white/10 rounded-2xl p-6 hover:border-[#E23744] hover:shadow-[0_10px_30px_rgba(226,55,68,0.15)] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white group-hover:text-teal-400 transition-colors">Explore Nearby</h3>
              <p className="text-gray-400 text-sm font-medium leading-relaxed">Find restaurants, cuisines and dishes based on your location and cravings.</p>
            </motion.div>

            {/* Card 8 */}
            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="bg-[#181818] border border-white/10 rounded-2xl p-6 hover:border-[#E23744] hover:shadow-[0_10px_30px_rgba(226,55,68,0.15)] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white group-hover:text-orange-400 transition-colors">Order Ahead</h3>
              <p className="text-gray-400 text-sm font-medium leading-relaxed">Plan your meal in advance and have it ready when you arrive.</p>
            </motion.div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. MOBILE APP SECTION */}
      {/* ========================================================================= */}
      <section id="download-app-section" className="bg-[#fcfcfc] text-black py-28 px-6 md:px-12 overflow-hidden relative">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Phone Mockup with Top-to-Bottom Scroll Reveal & Floating Bounce */}
          <motion.div 
            initial={{ opacity: 0, y: -150, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", stiffness: 60, damping: 14, mass: 1.2 }}
            className="flex justify-center"
          >
            <motion.div 
              animate={{ y: [-10, 10, -10], rotate: [-1, 1, -1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-[290px] h-[580px] bg-white rounded-[45px] shadow-[0_35px_70px_rgba(0,0,0,0.18)] border-[12px] border-[#1C1C1C] overflow-hidden flex flex-col hover:scale-[1.02] transition-transform duration-300"
            >
              <div className="absolute top-0 inset-x-0 h-7 bg-[#1C1C1C] rounded-b-3xl w-[140px] mx-auto z-20" />
              
              <div className="p-4 pt-12 flex-1 flex flex-col bg-[#fafafa]">
                <div className="w-full h-44 rounded-2xl overflow-hidden mb-4 shadow-sm relative">
                  <img src={APP_MOCKUP} alt="Zapoo App" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-[#E23744] text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase shadow">Zapoo App</div>
                </div>
                <h3 className="text-2xl font-black text-gray-900">Delicious Meals</h3>
                <div className="text-gray-500 text-xs font-semibold mb-6 flex items-center gap-1">
                  POPULAR • 4.9 <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                </div>
                
                <div className="flex justify-between items-center text-xs font-bold border-t border-b border-gray-100 py-3 mb-auto">
                  <span className="text-[#E23744] flex items-center gap-1"><Truck className="w-3.5 h-3.5"/> LIVE GPS</span>
                  <span className="text-gray-700">15 MINS</span>
                </div>

                <button 
                  onClick={openAppStore}
                  className="mt-4 bg-[#E23744] text-white text-center py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase shadow-md hover:bg-[#c92f3b] transition-colors cursor-pointer"
                >
                  GET THE ZAPOO APP
                </button>
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="text-[#E23744] text-xs font-extrabold uppercase tracking-[0.25em] mb-4">THE ZAPOO APP</div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-6 leading-tight text-gray-900">
              DISCOVER. ORDER.<br />TRACK. ENJOY.
            </h2>
            <p className="text-gray-500 text-lg font-medium leading-relaxed mb-8 max-w-lg">
              Your favourite restaurants, delicious food and easy ordering—all in one app. Browse menus, customise your order, pay securely and track your delivery in real time.
            </p>
            
            {/* App Highlights */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xl">🍔</span>
                <div>
                  <div className="font-bold text-sm text-gray-900">Discover Food</div>
                  <div className="text-gray-500 text-xs font-medium">Find something delicious for every craving.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xl">⚡</span>
                <div>
                  <div className="font-bold text-sm text-gray-900">Order Faster</div>
                  <div className="text-gray-500 text-xs font-medium">A simple experience from menu to checkout.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xl">📍</span>
                <div>
                  <div className="font-bold text-sm text-gray-900">Track Live</div>
                  <div className="text-gray-500 text-xs font-medium">Follow your order every step of the way.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xl">🛍️</span>
                <div>
                  <div className="font-bold text-sm text-gray-900">Easy Pickup</div>
                  <div className="text-gray-500 text-xs font-medium">Order ahead and collect your food when ready.</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <button 
                onClick={handleIosAppClick}
                className="flex items-center gap-3 bg-[#1a1a1a] text-white px-6 py-3 rounded-xl hover:bg-black transition-colors shadow-lg cursor-pointer"
              >
                <Apple className="w-5 h-5 fill-current" />
                <div className="text-left">
                  <div className="text-[9px] leading-tight text-gray-400">Download on the</div>
                  <div className="text-xs font-bold leading-tight">App Store</div>
                </div>
              </button>
              <button 
                onClick={openAppStore}
                className="flex items-center gap-3 bg-white text-black border border-gray-200 px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors shadow-lg cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current text-gray-700" />
                <div className="text-left">
                  <div className="text-[9px] leading-tight text-gray-500">GET IT ON</div>
                  <div className="text-xs font-bold leading-tight">Google Play</div>
                </div>
              </button>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. ORDER AHEAD SECTION */}
      {/* ========================================================================= */}
      <section className="bg-white text-black py-28 px-6 md:px-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[#E23744] text-xs font-extrabold uppercase tracking-[0.25em] mb-3 block">SKIP THE WAIT</span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 text-gray-900">ORDER NOW. PICK UP WHEN YOU'RE READY.</h2>
            <p className="text-gray-500 font-medium text-base">Got somewhere to be? Place your order in advance and have your food ready when you arrive.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            
            {/* Step 1 */}
            <div className="bg-[#f8f8f8] border border-gray-200/80 rounded-2xl p-8 text-center flex flex-col items-center hover:shadow-lg transition-all">
              <div className="w-14 h-14 rounded-2xl bg-[#E23744]/10 text-[#E23744] font-black text-xl flex items-center justify-center mb-6">
                01
              </div>
              <h3 className="text-xl font-black mb-3 text-gray-900 uppercase tracking-wide">DISCOVER</h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">Find restaurants and explore their menus.</p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#f8f8f8] border border-gray-200/80 rounded-2xl p-8 text-center flex flex-col items-center hover:shadow-lg transition-all">
              <div className="w-14 h-14 rounded-2xl bg-[#E23744]/10 text-[#E23744] font-black text-xl flex items-center justify-center mb-6">
                02
              </div>
              <h3 className="text-xl font-black mb-3 text-gray-900 uppercase tracking-wide">ORDER AHEAD</h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">Choose your food and place your order in advance.</p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#f8f8f8] border border-gray-200/80 rounded-2xl p-8 text-center flex flex-col items-center hover:shadow-lg transition-all">
              <div className="w-14 h-14 rounded-2xl bg-[#E23744]/10 text-[#E23744] font-black text-xl flex items-center justify-center mb-6">
                03
              </div>
              <h3 className="text-xl font-black mb-3 text-gray-900 uppercase tracking-wide">PICK UP</h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">Arrive, collect your order and get on with your day.</p>
            </div>

          </div>

          <div className="text-center">
            <button 
              onClick={scrollToDownloadApp}
              className="inline-flex items-center gap-2.5 bg-[#E23744] text-white px-8 py-4 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-[#E23744]/20 hover:bg-[#c92f3b] transition-all cursor-pointer"
            >
              <span>GET THE APP TO ORDER</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SAVINGS SECTION */}
      {/* ========================================================================= */}
      <section className="bg-[#0f0f0f] text-white py-28 px-6 md:px-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[#E23744] text-xs font-extrabold uppercase tracking-[0.25em] mb-3 block">MORE FOOD. LESS SPEND.</span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">GOOD FOOD DOESN'T HAVE TO COST MORE.</h2>
            <p className="text-gray-400 font-medium text-base">Get more from every order with exclusive deals, affordable meals and exciting offers.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            
            {/* Offer 1 */}
            <div className="bg-[#181818] border border-white/10 rounded-2xl p-8 hover:border-[#E23744]/50 transition-all flex flex-col justify-between">
              <div>
                <div className="inline-block bg-amber-500/20 text-amber-400 text-xs font-extrabold px-3 py-1 rounded-md mb-4 uppercase tracking-wider">
                  OFFER 1
                </div>
                <h3 className="text-2xl font-black mb-3">UNDER ₹99</h3>
                <p className="text-gray-400 text-sm font-medium leading-relaxed">Delicious picks at pocket-friendly prices.</p>
              </div>
              <button 
                onClick={scrollToDownloadApp}
                className="mt-6 text-[#E23744] font-bold text-xs flex items-center gap-1 hover:gap-2 transition-all uppercase tracking-wider cursor-pointer"
              >
                GET DEALS ON APP <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Offer 2 */}
            <div className="bg-[#181818] border border-white/10 rounded-2xl p-8 hover:border-[#E23744]/50 transition-all flex flex-col justify-between">
              <div>
                <div className="inline-block bg-[#E23744]/20 text-[#E23744] text-xs font-extrabold px-3 py-1 rounded-md mb-4 uppercase tracking-wider">
                  OFFER 2
                </div>
                <h3 className="text-2xl font-black mb-3">EXCLUSIVE DEALS</h3>
                <p className="text-gray-400 text-sm font-medium leading-relaxed">Save more on your favourite restaurants.</p>
              </div>
              <button 
                onClick={scrollToDownloadApp}
                className="mt-6 text-[#E23744] font-bold text-xs flex items-center gap-1 hover:gap-2 transition-all uppercase tracking-wider cursor-pointer"
              >
                GET DEALS ON APP <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Offer 3 */}
            <div className="bg-[#181818] border border-white/10 rounded-2xl p-8 hover:border-[#E23744]/50 transition-all flex flex-col justify-between">
              <div>
                <div className="inline-block bg-emerald-500/20 text-emerald-400 text-xs font-extrabold px-3 py-1 rounded-md mb-4 uppercase tracking-wider">
                  OFFER 3
                </div>
                <h3 className="text-2xl font-black mb-3">EVERYDAY OFFERS</h3>
                <p className="text-gray-400 text-sm font-medium leading-relaxed">New deals to make every craving worth it.</p>
              </div>
              <button 
                onClick={scrollToDownloadApp}
                className="mt-6 text-[#E23744] font-bold text-xs flex items-center gap-1 hover:gap-2 transition-all uppercase tracking-wider cursor-pointer"
              >
                GET DEALS ON APP <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          <div className="text-center">
            <button 
              onClick={scrollToDownloadApp}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white px-8 py-4 rounded-xl font-bold text-sm tracking-wide transition-all cursor-pointer"
            >
              <span>SEE ALL OFFERS ON APP</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. WHY ZAPOO */}
      {/* ========================================================================= */}
      <section className="bg-white text-black py-28 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[#E23744] text-xs font-extrabold uppercase tracking-[0.25em] mb-3 block">WHY ZAPOO?</span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900">YOUR FOOD. YOUR WAY.</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Point 1 */}
            <div className="p-6 rounded-2xl bg-[#f8f8f8] border border-gray-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#E23744]/10 text-[#E23744] flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black mb-1 text-gray-900">MORE CHOICE</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">Explore restaurants, cuisines and dishes for every craving.</p>
              </div>
            </div>

            {/* Point 2 */}
            <div className="p-6 rounded-2xl bg-[#f8f8f8] border border-gray-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#E23744]/10 text-[#E23744] flex items-center justify-center shrink-0">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black mb-1 text-gray-900">BETTER VALUE</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">Discover affordable meals, deals and offers.</p>
              </div>
            </div>

            {/* Point 3 */}
            <div className="p-6 rounded-2xl bg-[#f8f8f8] border border-gray-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#E23744]/10 text-[#E23744] flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black mb-1 text-gray-900">EASY ORDERING</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">Find your food and place your order in just a few taps.</p>
              </div>
            </div>

            {/* Point 4 */}
            <div className="p-6 rounded-2xl bg-[#f8f8f8] border border-gray-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#E23744]/10 text-[#E23744] flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black mb-1 text-gray-900">LIVE TRACKING</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">Stay updated from order confirmation to delivery.</p>
              </div>
            </div>

            {/* Point 5 */}
            <div className="p-6 rounded-2xl bg-[#f8f8f8] border border-gray-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#E23744]/10 text-[#E23744] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black mb-1 text-gray-900">QUICK PICKUP</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">Order ahead and skip the wait.</p>
              </div>
            </div>

            {/* Point 6 */}
            <div className="p-6 rounded-2xl bg-[#f8f8f8] border border-gray-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#E23744]/10 text-[#E23744] flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black mb-1 text-gray-900">FOOD AROUND YOU</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">Discover restaurants and delicious options near your location.</p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FINAL CTA */}
      {/* ========================================================================= */}
      <section className="bg-[#0a0a0a] text-white py-28 px-6 md:px-12 relative overflow-hidden border-t border-white/5 text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E23744]/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-5xl sm:text-6xl font-black tracking-tight mb-4">READY TO EAT?</h2>
          <p className="text-gray-400 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-6">
            From everyday cravings to quick pickups, Zapoo makes finding and ordering food simple.
          </p>
          <div className="text-[#E23744] font-black text-xl uppercase tracking-widest mb-10">
            DOWNLOAD THE APP TO GET STARTED.
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={scrollToDownloadApp}
              className="flex items-center gap-2.5 bg-[#E23744] text-white px-8 py-4 rounded-xl font-bold text-sm tracking-wide shadow-xl shadow-[#E23744]/30 hover:bg-[#c92f3b] hover:scale-[1.03] transition-all cursor-pointer"
            >
              <span>DOWNLOAD APP NOW</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. FOOTER */}
      {/* ========================================================================= */}
      <footer className="bg-white text-black pt-16 pb-8 px-6 md:px-12 border-t border-gray-200/80 font-sans">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-16">
            
            {/* Col 1: ZAPOO Branding */}
            <div className="lg:col-span-2 space-y-4 pr-0 lg:pr-8">
              <div 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex items-center gap-2.5 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#E23744] flex items-center justify-center">
                  <UtensilsCrossed className="text-white w-5 h-5" />
                </div>
                <span className="text-2xl font-black tracking-tight text-gray-900">Zapoo</span>
              </div>
              <p className="text-[#E23744] font-bold text-sm">Good food. Wherever you are.</p>
              <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-sm">
                Discover restaurants, order your favourites, grab great deals or order ahead for a quick pickup.
              </p>
            </div>

            {/* Col 2: EXPLORE */}
            <div>
              <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest mb-4">EXPLORE</h4>
              <ul className="space-y-2.5 text-sm font-semibold text-gray-600">
                <li><span className="hover:text-[#E23744] transition-colors">Order Food</span></li>
                <li><span className="hover:text-[#E23744] transition-colors">Under ₹99</span></li>
                <li><span className="hover:text-[#E23744] transition-colors">Gourmet</span></li>
                <li><span className="hover:text-[#E23744] transition-colors">Takeaway</span></li>
                <li><span className="hover:text-[#E23744] transition-colors">Order Ahead</span></li>
                <li><span className="hover:text-[#E23744] transition-colors">Offers</span></li>
              </ul>
            </div>

            {/* Col 3: PARTNERS */}
            <div>
              <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest mb-4">PARTNERS</h4>
              <ul className="space-y-2.5 text-sm font-semibold text-gray-600">
                <li><a href={restaurantPartnerUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#E23744] transition-colors cursor-pointer">Partner With Us</a></li>
                <li><a href={restaurantPartnerUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#E23744] transition-colors cursor-pointer">Restaurant Login</a></li>
                <li><a href={deliveryPartnerUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#E23744] transition-colors cursor-pointer">Delivery Partner</a></li>
                <li><a href="/contact-us" className="hover:text-[#E23744] transition-colors cursor-pointer">Business Solutions</a></li>
              </ul>
            </div>

            {/* Col 4: SUPPORT */}
            <div>
              <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest mb-4">SUPPORT</h4>
              <ul className="space-y-2.5 text-sm font-semibold text-gray-600">
                <li><a href="/help-support" className="hover:text-[#E23744] transition-colors">Help & Support</a></li>
                <li><a href="/contact-us" className="hover:text-[#E23744] transition-colors">Contact Us</a></li>
                <li><a href="/terms-conditions" className="hover:text-[#E23744] transition-colors">Terms & Conditions</a></li>
                <li><a href="/privacy-policy" className="hover:text-[#E23744] transition-colors">Privacy Policy</a></li>
                <li><a href="/refund-policy" className="hover:text-[#E23744] transition-colors">Refund Policy</a></li>
              </ul>
            </div>

          </div>

          {/* Download App Section */}
          <div className="border-t border-b border-gray-200/80 py-8 flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div>
              <h4 className="text-base font-black text-gray-900">DOWNLOAD ZAPOO</h4>
              <p className="text-gray-500 text-xs font-medium">Order food. Track deliveries. Discover more.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={openAppStore}
                className="flex items-center gap-2.5 bg-black text-white px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-md cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current text-white" />
                <div className="text-left">
                  <div className="text-[9px] uppercase tracking-wider leading-none text-gray-400">GET IT ON</div>
                  <div className="text-xs font-bold leading-tight">Google Play</div>
                </div>
              </button>
              <button 
                onClick={handleIosAppClick}
                className="flex items-center gap-2.5 bg-black text-white px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-md cursor-pointer"
              >
                <Apple className="w-4 h-4 fill-current text-white" />
                <div className="text-left">
                  <div className="text-[9px] tracking-wider leading-none text-gray-400">Download on the</div>
                  <div className="text-xs font-bold leading-tight">App Store</div>
                </div>
              </button>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold uppercase tracking-wider text-gray-400">
            <div>© 2026 Zapoo. All rights reserved.</div>
            <div className="flex items-center gap-2 text-emerald-500 font-extrabold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>SYSTEM HEALTH: 100% OPERATIONAL</span>
            </div>
          </div>
        </div>
      </footer>

      {/* --- iOS APP COMING SOON MODAL --- */}
      <AnimatePresence>
        {showIosComingSoon && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setShowIosComingSoon(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141414] border border-white/10 text-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowIosComingSoon(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#E23744]/20 via-[#E23744]/10 to-transparent border border-[#E23744]/30 text-white flex items-center justify-center mx-auto text-3xl shadow-inner">
                🍏
              </div>
              <h3 className="text-xl font-extrabold tracking-tight text-white">iOS App Coming Soon!</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                Our Apple iOS app is currently under review for the App Store. You can download and enjoy our Android app from Google Play today!
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowIosComingSoon(false);
                    window.open(playStoreUrl, '_blank');
                  }}
                  className="w-full bg-[#E23744] hover:bg-[#c92f3b] text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-[#E23744]/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current text-white" />
                  <span>GET ANDROID APP (PLAY STORE)</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
