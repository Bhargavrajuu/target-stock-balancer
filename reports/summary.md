# Target Stock Balancer: results

Built for Target Corporation. Prepared by K Bhargav Raju.

## Key figures

- **Stockout risk:** 17 SKUs (9 out within lead time)
- **Sales at risk:** $67.3M (Before the next order lands)
- **Excess stock:** $34.6M (15 SKUs over 20 weeks)
- **Excess share:** 17% (of $206.1M inventory at cost)

## Algorithm, as it ran

1. **Collect sales and stock data**: 60 SKUs x 104 weeks, $1.54B annual chain revenue
2. **ABC-XYZ classification**: A items: 29, Z items: 10
3. **Forecast demand**: Holt-Winters forecast error averages 33% of weekly demand
4. **Safety stock**: z = 1.88 for 97.0% service
5. **Reorder point and quantity**: 17 SKUs below reorder point
6. **Flag slow and dead stock**: 15 SKUs above 20 weeks of supply
7. **Recommend actions**: 32 actions
8. **Explain to buyers**: Ready

## Recommended actions

1. **Action figure: Expedite 2,273 units, transfer from nearby DCs.** AZ item. Stock covers 2.6 weeks but the supplier needs 10. Reorder point 2,570 units incl. 304 safety stock. *Impact: $21.9M at risk*
2. **Card game: Expedite 1,590 units, transfer from nearby DCs.** AZ item. Stock covers 1.6 weeks but the supplier needs 8. Reorder point 1,385 units incl. 74 safety stock. *Impact: $9.3M at risk*
3. **Sparkling water 12pk: Expedite 6,382 units, transfer from nearby DCs.** AX item. Stock covers 1.3 weeks but the supplier needs 9. Reorder point 4,343 units incl. 226 safety stock. *Impact: $7.8M at risk*
4. **Art kit: mark down 40%.** 63 weeks of supply. Cancel open orders (0 units) and move stock to outlet locations. *Impact: $9.9M freed*
5. **Smart speaker: mark down 40%.** 41 weeks of supply. Cancel open orders (1,071 units) and move stock to outlet locations. *Impact: $5.3M freed*
6. **Plush bear: mark down 40%.** 48 weeks of supply. Cancel open orders (0 units) and move stock to outlet locations. *Impact: $4.8M freed*
7. **Set safety stock by class at 97.0% service.** Hold the higher service level for AX and AY items and accept lower service on CZ items. *Impact: Policy*

_Generated from sample data. Figures are illustrative._
