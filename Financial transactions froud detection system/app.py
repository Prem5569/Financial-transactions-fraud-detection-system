"""
Financial Transaction Fraud Detection System
Flask Backend
"""

from flask import Flask, render_template, request, jsonify
import pickle
import numpy as np
import pandas as pd
import os
import random
import string
from datetime import datetime

app = Flask(__name__)

# Load model and scaler
BASE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE, "models/fraud_model.pkl"), "rb") as f:
    model = pickle.load(f)
with open(os.path.join(BASE, "models/scaler.pkl"), "rb") as f:
    scaler = pickle.load(f)

FEATURES = ["amount", "hour", "transaction_type", "merchant_category",
            "distance_from_home", "previous_fraud_flag", "num_transactions_1h"]

MERCHANT_LABELS = {0: "Grocery", 1: "Restaurant", 2: "Online Shopping", 3: "Travel", 4: "ATM/Cash"}
TRANSACTION_LABELS = {0: "Purchase", 1: "Transfer", 2: "Withdrawal"}

def generate_txn_id():
    return "TXN-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=10))

def get_risk_level(prob):
    if prob < 0.3:
        return "LOW", "#22c55e"
    elif prob < 0.6:
        return "MEDIUM", "#f59e0b"
    elif prob < 0.8:
        return "HIGH", "#ef4444"
    else:
        return "CRITICAL", "#7c3aed"

def get_risk_factors(data, prob):
    factors = []
    if data["amount"] > 1000:
        factors.append(f"High transaction amount (₹{data['amount']:,.0f})")
    if data["hour"] in list(range(0, 5)) or data["hour"] == 23:
        factors.append(f"Unusual transaction time ({data['hour']:02d}:00 hrs)")
    if data["distance_from_home"] > 80:
        factors.append(f"Large distance from home ({data['distance_from_home']:.0f} km)")
    if data["previous_fraud_flag"] == 1:
        factors.append("Previous fraud flag on account")
    if data["num_transactions_1h"] >= 5:
        factors.append(f"High transaction frequency ({data['num_transactions_1h']} in 1 hour)")
    if data["transaction_type"] == 1:
        factors.append("Transfer transaction type (higher risk category)")
    if not factors and prob > 0.4:
        factors.append("Unusual combination of transaction attributes")
    return factors

# In-memory transaction history
transaction_history = []

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    try:
        payload = request.get_json()
        data = {
            "amount":               float(payload["amount"]),
            "hour":                 int(payload["hour"]),
            "transaction_type":     int(payload["transaction_type"]),
            "merchant_category":    int(payload["merchant_category"]),
            "distance_from_home":   float(payload["distance_from_home"]),
            "previous_fraud_flag":  int(payload["previous_fraud_flag"]),
            "num_transactions_1h":  int(payload["num_transactions_1h"]),
        }

        X = pd.DataFrame([[data[f] for f in FEATURES]], columns=FEATURES)
        X_scaled = scaler.transform(X)

        proba = model.predict_proba(X_scaled)[0][1]
        is_fraud = proba >= 0.5
        risk_level, risk_color = get_risk_level(proba)
        risk_factors = get_risk_factors(data, proba)

        txn = {
            "txn_id":       generate_txn_id(),
            "timestamp":    datetime.now().strftime("%d %b %Y, %H:%M:%S"),
            "amount":       data["amount"],
            "type":         TRANSACTION_LABELS.get(data["transaction_type"], "Unknown"),
            "merchant":     MERCHANT_LABELS.get(data["merchant_category"], "Unknown"),
            "fraud_prob":   round(proba * 100, 2),
            "is_fraud":     bool(is_fraud),
            "risk_level":   risk_level,
            "risk_color":   risk_color,
            "risk_factors": risk_factors,
        }
        transaction_history.insert(0, txn)
        if len(transaction_history) > 50:
            transaction_history.pop()

        return jsonify({
            "success":      True,
            "txn_id":       txn["txn_id"],
            "timestamp":    txn["timestamp"],
            "fraud_prob":   txn["fraud_prob"],
            "is_fraud":     txn["is_fraud"],
            "risk_level":   txn["risk_level"],
            "risk_color":   txn["risk_color"],
            "risk_factors": txn["risk_factors"],
            "merchant":     txn["merchant"],
            "type":         txn["type"],
            "amount":       txn["amount"],
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route("/history")
def history():
    return jsonify(transaction_history[:20])

@app.route("/stats")
def stats():
    total = len(transaction_history)
    if total == 0:
        return jsonify({"total": 0, "fraud": 0, "legit": 0, "fraud_rate": 0})
    fraud = sum(1 for t in transaction_history if t["is_fraud"])
    legit = total - fraud
    return jsonify({
        "total":      total,
        "fraud":      fraud,
        "legit":      legit,
        "fraud_rate": round(fraud / total * 100, 1),
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
