"""
Train and save the fraud detection model using synthetic data.
Run this once before starting the Flask app.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import pickle
import os

# Always save relative to this script's location, not the working directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

np.random.seed(42)
N = 5000

# Legitimate transactions
legit_count = int(N * 0.93)
fraud_count = N - legit_count

legit = pd.DataFrame({
    "amount":          np.random.lognormal(4.0, 1.2, legit_count),
    "hour":            np.random.randint(6, 23, legit_count),
    "transaction_type": np.random.choice([0, 1, 2], legit_count, p=[0.5, 0.3, 0.2]),
    "merchant_category": np.random.choice([0, 1, 2, 3, 4], legit_count),
    "distance_from_home": np.random.exponential(15, legit_count),
    "previous_fraud_flag": np.zeros(legit_count),
    "num_transactions_1h": np.random.randint(1, 5, legit_count),
    "label": 0
})

# Fraudulent transactions  — different distributions
fraud = pd.DataFrame({
    "amount":          np.random.lognormal(5.5, 1.5, fraud_count),
    "hour":            np.random.choice(list(range(0, 5)) + list(range(23, 24)), fraud_count),
    "transaction_type": np.random.choice([0, 1, 2], fraud_count, p=[0.15, 0.6, 0.25]),
    "merchant_category": np.random.choice([0, 1, 2, 3, 4], fraud_count, p=[0.05, 0.05, 0.6, 0.15, 0.15]),
    "distance_from_home": np.random.exponential(120, fraud_count),
    "previous_fraud_flag": np.random.choice([0, 1], fraud_count, p=[0.4, 0.6]),
    "num_transactions_1h": np.random.randint(5, 20, fraud_count),
    "label": 1
})

df = pd.concat([legit, fraud]).sample(frac=1, random_state=42).reset_index(drop=True)
features = ["amount", "hour", "transaction_type", "merchant_category",
            "distance_from_home", "previous_fraud_flag", "num_transactions_1h"]

X = df[features]
y = df["label"]

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, class_weight="balanced")
model.fit(X_scaled, y)

os.makedirs(os.path.join(BASE_DIR, "models"), exist_ok=True)
with open(os.path.join(BASE_DIR, "models/fraud_model.pkl"), "wb") as f:
    pickle.dump(model, f)
with open(os.path.join(BASE_DIR, "models/scaler.pkl"), "wb") as f:
    pickle.dump(scaler, f)

print("✅ Model trained and saved!")
print(f"   Training accuracy: {model.score(X_scaled, y):.3f}")
print(f"   Features: {features}")
