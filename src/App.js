    // ============================================================
// SmartFeedAnalysis.jsx — تبويب التحليل الذكي للأعلاف
// ادمج هذا الكومبوننت في صفحة إدارة الأعلاف الحالية
// ============================================================
//
// كيفية الاستخدام:
//   import SmartFeedAnalysis from './SmartFeedAnalysis';
//   <SmartFeedAnalysis db={db} />
//
// هيكل Firestore المطلوب:
//   feedPurchases (collection)
//     └── {docId}
//           feedName: "شعير"
//           date: Timestamp
//           bags: 50
//           bagWeightKg: 50
//           pricePerBag: 69
//
// ملاحظة: الكومبوننت يحتوي بيانات تجريبية — احذف mockPurchases
//         واستبدل بـ fetchFromFirebase عند الدمج الفعلي
// ============================================================

import { useState, useEffect, useMemo } from "react";

// ── خوارزمية الاستهلاك الذكي ──────────────────────────────
function calcSmartRate(purchases) {
  // purchases: مصفوفة مرتبة تصاعدياً حسب التاريخ
  // { date: Date, bags: number }
  if (purchases.length < 2) return null;

  const intervals = [];
  for (let i = 1; i < purchases.length; i++) {
    const prev = purchases[i - 1];
    const curr = purchases[i];
    const days = (curr.date - prev.date) / (1000 * 60 * 60 * 24);
    if (days > 0) {
      intervals.push({ consumedBags: prev.bags, days });
    }
  }
  if (!intervals.length) return null;

  // معدل مرجّح: مجموع الأكياس المستهلكة ÷ مجموع الأيام
  const totalBags = intervals.reduce((s, x) => s + x.consumedBags, 0);
  const totalDays = intervals.reduce((s, x) => s + x.days, 0);
  return totalBags / totalDays; // أكياس/يوم
}

function predictNextPurchase(currentBags, ratePerDay) {
  if (!ratePerDay || ratePerDay <= 0) return null;
  const daysLeft = currentBags / ratePerDay;
  const purchaseDate = new Date();
  purchaseDate.setDate(purchaseDate.getDate() + Math.floor(daysLeft));
  return { daysLeft, purchaseDate };
}

// ── بيانات تجريبية (احذفها عند الربط بـ Firebase) ─────────
const mockPurchases = [
  {
    feedName: "شعير", bagWeightKg: 50, pricePerBag: 69,
    history: [
      { date: new Date("2025-10-01"), bags: 50 },
      { date: new Date("2025-11-14"), bags: 50 },
      { date: new Date("2026-01-03"), bags: 50 },
      { date: new Date("2026-03-08"), bags: 50 },   // ← آخر شراء
    ]
  },
  {
    feedName: "برسيم", bagWeightKg: 30, pricePerBag: 25,
    history: [
      { date: new Date("2025-10-10"), bags: 60 },
      { date: new Date("2025-12-01"), bags: 78 },
      { date: new Date("2026-02-15"), bags: 78 },   // ← آخر شراء
    ]
  },
  {
    feedName: "رودس", bagWeightKg: 30, pricePerBag: 20,
    history: [
      { date: new Date("2025-11-01"), bags: 40 },
      { date: new Date("2026-01-20"), bags: 75 },   // ← آخر شراء
    ]
  },
  {
    feedName: "ذرة", bagWeightKg: 50, pricePerBag: 55,
    history: [
      { date: new Date("2025-09-15"), bags: 30 },
      { date: new Date("2025-11-10"), bags: 30 },
      { date: new Date("2026-01-05"), bags: 30 },
      { date: new Date("2026-03-20"), bags: 30 },   // ← آخر شراء
    ]
  },
  {
    feedName: "نخالة", bagWeightKg: 40, pricePerBag: 35,
    history: [
      { date: new Date("2025-12-01"), bags: 20 },
      { date: new Date("2026-02-01"), bags: 20 },   // ← آخر شراء
    ]
  },
  {
    feedName: "مركز", bagWeightKg: 25, pricePerBag: 95,
    history: [
      { date: new Date("2025-10-20"), bags: 40 },
      { date: new Date("2025-12-10"), bags: 40 },
      { date: new Date("2026-02-05"), bags: 40 },   // ← آخر شراء
    ]
  },
];

// ── دالة جلب Firebase (فعّلها بدل mockPurchases) ──────────
// async function fetchFromFirebase(db) {
//   const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
//   const q = query(collection(db, "feedPurchases"), orderBy("feedName"), orderBy("date"));
//   const snap = await getDocs(q);
//   const grouped = {};
//   snap.forEach(doc => {
//     const d = doc.data();
//     if (!grouped[d.feedName]) grouped[d.feedName] = { feedName: d.feedName, bagWeightKg: d.bagWeightKg, pricePerBag: d.pricePerBag, history: [] };
//     grouped[d.feedName].history.push({ date: d.date.toDate(), bags: d.bags });
//   });
//   return Object.values(grouped).map(f => ({
//     ...f,
//     history: f.history.sort((a,b) => a.date - b.date)
//   }));
// }

// ── دوال مساعدة ──────────────────────────────────────────
const fmtDate = (d) => d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
const fmtNum = (n, dec = 1) => Number(n).toFixed(dec);

function getUrgencyLevel(daysLeft) {
  if (daysLeft === null) return "unknown";
  if (daysLeft <= 7)  return "critical";
  if (daysLeft <= 20) return "warning";
  return "ok";
}

// ── CSS داخلي (يتوافق مع RTL وألوان التطبيق) ──────────────
const styles = {
  wrap: { fontFamily: "inherit", direction: "rtl", padding: "0 0 2rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", marginTop: "1rem" },
  card: { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", position: "relative", overflow: "hidden" },
  cardCritical: { borderColor: "#E24B4A", borderWidth: "1.5px" },
  cardWarning:  { borderColor: "#BA7517", borderWidth: "1.5px" },
  accentBar: { position: "absolute", top: 0, right: 0, width: "4px", height: "100%", borderRadius: "0 12px 12px 0" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" },
  label: { fontSize: "13px", color: "var(--color-text-secondary)" },
  value: { fontSize: "14px", fontWeight: 500, color: "var(--color-text-primary)" },
  badge: { fontSize: "11px", padding: "3px 10px", borderRadius: "999px", fontWeight: 500 },
  divider: { height: "0.5px", background: "var(--color-border-tertiary)", margin: "12px 0" },
  metricGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" },
  metricBox: { background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 12px" },
  metricLabel: { fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "4px" },
  metricVal: { fontSize: "18px", fontWeight: 500, color: "var(--color-text-primary)" },
  metricUnit: { fontSize: "11px", color: "var(--color-text-secondary)", marginRight: "2px" },
  alertBox: { borderRadius: "var(--border-radius-md)", padding: "10px 14px", fontSize: "13px", display: "flex", alignItems: "flex-start", gap: "8px", marginTop: "10px" },
  historyRow: { display: "flex", gap: "6px", alignItems: "center", fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "4px" },
  dot: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "1.5rem" },
  summaryCard: { background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "1rem", textAlign: "center" },
  summaryNum: { fontSize: "28px", fontWeight: 500 },
  summaryLbl: { fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "4px" },
};

const urgencyColors = {
  critical: { bg: "#FCEBEB", text: "#A32D2D", border: "#E24B4A", bar: "#E24B4A", badge: { background: "#FCEBEB", color: "#A32D2D" }, alertBg: "#FCEBEB" },
  warning:  { bg: "#FAEEDA", text: "#854F0B", border: "#BA7517", bar: "#EF9F27", badge: { background: "#FAEEDA", color: "#854F0B" }, alertBg: "#FAEEDA" },
  ok:       { bg: "#EAF3DE", text: "#3B6D11", border: "#639922", bar: "#97C459", badge: { background: "#EAF3DE", color: "#3B6D11" }, alertBg: "#EAF3DE" },
  unknown:  { bg: "#F1EFE8", text: "#5F5E5A", border: "#888780", bar: "#B4B2A9", badge: { background: "#F1EFE8", color: "#5F5E5A" }, alertBg: "#F1EFE8" },
};

// ── الكومبوننت الرئيسي ────────────────────────────────────
export default function SmartFeedAnalysis({ db }) {
  const [feedData, setFeedData] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    // ── استبدل هذا بـ fetchFromFirebase(db) عند الربط الفعلي ──
    setTimeout(() => {
      setFeedData(mockPurchases);
      setLoading(false);
    }, 400);
    // ────────────────────────────────────────────────────────────
    // (async () => {
    //   const data = await fetchFromFirebase(db);
    //   setFeedData(data);
    //   setLoading(false);
    // })();
  }, []);

  const analyzed = useMemo(() => {
    return feedData.map(feed => {
      const sorted    = [...feed.history].sort((a, b) => a.date - b.date);
      const lastPurch = sorted[sorted.length - 1];
      const smartRate = calcSmartRate(sorted);
      const naiveRate = 3; // الاستهلاك اليومي الثابت المدخل يدوياً (أكياس/يوم)
      const prediction = smartRate ? predictNextPurchase(lastPurch.bags, smartRate) : null;
      const urgency   = getUrgencyLevel(prediction?.daysLeft ?? null);

      // تكلفة الشراء القادم المتوقعة
      const nextPurchaseBags = Math.ceil((smartRate || naiveRate) * 30); // شراء شهري
      const estimatedCost    = nextPurchaseBags * feed.pricePerBag;

      return {
        ...feed,
        sorted,
        lastPurch,
        smartRate,
        naiveRate,
        prediction,
        urgency,
        nextPurchaseBags,
        estimatedCost,
      };
    });
  }, [feedData]);

  const criticalCount = analyzed.filter(f => f.urgency === "critical").length;
  const warningCount  = analyzed.filter(f => f.urgency === "warning").length;
  const totalAlerts   = criticalCount + warningCount;

  if (loading) return (
    <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
      جاري تحليل بيانات المشتريات…
    </div>
  );

  return (
    <div style={styles.wrap}>
      <h2 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "1rem", color: "var(--color-text-primary)" }}>
        التحليل الذكي للاستهلاك والتوقعات
      </h2>

      {/* ملخص علوي */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryNum, color: totalAlerts > 0 ? "#A32D2D" : "#3B6D11" }}>{totalAlerts}</div>
          <div style={styles.summaryLbl}>تنبيه نشط</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryNum, color: "#185FA5" }}>{analyzed.length}</div>
          <div style={styles.summaryLbl}>أنواع الأعلاف</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryNum, color: "#854F0B" }}>
            {analyzed.filter(f => f.prediction).reduce((s, f) => s + Math.ceil(f.prediction.daysLeft), 0)}
          </div>
          <div style={styles.summaryLbl}>إجمالي أيام الرصيد</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryNum, color: "#3B6D11", fontSize: "20px" }}>
            {analyzed.filter(f => f.prediction).reduce((s, f) => s + f.estimatedCost, 0).toLocaleString("ar-SA")} ر
          </div>
          <div style={styles.summaryLbl}>توقع المشتريات القادمة / شهر</div>
        </div>
      </div>

      {/* بطاقات الأعلاف */}
      <div style={styles.grid}>
        {analyzed.map(feed => {
          const c = urgencyColors[feed.urgency];
          const isOpen = expanded === feed.feedName;
          return (
            <div
              key={feed.feedName}
              style={{
                ...styles.card,
                ...(feed.urgency === "critical" ? styles.cardCritical :
                    feed.urgency === "warning"  ? styles.cardWarning  : {})
              }}
            >
              {/* شريط اللون الجانبي */}
              <div style={{ ...styles.accentBar, background: c.bar }} />

              {/* رأس البطاقة */}
              <div style={{ ...styles.row, marginBottom: "8px", paddingRight: "8px" }}>
                <span style={{ fontSize: "15px", fontWeight: 500 }}>{feed.feedName}</span>
                <span style={{ ...styles.badge, ...c.badge }}>
                  {feed.urgency === "critical" ? "⚠ عاجل"  :
                   feed.urgency === "warning"  ? "تنبيه"   :
                   feed.urgency === "ok"       ? "✓ مطمئن" : "غير محدد"}
                </span>
              </div>

              {/* المقاييس الأربعة */}
              <div style={styles.metricGrid}>
                <div style={styles.metricBox}>
                  <div style={styles.metricLabel}>معدل استهلاك ذكي</div>
                  <div style={styles.metricVal}>
                    {feed.smartRate ? fmtNum(feed.smartRate, 2) : "—"}
                    <span style={styles.metricUnit}> كيس/يوم</span>
                  </div>
                </div>
                <div style={styles.metricBox}>
                  <div style={styles.metricLabel}>آخر شراء (أكياس)</div>
                  <div style={styles.metricVal}>
                    {feed.lastPurch.bags}
                    <span style={styles.metricUnit}> كيس</span>
                  </div>
                </div>
                <div style={styles.metricBox}>
                  <div style={styles.metricLabel}>أيام الرصيد المتبقية</div>
                  <div style={{
                    ...styles.metricVal,
                    color: feed.urgency === "critical" ? "#A32D2D" :
                           feed.urgency === "warning"  ? "#854F0B" : "var(--color-text-primary)"
                  }}>
                    {feed.prediction ? Math.floor(feed.prediction.daysLeft) : "—"}
                    <span style={styles.metricUnit}> يوم</span>
                  </div>
                </div>
                <div style={styles.metricBox}>
                  <div style={styles.metricLabel}>تاريخ الشراء القادم</div>
                  <div style={{ ...styles.metricVal, fontSize: "12px", lineHeight: 1.4 }}>
                    {feed.prediction ? fmtDate(feed.prediction.purchaseDate) : "—"}
                  </div>
                </div>
              </div>

              {/* مقارنة المعدل الذكي vs اليدوي */}
              {feed.smartRate && (
                <div style={{ marginTop: "10px", padding: "8px 10px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  المعدل المدخل يدوياً {fmtNum(feed.naiveRate, 1)} كيس/يوم ←
                  المعدل الفعلي الذكي <strong style={{ color: "var(--color-text-primary)" }}>{fmtNum(feed.smartRate, 2)} كيس/يوم</strong>
                  {feed.smartRate > feed.naiveRate
                    ? <span style={{ color: "#A32D2D" }}> (الاستهلاك أعلى مما هو مسجّل!)</span>
                    : <span style={{ color: "#3B6D11" }}> (الاستهلاك أقل من المسجّل)</span>
                  }
                </div>
              )}

              {/* صندوق التنبيه */}
              {(feed.urgency === "critical" || feed.urgency === "warning") && feed.prediction && (
                <div style={{ ...styles.alertBox, background: c.alertBg, color: c.text }}>
                  <span style={{ fontSize: "16px" }}>{feed.urgency === "critical" ? "🔴" : "🟡"}</span>
                  <span>
                    {feed.urgency === "critical"
                      ? `الرصيد ينتهي خلال ${Math.floor(feed.prediction.daysLeft)} أيام! اطلب ${feed.feedName} قبل ${fmtDate(feed.prediction.purchaseDate)}`
                      : `يُنصح بطلب ${feed.feedName} قبل ${fmtDate(feed.prediction.purchaseDate)} (${Math.floor(feed.prediction.daysLeft)} يوم)`
                    }
                  </span>
                </div>
              )}

              {/* تاريخ المشتريات (قابل للطي) */}
              <div style={styles.divider} />
              <button
                onClick={() => setExpanded(isOpen ? null : feed.feedName)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "var(--color-text-secondary)", padding: 0, width: "100%", textAlign: "right" }}
              >
                {isOpen ? "▲ إخفاء تاريخ المشتريات" : "▼ عرض تاريخ المشتريات وحساب المعدل"}
              </button>

              {isOpen && (
                <div style={{ marginTop: "10px" }}>
                  {feed.sorted.map((p, i) => {
                    const isLast = i === feed.sorted.length - 1;
                    const next   = feed.sorted[i + 1];
                    const days   = next ? Math.round((next.date - p.date) / (1000 * 60 * 60 * 24)) : null;
                    const rate   = days ? fmtNum(p.bags / days, 2) : null;
                    return (
                      <div key={i} style={styles.historyRow}>
                        <div style={{ ...styles.dot, background: isLast ? c.bar : "#B4B2A9" }} />
                        <span style={{ minWidth: "90px" }}>{fmtDate(p.date)}</span>
                        <span>{p.bags} كيس</span>
                        {rate && (
                          <span style={{ marginRight: "auto", color: "var(--color-text-primary)", fontWeight: 500 }}>
                            → استهلك في {days} يوم = {rate} كيس/يوم
                          </span>
                        )}
                        {isLast && <span style={{ marginRight: "auto", ...c.badge, ...styles.badge }}>آخر شراء</span>}
                      </div>
                    );
                  })}
                  {feed.smartRate && (
                    <div style={{ marginTop: "8px", padding: "8px 12px", background: c.alertBg, borderRadius: "var(--border-radius-md)", fontSize: "12px", color: c.text, fontWeight: 500 }}>
                      المعدل الذكي المحسوب: {fmtNum(feed.smartRate, 3)} كيس/يوم
                      ({fmtNum(feed.smartRate * feed.lastPurch.bagWeightKg, 1)} كغ/يوم)
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

    
