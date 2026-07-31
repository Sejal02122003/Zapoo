import { useState, useEffect } from "react";
import { Edit, Trash2 } from "lucide-react";
import api from "@food/api";
import { toast } from "sonner";

export default function HeroBannerSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [homeHeroBanner, setHomeHeroBanner] = useState({
    badgeText: "Hot Offers",
    titleLine1: "HUNGRY?",
    titleLine2: "WE GOT YOU!",
    subtitle: "Free delivery on first order",
    backgroundMedia: null
  });
  const [backgroundMediaFile, setBackgroundMediaFile] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/food/admin/business-settings");
      if (res.data?.success && res.data?.data?.homeHeroBanner) {
        setHomeHeroBanner({
          badgeText: res.data.data.homeHeroBanner.badgeText || "Hot Offers",
          titleLine1: res.data.data.homeHeroBanner.titleLine1 || "HUNGRY?",
          titleLine2: res.data.data.homeHeroBanner.titleLine2 || "WE GOT YOU!",
          subtitle: res.data.data.homeHeroBanner.subtitle || "Free delivery on first order",
          backgroundMedia: res.data.data.homeHeroBanner.backgroundMedia || null
        });
      }
    } catch (error) {
      console.error("Failed to fetch business settings", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setHomeHeroBanner(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("homeHeroBanner", JSON.stringify(homeHeroBanner));
      if (backgroundMediaFile) {
        formData.append("heroBannerMedia", backgroundMediaFile);
      }

      const res = await api.patch("/food/admin/business-settings", formData);
      if (res.data?.success) {
        toast.success("Hero Banner updated successfully!");
        setBackgroundMediaFile(null);
      }
    } catch (error) {
      console.error("Failed to update Hero Banner settings", error);
      toast.error("Failed to update banner text.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBanner = async () => {
    if (!window.confirm("Are you sure you want to remove the custom background banner? This will revert to the default animated background.")) return;
    
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("removeBackgroundMedia", "true");

      const res = await api.patch("/food/admin/business-settings", formData);
      if (res.data?.success) {
        toast.success("Background banner removed successfully!");
        fetchSettings(); // refresh state to clear preview
      }
    } catch (error) {
      console.error("Failed to remove background banner", error);
      toast.error("Failed to remove banner.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Edit className="w-5 h-5 text-slate-600" />
            <h1 className="text-2xl font-bold text-slate-900">Home Hero Banner Settings</h1>
          </div>

          <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800">
            Customize the text for the main Hero Banner shown at the top of the user app's Home screen.
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-500">Loading settings...</div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    value={homeHeroBanner.badgeText}
                    onChange={(e) => handleInputChange("badgeText", e.target.value)}
                    placeholder="e.g. Hot Offers"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">Small badge next to the flame icon.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Title Line 1
                  </label>
                  <input
                    type="text"
                    value={homeHeroBanner.titleLine1}
                    onChange={(e) => handleInputChange("titleLine1", e.target.value)}
                    placeholder="e.g. HUNGRY?"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">Main heading (white text).</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Title Line 2
                  </label>
                  <input
                    type="text"
                    value={homeHeroBanner.titleLine2}
                    onChange={(e) => handleInputChange("titleLine2", e.target.value)}
                    placeholder="e.g. WE GOT YOU!"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">Highlighted heading (yellow text).</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Subtitle
                  </label>
                  <input
                    type="text"
                    value={homeHeroBanner.subtitle}
                    onChange={(e) => handleInputChange("subtitle", e.target.value)}
                    placeholder="e.g. Free delivery on first order"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">Smaller text under the main title.</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Background Media (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm"
                  onChange={(e) => setBackgroundMediaFile(e.target.files[0])}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Upload an image or video to replace the animated Rain & Samosa background.</p>
                {backgroundMediaFile && (
                  <p className="text-xs text-green-600 mt-1 font-semibold">Ready to upload: {backgroundMediaFile.name}</p>
                )}
                
                {/* Active Banner Preview */}
                {!backgroundMediaFile && homeHeroBanner?.backgroundMedia?.url && (
                  <div className="mt-4 p-3 border border-slate-200 rounded-lg bg-slate-50 relative group">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-semibold text-slate-600">Currently Active Banner:</p>
                      <button 
                        type="button"
                        onClick={handleRemoveBanner}
                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-md transition-colors"
                        title="Remove custom background"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="relative w-48 h-48 rounded-md overflow-hidden bg-black/5 flex items-center justify-center">
                      {homeHeroBanner.backgroundMedia.resourceType === 'video' ? (
                        <video 
                          src={homeHeroBanner.backgroundMedia.url} 
                          className="w-full h-full object-cover"
                          autoPlay muted loop playsInline
                        />
                      ) : (
                        <img 
                          src={homeHeroBanner.backgroundMedia.url} 
                          alt="Active Banner" 
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
