"use client";

import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [ships, setShips] = useState([]);
  const [usage, setUsage] = useState([]);

  const router = useRouter();

  const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

  const [inputs, setInputs] = useState({});

  const [newShipName, setNewShipName] = useState("");
  const [newShipModel, setNewShipModel] = useState("M1");
  const [newHardwareCost, setNewHardwareCost] = useState("");

  const updateInput = (shipId, field, value) => {
    setInputs((prev) => ({
      ...prev,
      [shipId]: {
        month: prev[shipId]?.month || getCurrentMonth(),
        ...prev[shipId],
        [field]: value
      }
    }));
  };

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

  const addShip = async () => {
    if (!newShipName || !newShipModel) {
      alert("Bitte Name und Modell eingeben");
      return;
    }

    const { error } = await supabase.from("ships").insert([
      {
        name: newShipName,
        model: newShipModel,
        hardware_cost: Number(newHardwareCost) || 0
      }
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    location.reload();
  };

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

    const totalHardwareCost = ship.hardware_cost || 0;
    const realProfit = yourProfit - totalHardwareCost;

    const usageRatio = shipSold > 0 ? shipUsed / shipSold : 0;
    const breakEvenReached = yourProfit >= totalHardwareCost;

    let alert = "🟢 Good";
    if (usageRatio > 0.8) alert = "🔴 High Usage Risk";
    else if (usageRatio > 0.5) alert = "🟡 Medium Usage";
    if (realProfit < 0) alert = "❌ Not Profitable";
    if (shipSold < 20) alert = "⚠️ Low Sales";

    return {
      ...ship,
      shipSold,
      shipUsed,
      shipRevenue,
      shipRealProfit: realProfit,
      shipUsageRatio: usageRatio,
      breakEven: breakEvenReached,
      alert
    };
  }) || [];

  const rankedShips = [...shipStats].sort((a, b) => b.shipRealProfit - a.shipRealProfit);

  // 🔥 helper für rote negative zahlen
  const getValueColor = (value) => {
    if (typeof value === "string" && value.includes("-")) return "text-red-400";
    if (typeof value === "number" && value < 0) return "text-red-400";
    return "text-white";
  };

  return (
    <main className="p-10 text-white min-h-screen bg-cover bg-center relative" style={{ backgroundImage: "url('/ocean_bg.jpg')" }}>
      <div className="absolute inset-0 bg-black/15"></div>

      <div className="relative z-10 w-full px-6 xl:px-12">

        <h1 className="text-3xl font-bold mb-6 text-blue-900">
          CrewOceanLink Dashboard
        </h1>

        {/* TOP BAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

          <div className="lg:col-span-9 bg-blue-900/60 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 flex gap-3 items-center shadow-lg flex-wrap">
            <input
              type="text"
              placeholder="Ship Name"
              value={newShipName}
              onChange={(e) => setNewShipName(e.target.value)}
              className="text-black px-3 py-2 rounded-lg bg-white/90"
            />

            <select
              value={newShipModel}
              onChange={(e) => setNewShipModel(e.target.value)}
              className="text-black px-3 py-2 rounded-lg bg-white/90"
            >
              <option value="M1">M1</option>
              <option value="M2">M2</option>
              <option value="M3">M3</option>
            </select>

            <input
              type="number"
              placeholder="Hardware Cost"
              value={newHardwareCost}
              onChange={(e) => setNewHardwareCost(e.target.value)}
              className="text-black px-3 py-2 rounded-lg bg-white/90 w-32"
            />

            <button
              onClick={addShip}
              className="bg-green-600 hover:bg-green-500 px-5 py-2 rounded-lg font-semibold transition"
            >
              ➕ Add Ship
            </button>
          </div>

          <div className="lg:col-span-3 bg-blue-900/70 backdrop-blur-md border border-white/10 rounded-2xl p-5 text-sm shadow-lg">
            <p className="font-bold mb-2 text-white">Models</p>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-purple-300 font-bold">M1</span><span>50 / 50</span></div>
              <div className="flex justify-between"><span className="text-purple-300 font-bold">M2</span><span>60 / 40</span></div>
              <div className="flex justify-between"><span className="text-purple-300 font-bold">M3</span><span>100%</span></div>
            </div>
          </div>

        </div>

        {/* SHIPS */}
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

            const totalHardwareCost = ship.hardware_cost || 0;
            const realProfit = yourProfit - totalHardwareCost;

            const usageRatio = totalSold > 0 ? totalUsed / totalSold : 0;
            const breakEvenReached = yourProfit >= totalHardwareCost;

            const COST_PER_GB = BASE_COST / BASE_GB;
            const profitPerGB = SELL_PER_GB - COST_PER_GB;

            let share = 1;
            if (ship.model === "M1") share = 0.5;
            if (ship.model === "M2") share = 0.6;
            if (ship.model === "M3") share = 1;

            const effectiveProfitPerGB = profitPerGB * share;

            const breakEvenGB = effectiveProfitPerGB > 0
              ? totalHardwareCost / effectiveProfitPerGB
              : 0;

            const monthlyProfit = totalSold * effectiveProfitPerGB;

            const monthsToBreakEven = monthlyProfit > 0
              ? totalHardwareCost / monthlyProfit
              : 0;

            const roi = totalHardwareCost > 0
              ? (realProfit / totalHardwareCost) * 100
              : 0;

            const progress = breakEvenGB > 0
              ? Math.min((totalSold / breakEvenGB) * 100, 100)
              : 0;

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

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-4">
                  {[
                    { label: "Monthly Subscription + Add on / GB", value: totalPurchased },
                    { label: "Voucher Sold in GB", value: totalSold },
                    { label: "Used GB (End User Consumption)", value: totalUsed },
                    { label: "Revenue", value: `$${revenue.toFixed(2)}` },
                    { label: "Cost", value: `$${totalCost.toFixed(2)}` },
                    { label: "Hardware Cost", value: `$${totalHardwareCost.toFixed(2)}` },
                    { label: "Real Profit", value: `$${realProfit.toFixed(2)}` },
                    { label: "ROI %", value: `${roi.toFixed(1)}%` },
                    { label: "Usage Ratio", value: `${(usageRatio * 100).toFixed(1)}%` },
                    { label: "Break-even", value: breakEvenReached ? "🟢 YES" : "🔴 NO" },
                    { label: "Break-even GB", value: breakEvenGB.toFixed(1) },
                    { label: "Break-even Time", value: `${monthsToBreakEven.toFixed(1)} mo` }
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded flex flex-col text-center backdrop-blur-md bg-blue-900/60 border border-white/10 h-[140px]">
                      <div className="flex items-center justify-center h-[60px]">
                        <p className="text-sm text-white/70">{item.label}</p>
                      </div>

                      <div className="border-t border-white/20 my-2"></div>

                      <div className="flex items-center justify-center flex-1">
                        <h2 className={`text-2xl font-bold break-words ${getValueColor(item.value)}`}>
                          {item.value}
                        </h2>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-sm mt-1">{progress.toFixed(1)}% to break-even</p>
                </div>

                <p className="mt-2 text-sm font-semibold">{alert}</p>

              </div>
            );
          })}
        </div>

        {/* RANKING */}
        <div className="bg-blue-900/60 backdrop-blur-md border border-white/10 p-4 rounded">
          <h2 className="text-xl mb-4">Ships Ranking</h2>

          {rankedShips.map((ship, index) => (
            <div key={ship.id} className="border-b border-white/10 py-3">
              <p className="font-bold text-lg">
                #{index + 1} - {ship.name}
              </p>
              <p className={`text-sm ${ship.shipRealProfit < 0 ? "text-red-400" : ""}`}>
                Profit: ${ship.shipRealProfit.toFixed(2)}
              </p>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}