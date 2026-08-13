import React, { useState } from "react";
import { ArrowLeft, Mail, Phone, MapPin, Send, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function ContactUs() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      toast.success("Thank you! Your message has been sent to Zapoo Support.");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#E23744] selection:text-white pb-20">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors cursor-pointer text-sm font-bold"
        >
          <ArrowLeft className="w-5 h-5 text-[#E23744]" />
          <span>Back</span>
        </button>
        <span className="text-xl font-black tracking-tight text-white">
          Zapoo <span className="text-[#E23744]">Support</span>
        </span>
        <div className="w-16" />
      </header>

      <div className="max-w-6xl mx-auto px-6 pt-12">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-[#E23744]/20 border border-[#E23744]/40 text-[#E23744] text-xs font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-wider mb-4">
            <MessageSquare className="w-3.5 h-3.5" /> WE ARE HERE TO HELP
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 text-white">Contact Us</h1>
          <p className="text-gray-400 text-base font-medium">Have a question, feedback, or need assistance with your order? Reach out to our support team anytime.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-10 items-start">
          {/* Left Info Cards */}
          <div className="space-y-6">
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 hover:border-[#E23744]/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#E23744]/20 text-[#E23744] flex items-center justify-center mb-4">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Email Us</h3>
              <p className="text-gray-400 text-sm mb-3">Our friendly team is here to help.</p>
              <a href="mailto:support@zapoo.in" className="text-[#E23744] font-bold text-sm hover:underline">support@zapoo.in</a>
            </div>

            <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 hover:border-[#E23744]/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Call Us</h3>
              <p className="text-gray-400 text-sm mb-3">Mon-Sun from 8am to 11pm.</p>
              <a href="tel:+9118001234567" className="text-emerald-400 font-bold text-sm hover:underline">+91 1800-123-4567</a>
            </div>

            <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 hover:border-[#E23744]/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Office Location</h3>
              <p className="text-gray-400 text-sm">Zapoo Food Technologies Pvt. Ltd.<br />Cyber Hub, Phase 2, Gurugram, India</p>
            </div>
          </div>

          {/* Right Form Card */}
          <div className="lg:col-span-2 bg-[#141414] border border-white/10 rounded-2xl p-8 shadow-2xl">
            {submitted ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4 animate-bounce" />
                <h3 className="text-2xl font-black text-white mb-2">Message Sent Successfully!</h3>
                <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">Thank you for contacting Zapoo. One of our support representatives will respond to your inquiry within 24 hours.</p>
                <button 
                  onClick={() => setSubmitted(false)} 
                  className="bg-[#E23744] text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-[#c92f3b] transition-colors"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <h3 className="text-2xl font-bold text-white mb-6">Send us a message</h3>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Your Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Enter your full name" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#E23744]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Email Address *</label>
                    <input 
                      type="email" 
                      required
                      placeholder="name@example.com" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#E23744]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Subject</label>
                  <input 
                    type="text" 
                    placeholder="How can we help you?" 
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#E23744]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Message *</label>
                  <textarea 
                    rows={5}
                    required
                    placeholder="Type your message or inquiry here..." 
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#E23744]"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#E23744] text-white py-4 rounded-xl font-bold text-sm tracking-wider uppercase shadow-xl shadow-[#E23744]/30 hover:bg-[#c92f3b] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? "Sending..." : "Submit Message"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
