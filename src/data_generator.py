"""Sample data for Target: 60 SKUs in 6 departments, 104 weeks of sales, stock positions and lead times."""
from pathlib import Path

import numpy as np
import pandas as pd

DEPTS = {"Home": ["Throw pillow", "Area rug 5x7", "Ceramic vase", "Wall mirror", "Bath towel set", "Table lamp", "Storage bin", "Bedding set", "Candle 3-wick", "Patio chair"],
         "Apparel": ["Women's denim", "Men's tee 3pk", "Kids hoodie", "Leggings", "Rain jacket", "Swim shorts", "Sneakers", "Socks 6pk", "Winter coat", "Dress"],
         "Electronics": ["Wireless earbuds", "Smart speaker", "Phone charger", "HDMI cable", "Tablet case", "Gaming headset", "Smart bulb 4pk", "Power bank", "Webcam", "TV wall mount"],
         "Grocery": ["Coffee pods 24ct", "Protein bars", "Sparkling water 12pk", "Cereal family size", "Snack mix", "Pasta sauce", "Olive oil", "Granola", "Frozen pizza", "Trail mix"],
         "Toys": ["Building bricks set", "Plush bear", "Board game", "RC car", "Doll house", "Puzzle 1000pc", "Art kit", "Action figure", "Card game", "Ride-on scooter"],
         "Beauty": ["Moisturizer", "Shampoo", "Lip balm 3pk", "Sunscreen SPF50", "Face mask 5pk", "Body wash", "Nail polish", "Hair dryer", "Perfume", "Razor kit"]}
SEASON = {"Home": (0.2, 10), "Apparel": (0.35, 20), "Electronics": (0.45, 47), "Grocery": (0.08, 47), "Toys": (0.9, 48), "Beauty": (0.25, 22)}
PRICE = {"Home": (15, 120), "Apparel": (12, 90), "Electronics": (10, 150), "Grocery": (3, 15), "Toys": (8, 80), "Beauty": (5, 60)}


def generate(seed: int = 42) -> dict:
    rng = np.random.default_rng(seed)
    skus, sales = [], {"week": np.arange(1, 105)}
    n = 0
    for dept, items in DEPTS.items():
        for name in items:
            price = rng.uniform(*PRICE[dept]); base = max(5, 2400 / price * np.exp(rng.normal(0, 0.9)))
            u = rng.random()
            trend = rng.uniform(-0.6, -0.3) if u < 0.25 else rng.uniform(0.3, 0.8) if u < 0.5 else rng.uniform(-0.1, 0.1)
            amp, peak = SEASON[dept]; noise = rng.uniform(0.06, 0.35)
            w = np.arange(104)
            y = np.maximum(0, np.round(base * (1 + trend * w / 104) * (1 + amp * np.cos(2 * np.pi * (w - peak) / 52)) * (1 + rng.normal(0, noise, 104))))
            recent = y[-8:].mean()
            on_hand = round(recent * (rng.uniform(18, 40) if trend < -0.2 else rng.uniform(0.8, 3) if trend > 0.25 else rng.uniform(7, 16)))
            planned = base * (1 + (0.1 if trend < -0.2 else 0.3 if trend > 0.2 else trend))
            sku = f"{dept[:3].upper()}-{1000 + n}"; n += 1
            sales[sku] = y.astype(int)
            skus.append({"sku": sku, "item": name, "department": dept, "price": round(price, 2), "unit_cost": round(price * rng.uniform(0.45, 0.65), 2),
                         "lead_time_weeks": int(rng.integers(2, 11)), "on_hand": int(on_hand), "on_order": int(round(planned * rng.uniform(1, 4))) if rng.random() < 0.5 else 0})
    return {"skus": pd.DataFrame(skus), "weekly_sales": pd.DataFrame(sales)}


# ---------------------------------------------------------------------------
# Save and load helpers
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def save(data: dict, folder: Path = DATA_DIR) -> None:
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    for name, df in data.items():
        df.to_csv(folder / f"{name}.csv", index=False)


def load_or_generate(folder: Path = DATA_DIR, seed: int = 42) -> dict:
    """Read the CSVs in data/ if they exist, otherwise generate fresh sample data."""
    folder = Path(folder)
    names = list(generate(seed).keys())
    if all((folder / f"{n}.csv").exists() for n in names):
        return {n: pd.read_csv(folder / f"{n}.csv") for n in names}
    return generate(seed)


if __name__ == "__main__":
    d = generate(42)
    save(d)
    for n, df in d.items():
        print(f"data/{n}.csv  {len(df):,} rows x {df.shape[1]} columns")
