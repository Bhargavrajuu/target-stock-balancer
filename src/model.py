"""Demand forecasting, ABC-XYZ, safety stock, reorder points and markdown actions for Target."""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import norm

from src.utils import bar, holt_winters, kpi, line, money, num, pct, rec, table

META = json.loads(Path(__file__).with_name("meta.json").read_text())
PARAMS = [
    {"name": "service_level", "label": "Target service level (%)", "min": 90.0, "max": 99.5, "step": 0.5, "default": 97.0},
    {"name": "excess_weeks", "label": "Excess limit (weeks of supply)", "min": 12, "max": 40, "step": 2, "default": 20},
]
H, ORDER_COST, HOLDING, SCALE = 12, 250, 0.25, 180  # region -> chain


def run(data, service_level=97.0, excess_weeks=20):
    S, W = data["skus"], data["weekly_sales"]
    z = norm.ppf(service_level / 100)
    rows, fcs = [], {}
    for s in S.itertuples():
        y = W[s.sku].to_numpy(float)
        fit, fc = holt_winters(y, 52, h=H); fc = np.maximum(0, fc); fcs[s.sku] = fc
        sd_err = np.std(y[52:] - fit[52:], ddof=1); avg = fc.mean()
        ltd = fc[: s.lead_time_weeks].sum() + (avg * (s.lead_time_weeks - H) if s.lead_time_weeks > H else 0)
        ss = z * sd_err * np.sqrt(s.lead_time_weeks); rop = ltd + ss
        eoq = np.sqrt(2 * avg * 52 * ORDER_COST / (HOLDING * s.unit_cost))
        pos, wos = s.on_hand + s.on_order, s.on_hand / max(0.5, avg)
        status = ("Stockout now" if s.on_hand < ltd * 0.5 else "Reorder") if pos < rop else "Excess" if wos > excess_weeks else "Healthy"
        qty = max(round(eoq), round(rop - pos + eoq)) if status in ("Reorder", "Stockout now") else 0
        excess_units = max(0, s.on_hand - avg * excess_weeks) if status == "Excess" else 0
        lost = max(0, s.lead_time_weeks - wos) * avg * s.price if status in ("Reorder", "Stockout now") else 0
        md = 40 if wos > excess_weeks * 2 else 30 if wos > excess_weeks * 1.5 else 20
        rows.append({"sku": s.sku, "item": s.item, "department": s.department, "revenue_52w": y[-52:].sum() * s.price, "cv": np.std(y[-52:]) / max(1, y[-52:].mean()),
                     "on_hand": s.on_hand, "weekly_forecast": round(avg, 1), "weeks_of_supply": round(wos, 1), "safety_stock": round(ss), "reorder_point": round(rop),
                     "eoq": round(eoq), "status": status, "order_qty": qty, "excess_value": excess_units * s.unit_cost * SCALE, "sales_at_risk": lost * SCALE,
                     "stock_value": s.on_hand * s.unit_cost * SCALE, "err_ratio": sd_err / max(1, avg), "markdown_pct": md if status == "Excess" else 0, "lead_time_weeks": s.lead_time_weeks, "on_order": s.on_order})
    R = pd.DataFrame(rows).sort_values("revenue_52w", ascending=False)
    R["cum_share"] = R.revenue_52w.cumsum() / R.revenue_52w.sum()
    R["abc"] = np.where(R.cum_share <= 0.8, "A", np.where(R.cum_share <= 0.95, "B", "C"))
    R["xyz"] = np.where(R.cv < 0.25, "X", np.where(R.cv < 0.5, "Y", "Z"))
    R["class"] = R.abc + R.xyz
    def action(r):
        return {"Stockout now": f"Expedite {r.order_qty:,} units, transfer from nearby DCs", "Reorder": f"Order {r.order_qty:,} units now",
                "Excess": f"Mark down {r.markdown_pct}%, pause orders, move to outlet stores"}.get(r.status, "No action")
    R["action"] = R.apply(action, axis=1)
    matrix = pd.crosstab(R.abc, R.xyz).reindex(index=["A", "B", "C"], columns=["X", "Y", "Z"], fill_value=0).reset_index()
    stock = R[R.status.isin(["Stockout now", "Reorder"])].sort_values("sales_at_risk", ascending=False)
    excess = R[R.status == "Excess"].sort_values("excess_value", ascending=False)
    by_status = R.groupby("status").stock_value.sum().reindex(["Stockout now", "Reorder", "Healthy", "Excess"], fill_value=0).rename_axis("status").reset_index()
    pick = (stock.iloc[0] if len(stock) else R.iloc[0])
    y = W[pick.sku].tolist()
    fc_df = pd.DataFrame({"week": [f"W{i + 1}" for i in range(104)] + [f"F+{i + 1}" for i in range(H)], "sales": y + [None] * H,
                          "forecast": [None] * 103 + [y[-1]] + list(np.round(fcs[pick.sku], 1)), "weekly_reorder_level": pick.reorder_point / max(1, pick.lead_time_weeks)})
    cols = ["sku", "item", "class", "on_hand", "weekly_forecast", "weeks_of_supply", "safety_stock", "reorder_point", "eoq", "status", "action"]
    tot_stock = R.stock_value.sum()
    return {
        "steps": [f"{len(S)} SKUs x 104 weeks, {money(R.revenue_52w.sum() * SCALE)} annual chain revenue", f"A items: {(R.abc == 'A').sum()}, Z items: {(R.xyz == 'Z').sum()}",
                  f"Holt-Winters forecast error averages {pct(R.err_ratio.mean(), 0)} of weekly demand",
                  f"z = {z:.2f} for {service_level}% service", f"{len(stock)} SKUs below reorder point", f"{len(excess)} SKUs above {excess_weeks} weeks of supply", f"{len(stock) + len(excess)} actions", "Ready"],
        "kpis": [kpi("Stockout risk", f"{len(stock)} SKUs", f"{(stock.status == 'Stockout now').sum()} out within lead time"), kpi("Sales at risk", money(stock.sales_at_risk.sum()), "Before the next order lands"),
                 kpi("Excess stock", money(excess.excess_value.sum()), f"{len(excess)} SKUs over {excess_weeks} weeks"), kpi("Excess share", pct(excess.excess_value.sum() / tot_stock, 0), f"of {money(tot_stock)} inventory at cost")],
        "charts": [bar("Inventory by status (at cost)", by_status, "status", "stock_value"),
                   line(f"Forecast: {pick['item']}", fc_df, "week", ["sales", "forecast", "weekly_reorder_level"], "Sales history, 12-week Holt-Winters forecast and weekly reorder level.")],
        "tables": [table("ABC-XYZ matrix (SKU counts)", matrix, "A = top 80% of revenue; X = steady demand, Z = erratic."),
                   table("Buyer action list", pd.concat([stock, excess])[cols]), table("All SKUs", R[cols + ["department", "lead_time_weeks"]])],
        "recs": [rec(f"{r['item']}: {r.action}", f"{r['class']} item. Stock covers {r.weeks_of_supply} weeks but the supplier needs {r.lead_time_weeks}. Reorder point {r.reorder_point:,} units incl. {r.safety_stock:,} safety stock.", money(r.sales_at_risk) + " at risk") for _, r in stock.head(3).iterrows()]
                + [rec(f"{r['item']}: mark down {r.markdown_pct}%", f"{r.weeks_of_supply:.0f} weeks of supply. Cancel open orders ({r.on_order:,} units) and move stock to outlet locations.", money(r.excess_value) + " freed") for _, r in excess.head(3).iterrows()]
                + [rec(f"Set safety stock by class at {service_level}% service", "Hold the higher service level for AX and AY items and accept lower service on CZ items.", "Policy")],
    }


if __name__ == "__main__":
    from src.data_generator import load_or_generate
    from src.report import write_reports

    out = run(load_or_generate(), **{p["name"]: p["default"] for p in PARAMS})
    for k in out["kpis"]:
        print(f"{k['label']}: {k['value']}  {k['note']}")
    print("Reports written to", write_reports(out, META, Path(__file__).resolve().parent.parent / "reports"))
