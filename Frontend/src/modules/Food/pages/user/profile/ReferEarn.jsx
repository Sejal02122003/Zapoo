import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Share2, Users, CircleCheck, Clock3, CircleX, Copy, Check } from "lucide-react";
import WalletIcon from "@food/components/ui/WalletIcon";
import AnimatedPage from "@food/components/user/AnimatedPage";
import { Button } from "@food/components/ui/button";
import { Card, CardContent } from "@food/components/ui/card";
import { useCompanyName } from "@food/hooks/useCompanyName";
import { useProfile } from "@food/context/ProfileContext";
import { toast } from "sonner";
import { userAPI } from "@food/api";

const PLAY_STORE_URL = "https://play.google.com/store/search?q=zapoo&c=apps&hl=en_IN";

const statusMeta = {
  credited: {
    label: "Credited",
    icon: CircleCheck,
    className: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300" },
  pending: {
    label: "Pending",
    icon: Clock3,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" },
  rejected: {
    label: "Rejected",
    icon: CircleX,
    className: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300" } };

export default function ReferEarn() {
  const { userProfile } = useProfile();
  const companyName = useCompanyName();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({
    referralCount: 0,
    totalReferralEarnings: 0,
    rewardAmount: 0,
    totalInvited: 0,
    creditedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    invitedFriends: [] });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await userAPI.getReferralDetails();
        const data = res?.data?.data || res?.data || {};
        const nextStats = data?.stats || {};
        if (!cancelled) {
          setStats({
            referralCount: Number(nextStats.referralCount) || 0,
            totalReferralEarnings: Number(nextStats.totalReferralEarnings) || 0,
            rewardAmount: Number(nextStats.rewardAmount) || 0,
            totalInvited: Number(nextStats.totalInvited) || 0,
            creditedCount: Number(nextStats.creditedCount) || 0,
            pendingCount: Number(nextStats.pendingCount) || 0,
            rejectedCount: Number(nextStats.rejectedCount) || 0,
            invitedFriends: Array.isArray(data?.invitedFriends) ? data.invitedFriends : [] });
        }
      } catch (error) {
        if (!cancelled) {
          toast.error("Failed to load referral details");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const refCode = userProfile?.referralCode || userProfile?._id || userProfile?.id || "";
  const referralLink = PLAY_STORE_URL;

  const shareText = useMemo(() => {
    const rewardText = stats.rewardAmount > 0 ? `₹${stats.rewardAmount}` : "exciting bonus";
    return `🎁 Use my Referral Code *${refCode}* to get ${rewardText} on ${companyName}! Download the app here:\n${PLAY_STORE_URL}`;
  }, [companyName, refCode, stats.rewardAmount]);

  const handleCopyCode = async () => {
    if (!refCode) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(refCode);
      }
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      toast.success(`Referral code: ${refCode}`);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${companyName} Referral`,
          text: shareText,
          url: PLAY_STORE_URL,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        toast.success("Invite message copied to clipboard!");
      }

      const fallbackUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      if (error?.name !== "AbortError") {
        toast.error("Unable to share right now");
      }
    }
  };

  return (
    <AnimatedPage className="min-h-screen bg-[#f5f5f5] dark:bg-[#0a0a0a]">
      <div className="max-w-md mx-auto px-4 py-4 pb-24">
        <div className="flex items-center gap-3 mb-5">
          <Link to="/user/profile">
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
              <ArrowLeft className="h-5 w-5 text-black dark:text-white" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-black dark:text-white">Refer & Earn</h1>
        </div>

        <Card className="bg-white dark:bg-[#1a1a1a] rounded-2xl border-0 dark:border-gray-800 shadow-sm mb-3">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Invite friends and earn when they sign up on {companyName}.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Reward per invite</p>
                <p className="text-lg font-bold text-primary">{"\u20B9"}{stats.rewardAmount}</p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Referral earnings</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {"\u20B9"}{stats.totalReferralEarnings}
                </p>
              </div>
            </div>

            {/* Referral Code Box */}
            {refCode && (
              <div className="mt-3 p-3 bg-primary/5 dark:bg-primary/10 border border-dashed border-primary/30 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400">Your Referral Code</p>
                  <p className="text-base font-mono font-bold tracking-wider text-primary">{refCode}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyCode}
                  className="h-8 px-3 rounded-lg border-primary/40 text-primary hover:bg-primary/10"
                >
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            )}

            <Button
              type="button"
              onClick={handleShare}
              className="w-full mt-3 h-11 rounded-xl bg-primary hover:bg-[#d84f0a]"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Invite via WhatsApp
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <Card className="border-0 shadow-sm bg-white dark:bg-[#1a1a1a]">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-[11px]">
                <Users className="h-3.5 w-3.5" />
                Invited
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalInvited}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white dark:bg-[#1a1a1a]">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-[11px]">
                <CircleCheck className="h-3.5 w-3.5" />
                Credited
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{stats.creditedCount}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white dark:bg-[#1a1a1a]">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-[11px]">
                <WalletIcon className="" />
                Total
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{"\u20B9"}{stats.totalReferralEarnings}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white dark:bg-[#1a1a1a] rounded-2xl border-0 dark:border-gray-800 shadow-sm">
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Invited Friends Status</h2>

            {loading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading referrals...</p>
            ) : invitedFriends.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No invited friends yet. Share your referral to start earning.
              </p>
            ) : (
              <div className="space-y-2">
                {invitedFriends.map((item) => {
                  const meta = statusMeta[item?.status] || statusMeta.pending;
                  const StatusIcon = meta.icon;
                  const invitedDate = item?.invitedAt ? new Date(item.invitedAt) : null;
                  const dateText =
                    invitedDate && !Number.isNaN(invitedDate.getTime())
                      ? invitedDate.toLocaleDateString()
                      : "-";

                  return (
                    <div
                      key={item?.id || item?.refereeId}
                      className="rounded-xl border border-gray-200 dark:border-gray-800 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {item?.name || "Friend"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {item?.phone || "Phone hidden"}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Invited on {dateText}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${meta.className}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {meta.label}
                          </span>
                          <p className="text-xs mt-2 text-gray-700 dark:text-gray-300">
                            Earned: {"\u20B9"}{Number(item?.earnedAmount) || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AnimatedPage>
  );
}

