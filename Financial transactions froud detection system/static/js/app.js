/* ===== FRAUDSHIELD JS ===== */

// ──────── GAUGE CANVAS ────────
function drawGauge(pct, color) {
  const canvas = document.getElementById("gauge-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const cx = 55, cy = 55, r = 40, lw = 9;
  ctx.clearRect(0, 0, 110, 110);

  // Track
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
  ctx.strokeStyle = "#1a2233"; ctx.lineWidth = lw;
  ctx.lineCap = "round"; ctx.stroke();

  // Fill
  const angle = Math.PI + (Math.PI * Math.min(pct, 100) / 100);
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, angle);
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.lineCap = "round"; ctx.stroke();

  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, angle);
  ctx.strokeStyle = color + "80"; ctx.lineWidth = 3;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// ──────── TOAST ────────
let toastTimer = null;
function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (isError ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = "toast"; }, 3200);
}

// ──────── SAMPLE DATA ────────
function fillSample(type) {
  if (type === "fraud") {
    document.getElementById("amount").value = "28500";
    document.getElementById("hour").value = "2";
    document.getElementById("transaction_type").value = "1";
    document.getElementById("merchant_category").value = "2";
    document.getElementById("distance_from_home").value = "340";
    document.getElementById("num_transactions_1h").value = "12";
    document.querySelector('input[name="prev_fraud"][value="1"]').checked = true;
    showToast("⚠ Fraud sample loaded — click Analyze");
  } else {
    document.getElementById("amount").value = "850";
    document.getElementById("hour").value = "14";
    document.getElementById("transaction_type").value = "0";
    document.getElementById("merchant_category").value = "0";
    document.getElementById("distance_from_home").value = "8";
    document.getElementById("num_transactions_1h").value = "2";
    document.querySelector('input[name="prev_fraud"][value="0"]').checked = true;
    showToast("✓ Legit sample loaded — click Analyze");
  }
}

// ──────── ANALYZE ────────
async function analyzeTransaction() {
  const amount = parseFloat(document.getElementById("amount").value);
  const hour   = parseInt(document.getElementById("hour").value);
  const dist   = parseFloat(document.getElementById("distance_from_home").value);
  const freq   = parseInt(document.getElementById("num_transactions_1h").value);

  if (isNaN(amount) || amount <= 0) return showToast("Enter a valid amount", true);
  if (isNaN(hour) || hour < 0 || hour > 23) return showToast("Hour must be 0–23", true);
  if (isNaN(dist) || dist < 0) return showToast("Enter a valid distance", true);
  if (isNaN(freq) || freq < 0) return showToast("Enter valid transaction count", true);

  const btn = document.getElementById("analyze-btn");
  btn.classList.add("loading");

  const payload = {
    amount,
    hour,
    transaction_type:    parseInt(document.getElementById("transaction_type").value),
    merchant_category:   parseInt(document.getElementById("merchant_category").value),
    distance_from_home:  dist,
    previous_fraud_flag: parseInt(document.querySelector('input[name="prev_fraud"]:checked').value),
    num_transactions_1h: freq,
  };

  try {
    const res  = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.error || "Server error");

    renderResult(data);
    loadHistory();
    updateHeaderStats();

  } catch (err) {
    showToast("Error: " + err.message, true);
  } finally {
    btn.classList.remove("loading");
  }
}

// ──────── RENDER RESULT ────────
function renderResult(d) {
  const ph = document.getElementById("result-placeholder");
  const rc = document.getElementById("result-content");
  ph.style.display = "none";
  rc.classList.remove("hidden");

  const pct    = d.fraud_prob;
  const color  = d.risk_color;
  const rp     = document.getElementById("result-panel");

  // Verdict
  const vEl = document.getElementById("result-verdict");
  if (d.is_fraud) {
    vEl.textContent = "🚨 FRAUD DETECTED";
    vEl.style.color = "#ef4444";
    rp.style.borderColor = "rgba(239,68,68,0.35)";
    rp.style.boxShadow   = "0 0 30px rgba(239,68,68,0.08)";
    rp.className = "panel result-panel";
  } else {
    vEl.textContent = "✅ TRANSACTION SAFE";
    vEl.style.color = "#22c55e";
    rp.style.borderColor = "rgba(34,197,94,0.25)";
    rp.style.boxShadow   = "0 0 30px rgba(34,197,94,0.06)";
    rp.className = "panel result-panel state-safe";
  }

  document.getElementById("result-txn-id").textContent = d.txn_id + " · " + d.timestamp;

  // Gauge  (animated from 0)
  let current = 0;
  const target = pct;
  const step = target / 40;
  document.getElementById("gauge-pct").textContent = "0%";
  document.getElementById("gauge-pct").style.color  = color;

  const anim = setInterval(() => {
    current = Math.min(current + step, target);
    drawGauge(current, color);
    document.getElementById("gauge-pct").textContent = Math.round(current) + "%";
    if (current >= target) clearInterval(anim);
  }, 18);

  // Risk bar
  const fill = document.getElementById("risk-bar-fill");
  fill.style.width = "0%";
  fill.style.background = pct < 30
    ? "linear-gradient(90deg,#22c55e,#16a34a)"
    : pct < 60
    ? "linear-gradient(90deg,#f59e0b,#d97706)"
    : pct < 80
    ? "linear-gradient(90deg,#ef4444,#dc2626)"
    : "linear-gradient(90deg,#a855f7,#7c3aed)";
  setTimeout(() => { fill.style.width = pct + "%"; }, 80);
  document.getElementById("risk-score-val").textContent = pct + "%";

  // Meta tags
  const meta = document.getElementById("result-meta");
  meta.innerHTML = `
    <div class="meta-tag"><span>₹</span>${Number(d.amount).toLocaleString("en-IN", {maximumFractionDigits:2})}</div>
    <div class="meta-tag"><span>Type</span>${d.type}</div>
    <div class="meta-tag"><span>Merchant</span>${d.merchant}</div>
    <div class="meta-tag" style="color:${color};border-color:${color}40"><span>Risk</span>${d.risk_level}</div>
  `;

  // Risk factors
  const rfs = document.getElementById("risk-factors-section");
  const rfList = document.getElementById("rf-list");
  const rfTitle = rfs.querySelector(".rf-title");

  if (d.risk_factors && d.risk_factors.length > 0) {
    rfTitle.textContent = d.is_fraud
      ? "⚠ Risk Signals Detected"
      : "ℹ Minor Risk Signals (Non-Critical)";
    rfList.innerHTML = d.risk_factors.map(f => `<li>${f}</li>`).join("");
    rfs.style.display = "block";
  } else {
    rfTitle.textContent = "✓ No Risk Signals Detected";
    rfList.innerHTML = "<li>This transaction looks normal — no suspicious patterns found.</li>";
    rfs.style.display = "block";
  }

  showToast(d.is_fraud ? "⚠ Fraud transaction flagged!" : "✓ Transaction cleared as safe");
}

// ──────── HISTORY ────────
async function loadHistory() {
  try {
    const res  = await fetch("/history");
    const data = await res.json();
    const tbody = document.getElementById("history-body");

    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No transactions yet</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(t => `
      <tr>
        <td class="txn-id-cell">${t.txn_id}</td>
        <td class="amount-cell">₹${Number(t.amount).toLocaleString("en-IN", {maximumFractionDigits:2})}</td>
        <td>${t.type}</td>
        <td><span class="badge badge-${t.risk_level.toLowerCase()}">${t.risk_level}</span></td>
        <td><span class="badge ${t.is_fraud ? "badge-fraud" : "badge-legit"}">${t.is_fraud ? "FRAUD" : "LEGIT"}</span></td>
      </tr>
    `).join("");
  } catch (e) {
    console.error("History load error:", e);
  }
}

// ──────── HEADER STATS ────────
async function updateHeaderStats() {
  try {
    const res  = await fetch("/stats");
    const data = await res.json();
    document.getElementById("hs-total").textContent = data.total;
    document.getElementById("hs-fraud").textContent = data.fraud;
    document.getElementById("hs-legit").textContent = data.legit;
  } catch (e) {}
}

// ──────── ENTER KEY ────────
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.tagName !== "BUTTON") {
    analyzeTransaction();
  }
});

// Init
loadHistory();
updateHeaderStats();
