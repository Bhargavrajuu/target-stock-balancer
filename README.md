# Target Stock Balancer

AI solution 10 of 14 · Operations · built for **Target Corporation**

Prepared by **K Bhargav Raju**.

**Live website:** https://bhargavrajuu.github.io/target-stock-balancer/

## Problem statement

A retailer simultaneously experiences stockouts for high-demand products and excess inventory for slow-moving products. Develop an AI inventory intelligence system that analyzes historical demand, seasonality, sales, inventory and supplier lead times to recommend inventory decisions.

## Why Target Corporation

In 2022 Target was left with too much home and apparel stock while some high-demand items still ran short. This tool forecasts every SKU, sets safety stock and reorder points, and flags what to reorder and what to mark down.

## Project structure

```
target-stock-balancer/
├── index.html                 Website entry point (served by GitHub Pages)
├── frontend/
│   ├── css/style.css          Layout, typography, light and dark themes
│   └── js/
│       ├── engine.js          Maths, models, charts, page layout and AI analyst panel
│       └── model.js           Sample data and the algorithm for this problem (browser version)
├── app.py                     Streamlit dashboard (Python version of the website)
├── src/
│   ├── data_generator.py      Builds the sample dataset and saves it to data/
│   ├── model.py               The algorithm in Python (pandas, NumPy, scikit-learn)
│   ├── report.py              Writes results to reports/
│   ├── utils.py               Formatting and forecasting helpers
│   └── meta.json              Problem statement, company and algorithm steps
├── data/                      Sample data as CSV
├── reports/                   Results: results.json, summary.md and CSV tables
├── tests/test_model.py        pytest tests for the data and the model
├── requirements.txt
└── pytest.ini
```

## Algorithm

1. **Collect sales and stock data**: Weekly sales, seasonality, price, stock on hand and on order, lead times
2. **ABC-XYZ classification**: Revenue share (ABC) and demand variability (XYZ)
3. **Forecast demand**: Holt-Winters with 52-week seasonality, 12 weeks ahead
4. **Safety stock**: Service-level z × forecast error × √lead time
5. **Reorder point and quantity**: Lead-time demand + safety stock; EOQ for order size
6. **Flag slow and dead stock**: Weeks of supply above the excess limit
7. **Recommend actions**: Reorder, expedite, transfer or mark down
8. **Explain to buyers**: AI analyst writes the buyer notes

The same algorithm is implemented twice: in JavaScript (`frontend/js/model.js`) so the website runs in any browser with no server, and in Python (`src/model.py`) for analysis, the Streamlit dashboard and the tests.

## How to run

**Website:** open the live link above, or open `index.html` in a browser.

**Python:**

```bash
pip install -r requirements.txt
python -m src.data_generator     # create the sample data in data/
python -m src.model              # run the algorithm and write reports/
streamlit run app.py             # open the interactive dashboard
pytest                           # run the tests
```

## Data

60 SKUs across 6 departments in one distribution region, 104 weeks of sales, current stock and supplier lead times (sample data). Files: `data/skus.csv`, `data/weekly_sales.csv`. All figures are illustrative and are not Target Corporation's actual numbers.

## Results (default settings, Python run)

| Measure | Value | Note |
|---|---|---|
| Stockout risk | 17 SKUs | 9 out within lead time |
| Sales at risk | $67.3M | Before the next order lands |
| Excess stock | $34.6M | 15 SKUs over 20 weeks |
| Excess share | 17% | of $206.1M inventory at cost |

### Recommended actions

1. **Action figure: Expedite 2,273 units, transfer from nearby DCs.** AZ item. Stock covers 2.6 weeks but the supplier needs 10. Reorder point 2,570 units incl. 304 safety stock.
2. **Card game: Expedite 1,590 units, transfer from nearby DCs.** AZ item. Stock covers 1.6 weeks but the supplier needs 8. Reorder point 1,385 units incl. 74 safety stock.
3. **Sparkling water 12pk: Expedite 6,382 units, transfer from nearby DCs.** AX item. Stock covers 1.3 weeks but the supplier needs 9. Reorder point 4,343 units incl. 226 safety stock.
4. **Art kit: mark down 40%.** 63 weeks of supply. Cancel open orders (0 units) and move stock to outlet locations.
5. **Smart speaker: mark down 40%.** 41 weeks of supply. Cancel open orders (1,071 units) and move stock to outlet locations.

Full output: [`reports/summary.md`](reports/summary.md) and [`reports/results.json`](reports/results.json).

## AI analyst panel

The website includes an "Ask the AI analyst" panel that answers questions about the results through Claude. It works when the page is opened as a Claude artifact on claude.ai. On GitHub Pages the models, charts and controls run in full and the panel shows that it is unavailable.
