# Target Stock Balancer

AI solution 10 of 14 · Operations · built for **Target Corporation**

Prepared by **K Bhargav Raju**.

## Problem statement

A retailer simultaneously experiences stockouts for high-demand products and excess inventory for slow-moving products. Develop an AI inventory intelligence system that analyzes historical demand, seasonality, sales, inventory and supplier lead times to recommend inventory decisions.

## Why Target Corporation

In 2022 Target was left with too much home and apparel stock while some high-demand items still ran short. This tool forecasts every SKU, sets safety stock and reorder points, and flags what to reorder and what to mark down.

## Algorithm

1. **Collect sales and stock data**: Weekly sales, seasonality, price, stock on hand and on order, lead times
2. **ABC-XYZ classification**: Revenue share (ABC) and demand variability (XYZ)
3. **Forecast demand**: Holt-Winters with 52-week seasonality, 12 weeks ahead
4. **Safety stock**: Service-level z × forecast error × √lead time
5. **Reorder point and quantity**: Lead-time demand + safety stock; EOQ for order size
6. **Flag slow and dead stock**: Weeks of supply above the excess limit
7. **Recommend actions**: Reorder, expedite, transfer or mark down
8. **Explain to buyers**: AI analyst writes the buyer notes

## Data

60 SKUs across 6 departments in one distribution region, 104 weeks of sales, current stock and supplier lead times (sample data). All figures are illustrative and are not Target Corporation's actual numbers.

## How to use

Open `index.html` in any web browser. No installation is needed; the whole tool is one self-contained file.

The controls panel lets you change target service level, excess limit, and the analysis reruns instantly. "New sample data" generates a fresh dataset.

## AI analyst panel

The "Ask the AI analyst" panel answers questions about the results in plain English through Claude. It works when the page is opened as a Claude artifact on claude.ai. Opened from GitHub, GitHub Pages or a local folder, all the models, charts and controls still run, and the panel shows that it is unavailable.
