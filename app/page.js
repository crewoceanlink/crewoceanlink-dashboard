"use client";

import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [ships, setShips] = useState([]);
  const [usage, setUsage] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data: shipsData } = await supabase.from("ships").select("*");
      const { data: usageData } = await supabase.from("usage_logs").select("*");

      setShips(shipsData || []);
      setUsage(usageData || []);

      setLoading(false);
    };

    init();
  }, []);

  if (loading) return null;

  const SELL_PER_GB = 6.5;

  const BASE_GB = 50;
  const BASE_COST = 260;
  const ADDON_GB = 50;
  const ADDON_COST = 104;

  const calculateCost = (capacity) => {
    if (capacity === 0) return 0;

    let cost = 0;

    const baseGB = Math.min(capacity, BASE_GB);
    cost += baseGB * (BASE_COST / BASE_GB);

    if (capacity > BASE_GB) {
      const extraGB = capacity - BASE_GB;
      cost += extraGB * (ADDON_COST / ADDON_GB);
    }

    return cost;
  };

  const getYourShare = (model, profit) => {
    if (model === "M1") return profit * 0.5;
    if (model === "M2") return profit * 0.6;
    if (model === "M3") return profit;
    return profit;
  };

  const shipStats = ships?.map((ship) => {
    const shipUsage = usage?.filter(u => u.ship_id === ship.id) || [];

    const shipSold = shipUsage.reduce((sum, u) => sum + (u.sold_gb || 0), 0);
    const shipUsed = shipUsage.reduce((sum, u) => sum + (u.used_gb || 0), 0);

    const shipRevenue = shipSold * SELL_PER_GB;

    const shipCost = shipUsage.reduce((sum, u) => {
      return sum + calculateCost(u.month_subscription_addon_gb || 0);
    }, 0);

    const rawProfit = shipRevenue - shipCost;
    const yourProfit = getYourShare(ship.model, rawProfit);

    const hardware = ship.hardware_cost || 0;

    const shipRealProfit = yourProfit - hardware;

    const shipUsageRatio = shipSold > 0 ? shipUsed / shipSold : 0;
    const breakEven = yourProfit >= hardware;

    let alert = "🟢 Good";

    if (shipUsageRatio > 0.8) alert = "🔴 High Usage Risk";
    else if (shipUsageRatio > 0.5) alert = "🟡 Medium Usage";

    if (shipRealProfit < 0) alert = "❌ Not Profitable";
    if (shipSold < 20) alert = "⚠️ Low Sales";

    return {
      ...ship,
      shipSold,
      shipUsed,
      shipRevenue,
      shipRealProfit,
      shipUsageRatio,
      breakEven,
      alert
    };
  }) || [];

  const rankedShips = [...shipStats].sort((a, b) => b.shipRealProfit - a.shipRealProfit);

  return (
    <main className="p-10 text-white min-h-screen bg-cover bg-center relative" style={{ backgroundImage: "url('/ocean_bg.jpg')" }}>
      <div className="absolute inset-0 bg-black/15"></div>

      <div className="relative z-10">
        <h1 className="text-3xl font-bold mb-6 text-blue-900">
          CrewOceanLink Dashboard
        </h1>

        <div className="space-y-6 mb-8">
          {ships.map((ship) => {
            const shipUsage = usage?.filter(u => u.ship_id === ship.id) || [];

            const totalPurchased = shipUsage.reduce((sum, u) => sum + (u.month_subscription_addon_gb || 0), 0);
            const totalUsed = shipUsage.reduce((sum, u) => sum + (u.used_gb || 0), 0);
            const totalSold = shipUsage.reduce((sum, u) => sum + (u.sold_gb || 0), 0);

            const revenue = totalSold * SELL_PER_GB;

            const totalCost = shipUsage.reduce((sum, u) => {
              return sum + calculateCost(u.month_subscription_addon_gb || 0);
            }, 0);

            const rawProfit = revenue - totalCost;
            const yourProfit = getYourShare(ship.model, rawProfit);

            const hardware = ship.hardware_cost || 0;

            const realProfit = yourProfit - hardware;

            const usageRatio = totalSold > 0 ? totalUsed / totalSold : 0;

            const breakEvenReached = yourProfit >= hardware;
            const remainingToBreakEven = hardware - yourProfit;

            // 🔥 BREAK EVEN GB
            const COST_PER_GB = BASE_COST / BASE_GB;
            const profitPerGB = SELL_PER_GB - COST_PER_GB;

            let share = 1;
            if (ship.model === "M1") share = 0.5;
            if (ship.model === "M2") share = 0.6;
            if (ship.model === "M3") share = 1;

            const effectiveProfitPerGB = profitPerGB * share;

            const breakEvenGB = effectiveProfitPerGB > 0
              ? hardware / effectiveProfitPerGB
              : 0;

            // 🔥 NEW: PROGRESS
            const progress = breakEvenGB > 0 ? totalSold / breakEvenGB : 0;

            // 🔥 NEW: ROI
            const roi = hardware > 0 ? (realProfit / hardware) * 100 : 0;

            let alert = "🟢 Good";
            if (usageRatio > 0.8) alert = "🔴 High Usage Risk";
            else if (usageRatio > 0.5) alert = "🟡 Medium Usage";
            if (realProfit < 0) alert = "❌ Not Profitable";
            if (totalSold < 20) alert = "⚠️ Low Sales";

            return (
              <div key={ship.id}>
                <h2 className="text-xl font-bold mb-2">
                  🚢 {ship.name} ({ship.model})
                </h2>

                <div className="grid grid-cols-11 gap-4">
                  {[
                    { label: "Monthly Subscription + Add on / GB", value: totalPurchased },
                    { label: "Voucher Sold in GB", value: totalSold },
                    { label: "Used GB (End User Consumption)", value: totalUsed },
                    { label: "Revenue", value: `$${revenue.toFixed(2)}` },
                    { label: "Cost", value: `$${totalCost.toFixed(2)}` },
                    { label: "Hardware Cost", value: `$${hardware.toFixed(2)}` },
                    { label: "Real Profit", value: `$${realProfit.toFixed(2)}` },
                    { label: "ROI %", value: `${roi.toFixed(1)}%` }, // ✅ NEW
                    { label: "Usage Ratio", value: `${(usageRatio * 100).toFixed(1)}%` },
                    { label: "Break-even", value: breakEvenReached ? "🟢 YES" : "🔴 NO" },
                    { label: "Break-even GB", value: breakEvenGB.toFixed(1) }
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded flex flex-col text-center backdrop-blur-md bg-blue-900/60 border border-white/10">
                      <div className="h-14 flex items-center justify-center">
                        <p className="text-sm text-white/70">{item.label}</p>
                      </div>

                      <div className="border-t border-white/20 my-2"></div>

                      <h2 className={`text-2xl font-bold ${
                        item.label === "Real Profit"
                          ? realProfit >= 0 ? "text-green-400" : "text-red-400"
                          : ""
                      }`}>
                        {item.value}
                      </h2>
                    </div>
                  ))}
                </div>

                {/* 🔥 PROGRESS BAR */}
                <div className="mt-3">
                  <div className="w-full bg-white/10 rounded h-3">
                    <div
                      className="bg-green-400 h-3 rounded"
                      style={{ width: `${Math.min(progress * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs mt-1">
                    {Math.min(progress * 100, 100).toFixed(1)}% to break-even
                  </p>
                </div>

                <div className="mt-2 text-sm">
                  <p>{breakEvenReached ? "🟢 Profitable" : "🔴 Not profitable"}</p>
                  <p className="font-bold">{alert}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-blue-900/60 backdrop-blur-md border border-white/10 p-4 rounded">
          <h2 className="text-xl mb-4">Ships Ranking</h2>

          {rankedShips.map((ship, index) => (
            <div key={ship.id} className="border-b border-white/10 py-3">
              <p className="font-bold text-lg">
                #{index + 1} - {ship.name}
              </p>
              <p className="text-sm">
                Profit: ${ship.shipRealProfit.toFixed(2)}
              </p>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}