from src.price_estimation.estimator import estimate_price

tests = [
    ("Apple",   "phone",  24, 80000, 72, "good"),
    ("Samsung", "phone",  18, 45000, 25, "poor"),
    ("Dell",    "laptop", 30, 75000, 65, "good"),
    ("HP",      "laptop", 12, 55000, 85, "excellent"),
    ("OnePlus", "phone",  36, 35000, 20, "poor"),
]

print("\nML Model Predictions:")
for brand, cat, age, op, cs, cl in tests:
    r = estimate_price(brand, cat, age, op, cs, cl)
    print(f"  {brand:8} {cat:6} | age={age:2}mo | orig=Rs{op:6,} | cond={cl:9} ({cs:2}) => Rs{r.amount:6,}  range Rs{r.min_price:6,}–Rs{r.max_price:6,}")
print()
