# 🛡️ FraudShield — Financial Transaction Fraud Detection System

A full-stack fraud detection web app built with Python (Flask) + ML (Random Forest) + HTML/CSS/JS.

---

## 📁 Project Structure

```
fraud_detection/
├── app.py                 ← Flask backend (routes + ML inference)
├── train_model.py         ← Script to train & save the model
├── models/
│   ├── fraud_model.pkl    ← Trained Random Forest model
│   └── scaler.pkl         ← StandardScaler for features
├── templates/
│   └── index.html         ← Main UI page
├── static/
│   ├── css/style.css      ← Dark cyberpunk UI styles
│   └── js/app.js          ← Frontend logic (gauge, API calls, history)
└── README.md
```

---

## ⚙️ Setup & Run

### 1. Install dependencies
```bash
pip install flask scikit-learn pandas numpy
```

### 2. Train the model (run once)
```bash
python train_model.py
```

### 3. Start the Flask server
```bash
python app.py
```

### 4. Open browser
```
http://localhost:5000
```

---

## 🧠 How It Works

### Machine Learning Model
- **Algorithm:** Random Forest Classifier (100 trees)
- **Training Data:** 5000 synthetic transactions (93% legit, 7% fraud)
- **Features Used:**
  | Feature | Description |
  |---|---|
  | amount | Transaction amount in ₹ |
  | hour | Hour of transaction (0–23) |
  | transaction_type | Purchase / Transfer / Withdrawal |
  | merchant_category | Grocery / Restaurant / Online / Travel / ATM |
  | distance_from_home | Distance from user's home location (km) |
  | previous_fraud_flag | Has account had fraud before? (0/1) |
  | num_transactions_1h | How many transactions in last 1 hour |

### Risk Levels
| Fraud Probability | Risk Level |
|---|---|
| 0–30% | 🟢 LOW |
| 30–60% | 🟡 MEDIUM |
| 60–80% | 🔴 HIGH |
| 80–100% | 🟣 CRITICAL |

### API Endpoints
| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Main UI page |
| `/predict` | POST | Analyze transaction, returns fraud probability |
| `/history` | GET | Last 20 transactions analyzed |
| `/stats` | GET | Total / fraud / legit counts |

---

## 🚨 Fraud Signals Detected
- High transaction amount (> ₹1000)
- Unusual hour (midnight to 4 AM)
- Large distance from home (> 80 km)
- Previous fraud flag on account
- High transaction frequency (5+ in 1 hour)
- Transfer transaction type

---

## 💡 Sample Test Cases

**Fraud Sample:**
- Amount: ₹28,500 | Hour: 2 AM | Transfer | Online Shopping | 340 km | Previous fraud: Yes | 12 txns/hr

**Legit Sample:**
- Amount: ₹850 | Hour: 2 PM | Purchase | Grocery | 8 km | Previous fraud: No | 2 txns/hr

---

## 🛠️ Tech Stack
- **Backend:** Python, Flask
- **ML:** Scikit-learn (Random Forest), NumPy, Pandas
- **Frontend:** Vanilla HTML5, CSS3, JavaScript (no frameworks)
- **UI Style:** Dark cyber-intelligence theme with canvas gauge animation
