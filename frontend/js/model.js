/* Target Stock Balancer: sample data generator and algorithm for Target Corporation. */
const TOOL = {
  num: 10, area: "Operations", product: "Inventory Optimization", seed: 110,
  title: "Target Stock Balancer", company: "Target Corporation",
  why: "In 2022 Target was left with too much home and apparel stock while some high-demand items still ran short. This tool forecasts every SKU, sets safety stock and reorder points, and flags what to reorder and what to mark down.",
  statement: "A retailer simultaneously experiences stockouts for high-demand products and excess inventory for slow-moving products. Develop an AI inventory intelligence system that analyzes historical demand, seasonality, sales, inventory and supplier lead times to recommend inventory decisions.",
  dataNote: "60 SKUs across 6 departments in one distribution region, 104 weeks of sales, current stock and supplier lead times (sample data).",
  steps: [
    ["Collect sales and stock data", "Weekly sales, seasonality, price, stock on hand and on order, lead times"],
    ["ABC-XYZ classification", "Revenue share (ABC) and demand variability (XYZ)"],
    ["Forecast demand", "Holt-Winters with 52-week seasonality, 12 weeks ahead"],
    ["Safety stock", "Service-level z × forecast error × √lead time"],
    ["Reorder point and quantity", "Lead-time demand + safety stock; EOQ for order size"],
    ["Flag slow and dead stock", "Weeks of supply above the excess limit"],
    ["Recommend actions", "Reorder, expedite, transfer or mark down"],
    ["Explain to buyers", "AI analyst writes the buyer notes"]
  ],
  params: [
    { id: "sl", label: "Target service level", min: 90, max: 99.5, step: 0.5, value: 97, fmt: v => v + "%" },
    { id: "ex", label: "Excess limit", min: 12, max: 40, step: 2, value: 20, fmt: v => v + " weeks of supply" }
  ],
  questions: ["Which items will stock out first?", "How much cash is tied up in excess stock?", "What markdown should we take on slow movers?", "Explain ABC-XYZ for our buyers"],
  generate(r) {
    const deps = { Home: ["Throw pillow", "Area rug 5x7", "Ceramic vase", "Wall mirror", "Bath towel set", "Table lamp", "Storage bin", "Bedding set", "Candle 3-wick", "Patio chair"], Apparel: ["Women's denim", "Men's tee 3pk", "Kids hoodie", "Leggings", "Rain jacket", "Swim shorts", "Sneakers", "Socks 6pk", "Winter coat", "Dress"], Electronics: ["Wireless earbuds", "Smart speaker", "Phone charger", "HDMI cable", "Tablet case", "Gaming headset", "Smart bulb 4pk", "Power bank", "Webcam", "TV wall mount"], Grocery: ["Coffee pods 24ct", "Protein bars", "Sparkling water 12pk", "Cereal family size", "Snack mix", "Pasta sauce", "Olive oil", "Granola", "Frozen pizza", "Trail mix"], Toys: ["Building bricks set", "Plush bear", "Board game", "RC car", "Doll house", "Puzzle 1000pc", "Art kit", "Action figure", "Card game", "Ride-on scooter"], Beauty: ["Moisturizer", "Shampoo", "Lip balm 3pk", "Sunscreen SPF50", "Face mask 5pk", "Body wash", "Nail polish", "Hair dryer", "Perfume", "Razor kit"] };
    const seas = { Home: [0.2, 10], Apparel: [0.35, 20], Electronics: [0.45, 47], Grocery: [0.08, 47], Toys: [0.9, 48], Beauty: [0.25, 22] };
    const skus = [];
    Object.entries(deps).forEach(([d, items]) => items.forEach((nm, i) => {
      const price = { Home: r.u(15, 120), Apparel: r.u(12, 90), Electronics: r.u(10, 150), Grocery: r.u(3, 15), Toys: r.u(8, 80), Beauty: r.u(5, 60) }[d];
      const base = Math.max(5, 2400 / price * Math.exp(r.n(0, 0.9))); const trend = r.chance(0.25) ? r.u(-0.6, -0.3) : r.chance(0.25) ? r.u(0.3, 0.8) : r.u(-0.1, 0.1);
      const [amp, peak] = seas[d]; const noise = r.u(0.06, 0.35);
      const sales = S.range(104).map(w => Math.max(0, Math.round(base * (1 + trend * w / 104) * (1 + amp * Math.cos(2 * Math.PI * (w - peak) / 52)) * (1 + r.n(0, noise)))));
      const lt = r.int(2, 10); const recent = S.mean(sales.slice(-8)); const plannedFor = base * (1 + (trend < -0.2 ? 0.1 : trend > 0.2 ? 0.3 : trend) );
      const onHand = Math.round(trend < -0.2 ? recent * r.u(18, 40) : trend > 0.25 ? recent * r.u(0.8, 3) : recent * r.u(7, 16)), onOrder = r.chance(0.5) ? Math.round(plannedFor * r.u(1, 4)) : 0;
      skus.push({ sku: `${d.slice(0, 3).toUpperCase()}-${1000 + skus.length}`, name: nm, dep: d, price, cost: price * r.u(0.45, 0.65), lt, sales, onHand, onOrder });
    }));
    return { skus };
  },
  analyze(D, P, r) {
    const sk = D.skus, z = S.zNorm(P.sl / 100), H = 12, orderCost = 250, hold = 0.25;
    const rows = sk.map(s => {
      const y = s.sales, rev = S.sum(y.slice(-52)) * s.price;
      const hw = M.hw(y, 52, 0.25, 0.05, 0.25, H); const fc = hw.fc.map(v => Math.max(0, v));
      const res = y.slice(-52).map((v, i) => v - hw.fit[52 + i]); const sdE = S.sd(res);
      const cv = S.sd(y.slice(-52)) / Math.max(1, S.mean(y.slice(-52)));
      const avg = S.mean(fc), ltd = S.sum(fc.slice(0, s.lt)) + (s.lt > H ? avg * (s.lt - H) : 0);
      const ss = z * sdE * Math.sqrt(s.lt), rop = ltd + ss, annual = avg * 52, eoq = Math.sqrt(2 * annual * orderCost / (hold * s.cost));
      const pos = s.onHand + s.onOrder, wos = s.onHand / Math.max(0.5, avg);
      const status = pos < rop ? (s.onHand < ltd * 0.5 ? "Stockout now" : "Reorder") : wos > P.ex ? "Excess" : "Healthy";
      const target = rop + eoq, orderQty = status === "Reorder" || status === "Stockout now" ? Math.max(Math.round(eoq), Math.round(rop - pos + eoq)) : 0;
      const excessUnits = status === "Excess" ? Math.max(0, s.onHand - avg * P.ex) : 0;
      const weeksLeft = s.onHand / Math.max(0.5, avg); const lostWeeks = Math.max(0, s.lt - weeksLeft); const lost = status !== "Healthy" && status !== "Excess" ? lostWeeks * avg * s.price : 0;
      return { s, rev, fc, fit: hw.fit, sdE, cv, avg, ss, rop, eoq, pos, wos, status, orderQty, excessUnits, excessVal: excessUnits * s.cost, lost, target };
    });
    const tot = S.sum(rows.map(x => x.rev)); const byRev = [...rows].sort((a, b) => b.rev - a.rev); let cum = 0; byRev.forEach(x => { cum += x.rev / tot; x.abc = cum <= 0.8 ? "A" : cum <= 0.95 ? "B" : "C"; x.xyz = x.cv < 0.25 ? "X" : x.cv < 0.5 ? "Y" : "Z"; });
    const mat = ["A", "B", "C"].map(a => ["X", "Y", "Z"].map(b => rows.filter(x => x.abc === a && x.xyz === b).length));
    const stock = rows.filter(x => x.status === "Stockout now" || x.status === "Reorder").sort((a, b) => b.lost - a.lost);
    const excess = rows.filter(x => x.status === "Excess").sort((a, b) => b.excessVal - a.excessVal);
    const invVal = S.sum(rows.map(x => x.s.onHand * x.s.cost)), exVal = S.sum(excess.map(x => x.excessVal)), lost = S.sum(stock.map(x => x.lost));
    const md = x => x.wos > P.ex * 2 ? 40 : x.wos > P.ex * 1.5 ? 30 : 20;
    const SC = 180; // region → chain
    const fcChart = x => { const xl = S.range(116).map(i => i < 104 ? (i % 13 === 0 ? "W" + (i + 1) : "") : "F+" + (i - 103)); return C.line(xl, [{ values: x.s.sales.concat(new Array(H).fill(null)), tone: "c2", w: 1.4 }, { values: new Array(103).fill(null).concat([x.s.sales[103]], x.fc), tone: "c1", dash: "4 3" }, { values: new Array(116).fill(null), ref: x.rop / Math.max(1, x.s.lt) }], { fmt: v => F.num(v), every: 13, yMin: 0 }); };
    const tone = st => st === "Stockout now" ? "bad" : st === "Reorder" ? "warn" : st === "Excess" ? "c4" : "good";
    const actionOf = x => x.status === "Stockout now" ? `Expedite ${F.num(x.orderQty)} units, transfer from nearby DCs` : x.status === "Reorder" ? `Order ${F.num(x.orderQty)} units now` : x.status === "Excess" ? `Mark down ${md(x)}%, pause orders, move to outlet stores` : "No action";
    return {
      steps: [`${sk.length} SKUs × 104 weeks, ${F.money(tot * SC)} annual chain revenue`, `A items: ${rows.filter(x => x.abc === "A").length}, Z items: ${rows.filter(x => x.xyz === "Z").length}`, `Avg forecast error ${F.pct(S.mean(rows.map(x => x.sdE / Math.max(1, x.avg))), 0)} of weekly demand`, `z = ${z.toFixed(2)} for ${P.sl}% service`, `${stock.length} SKUs below reorder point`, `${excess.length} SKUs above ${P.ex} weeks of supply`, `${stock.length + excess.length} actions`, "Ready"],
      kpis: [
        { label: "Stockout risk", value: `${stock.length} SKUs`, note: `${stock.filter(x => x.status === "Stockout now").length} out within lead time`, tone: "bad" },
        { label: "Sales at risk", value: F.money(lost * SC), note: "Before the next order lands, chain-wide", tone: "bad" },
        { label: "Excess stock", value: F.money(exVal * SC), note: `${excess.length} SKUs over ${P.ex} weeks of supply`, tone: "warn" },
        { label: "Excess share", value: F.pct(exVal / invVal, 0), note: `of ${F.money(invVal * SC)} inventory at cost` }
      ],
      sections: [
        { pair: [
          { title: "ABC-XYZ matrix", note: "SKU counts. A = top 80% of revenue, X = steady demand, Z = erratic. AX items need tight control; CZ items are candidates to drop.", chart: C.heat(["A (top 80%)", "B (next 15%)", "C (last 5%)"], ["X steady", "Y variable", "Z erratic"], mat, { rowW: 100, cell: 90, lo: 0 }) },
          { title: "Inventory by status", note: "Stock on hand at cost, chain-wide.", chart: C.bar(["Stockout now", "Reorder", "Healthy", "Excess"].map(st => ({ label: st, value: S.sum(rows.filter(x => x.status === st).map(x => x.s.onHand * x.s.cost)) * SC, tone: tone(st) })), { fmt: v => F.money(v), labelW: 110 }) }
        ] },
        { pair: [
          stock[0] ? { title: `Running short: ${stock[0].s.name}`, note: `Sales history (grey), 12-week forecast (dashed) and weekly reorder level (red). Lead time ${stock[0].s.lt} weeks, ${stock[0].wos.toFixed(1)} weeks of stock left.`, chart: fcChart(stock[0]) } : { title: "No stockout risk", html: "<p>All SKUs are above their reorder points.</p>" },
          excess[0] ? { title: `Overstocked: ${excess[0].s.name}`, note: `Demand is falling while ${F.num(excess[0].s.onHand)} units sit in stock, about ${excess[0].wos.toFixed(0)} weeks of supply.`, chart: fcChart(excess[0]) } : { title: "No excess stock", html: "<p>No SKU is above the excess limit.</p>" }
        ] },
        { title: "Buyer action list", html: T.table(["SKU", "Item", "Class", "On hand", "Weekly forecast", "Weeks of supply", "Safety stock", "Reorder point", "Status", "Action"], [...stock, ...excess].map(x => [x.s.sku, x.s.name, x.abc + x.xyz, F.num(x.s.onHand), F.num(x.avg), x.wos.toFixed(1), F.num(x.ss), F.num(x.rop), T.pill(x.status, tone(x.status) === "c4" ? "mut" : tone(x.status)), actionOf(x)]), { right: [3, 4, 5, 6, 7] }) }
      ],
      recs: [
        ...stock.slice(0, 3).map(x => ({ title: `${x.s.name}: ${actionOf(x)}`, body: `${x.abc}${x.xyz} item. Stock covers ${x.wos.toFixed(1)} weeks but the supplier needs ${x.s.lt}. Reorder point is ${F.num(x.rop)} units including ${F.num(x.ss)} safety stock.`, impact: F.money(x.lost * SC) + " at risk", tone: "bad" })),
        ...excess.slice(0, 3).map(x => ({ title: `${x.s.name}: mark down ${md(x)}%`, body: `${x.wos.toFixed(0)} weeks of supply on a ${x.fc[11] < x.fc[0] ? "falling" : "flat"} forecast. Cancel open orders (${F.num(x.s.onOrder)} units) and move stock to outlet locations.`, impact: F.money(x.excessVal * SC) + " freed", tone: "warn" })),
        { title: `Set safety stock by class at ${P.sl}% service`, body: "Use the higher service level for AX and AY items and accept lower service on CZ items. That keeps cash out of slow, erratic lines.", impact: "Policy", tone: "" }
      ],
      context: { service_level: P.sl, excess_limit_weeks: P.ex, chain_scale_factor: SC, abc_xyz_counts: { AX: mat[0][0], AY: mat[0][1], AZ: mat[0][2], BX: mat[1][0], BY: mat[1][1], BZ: mat[1][2], CX: mat[2][0], CY: mat[2][1], CZ: mat[2][2] }, sales_at_risk: Math.round(lost * SC), excess_value: Math.round(exVal * SC), stockout_skus: stock.map(x => ({ sku: x.s.sku, item: x.s.name, dept: x.s.dep, class: x.abc + x.xyz, weeks_of_supply: +x.wos.toFixed(1), lead_time_weeks: x.s.lt, reorder_point: Math.round(x.rop), order_qty: x.orderQty })), excess_skus: excess.map(x => ({ sku: x.s.sku, item: x.s.name, dept: x.s.dep, weeks_of_supply: +x.wos.toFixed(0), excess_value: Math.round(x.excessVal * SC), markdown_pct: md(x) })) }
    };
  }
};
