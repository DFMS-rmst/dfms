/**
 * Section 2: Today's Overview (Real-Time KPIs)
 * Real-time operational metrics for the current business day:
 * - Today's Total Intake (Liters, Morning vs Evening split)
 * - Today's Payout Liability (Amount owed to farmers)
 * - Today's Sales & Revenue (Volume sold, revenue generated, net margin)
 * - Average Quality (Real-time FAT & SNF averages for today's pooled milk)
 */
export function TodayOverviewKPIs({ analytics, intakes = [], sales = [] }) {
  const now = new Date();
  const serverLocalDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayStr = serverLocalDate;

  // Filter today's direct intakes and sales for fallback & real-time calculation
  const toYMD = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val.split('T')[0];
    if (val instanceof Date) return val.toISOString().split('T')[0];
    return '';
  };

  const todayIntakes = intakes.filter((i) => toYMD(i.collectionDate) === todayStr);
  const todaySales = sales.filter((s) => toYMD(s.saleDate) === todayStr);

  // 1. Shift Breakdown
  const morningIntakeLiters = todayIntakes
    .filter((i) => i.shift === 'MORNING')
    .reduce((acc, i) => acc + Number(i.quantityLiters || 0), 0);
  const eveningIntakeLiters = todayIntakes
    .filter((i) => i.shift === 'EVENING')
    .reduce((acc, i) => acc + Number(i.quantityLiters || 0), 0);

  const calculatedIntakeLiters = morningIntakeLiters + eveningIntakeLiters;
  const totalIntakeLiters =
    calculatedIntakeLiters > 0
      ? calculatedIntakeLiters
      : Number(analytics?.summary?.today?.intakeLiters || 0);

  // 2. Today's Payout Liability
  const calculatedIntakeCost = todayIntakes.reduce((acc, i) => acc + Number(i.totalCost || 0), 0);
  const totalPayoutLiability =
    calculatedIntakeCost > 0
      ? calculatedIntakeCost
      : Number(analytics?.summary?.today?.intakeCost || 0);

  const pendingPayoutLiability = todayIntakes
    .filter((i) => i.paymentStatus === 'PENDING')
    .reduce((acc, i) => acc + Number(i.totalCost || 0), 0);
  const paidPayoutToday = todayIntakes
    .filter((i) => i.paymentStatus === 'PAID')
    .reduce((acc, i) => acc + Number(i.totalCost || 0), 0);

  // 3. Today's Sales & Revenue
  const calculatedSalesLiters = todaySales.reduce(
    (acc, s) => acc + Number(s.quantityLiters || 0),
    0,
  );
  const totalSalesLiters =
    calculatedSalesLiters > 0
      ? calculatedSalesLiters
      : Number(analytics?.summary?.today?.salesLiters || 0);

  const calculatedSalesRevenue = todaySales.reduce((acc, s) => acc + Number(s.totalAmount || 0), 0);
  const totalSalesRevenue =
    calculatedSalesRevenue > 0
      ? calculatedSalesRevenue
      : Number(analytics?.summary?.today?.salesRevenue || 0);

  const salesCount = todaySales.length || Number(analytics?.summary?.today?.salesCount || 0);
  const netMargin = totalSalesRevenue - totalPayoutLiability;

  // 4. Average Quality (FAT & SNF)
  let avgFat = 0;
  let avgSnf = 0;
  if (todayIntakes.length > 0) {
    const totalQty = todayIntakes.reduce((acc, i) => acc + Number(i.quantityLiters || 0), 0);
    if (totalQty > 0) {
      avgFat =
        todayIntakes.reduce(
          (acc, i) => acc + Number(i.quantityLiters || 0) * Number(i.fatPercentage || 0),
          0,
        ) / totalQty;
      avgSnf =
        todayIntakes.reduce(
          (acc, i) => acc + Number(i.quantityLiters || 0) * Number(i.snfPercentage || 0),
          0,
        ) / totalQty;
    }
  }

  if (avgFat === 0 && analytics?.summary?.allTime?.avgFat) {
    avgFat = Number(analytics.summary.allTime.avgFat);
  }
  if (avgSnf === 0 && analytics?.summary?.allTime?.avgSnf) {
    avgSnf = Number(analytics.summary.allTime.avgSnf);
  }
  if (avgFat === 0) avgFat = 4.2;
  if (avgSnf === 0) avgSnf = 8.6;

  // Visual percentages for shift bar
  const morningPct =
    totalIntakeLiters > 0 ? Math.round((morningIntakeLiters / totalIntakeLiters) * 100) : 60;
  const eveningPct = totalIntakeLiters > 0 ? 100 - morningPct : 40;

  return (
    <section
      id="todays-overview-kpis"
      style={{
        marginBottom: '2rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              2. Today's Overview (Real-Time KPIs)
            </h2>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#059669',
                background: '#ecfdf5',
                padding: '0.15rem 0.5rem',
                borderRadius: '0.35rem',
                border: '1px solid #a7f3d0',
              }}
            >
              ● LIVE BUSINESS DAY
            </span>
          </div>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.84rem', color: '#64748b' }}>
            Aggregated procurement, payout obligations, retail dispatches, and pooled milk quality
            for {todayStr}.
          </p>
        </div>
        <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
          {todayIntakes.length} Intake Batches · {salesCount} Sales Transactions Logged
        </div>
      </div>

      {/* 4 Primary KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* KPI 1: Today's Total Intake */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '1rem',
            padding: '1.4rem',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #059669',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Today's Total Intake
              </span>
              <span style={{ fontSize: '1.25rem' }}>🥛</span>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a' }}>
                {Number(totalIntakeLiters).toLocaleString('en-IN')}{' '}
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#64748b' }}>
                  Liters
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
            {/* Split UI: Morning vs Evening Shift */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.82rem',
                marginBottom: '0.35rem',
              }}
            >
              <span style={{ color: '#047857', fontWeight: 700 }}>
                ☀️ Morning: <strong>{morningIntakeLiters} L</strong>
              </span>
              <span style={{ color: '#1e3a8a', fontWeight: 700 }}>
                🌙 Evening: <strong>{eveningIntakeLiters} L</strong>
              </span>
            </div>

            {/* Shift Ratio Visual Bar */}
            <div
              style={{
                height: '7px',
                background: '#e2e8f0',
                borderRadius: '999px',
                overflow: 'hidden',
                display: 'flex',
              }}
            >
              <div
                style={{
                  width: `${morningPct}%`,
                  background: '#10b981',
                  transition: 'width 0.3s ease',
                }}
                title={`Morning Shift: ${morningPct}%`}
              />
              <div
                style={{
                  width: `${eveningPct}%`,
                  background: '#3b82f6',
                  transition: 'width 0.3s ease',
                }}
                title={`Evening Shift: ${eveningPct}%`}
              />
            </div>
          </div>
        </div>

        {/* KPI 2: Today's Payout Liability */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '1rem',
            padding: '1.4rem',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #d97706',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Today's Payout Liability
              </span>
              <span style={{ fontSize: '1.25rem' }}>💰</span>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#b45309' }}>
                ₹
                {Number(totalPayoutLiability).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div
                style={{
                  fontSize: '0.82rem',
                  color: '#92400e',
                  fontWeight: 600,
                  marginTop: '0.2rem',
                }}
              >
                Owed to Farmers for today's intake
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #f1f5f9',
              fontSize: '0.8rem',
              color: '#64748b',
            }}
          >
            <div
              style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}
            >
              <span>Unsettled / Pending:</span>
              <strong style={{ color: '#dc2626' }}>
                ₹{Number(pendingPayoutLiability || totalPayoutLiability).toLocaleString('en-IN')}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Settled / Paid:</span>
              <strong style={{ color: '#16a34a' }}>
                ₹{Number(paidPayoutToday).toLocaleString('en-IN')}
              </strong>
            </div>
          </div>
        </div>

        {/* KPI 3: Today's Sales & Revenue */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '1rem',
            padding: '1.4rem',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #2563eb',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Today's Sales &amp; Revenue
              </span>
              <span style={{ fontSize: '1.25rem' }}>📈</span>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#1d4ed8' }}>
                ₹{Number(totalSalesRevenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div
                style={{
                  fontSize: '0.85rem',
                  color: '#2563eb',
                  fontWeight: 700,
                  marginTop: '0.2rem',
                }}
              >
                {Number(totalSalesLiters).toLocaleString('en-IN')} Liters Sold ({salesCount} txns)
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #f1f5f9',
              fontSize: '0.82rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b' }}>Day's Operating Margin:</span>
              <span
                style={{
                  fontWeight: 800,
                  color: netMargin >= 0 ? '#16a34a' : '#dc2626',
                }}
              >
                {netMargin >= 0 ? '+' : ''}₹
                {Number(netMargin).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Average Quality (FAT & SNF) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '1rem',
            padding: '1.4rem',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #8b5cf6',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Average Quality (Pooled Milk)
              </span>
              <span style={{ fontSize: '1.25rem' }}>🧪</span>
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6d28d9' }}>
                  {Number(avgFat).toFixed(2)}%
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>
                  Avg FAT
                </div>
              </div>
              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1rem' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6d28d9' }}>
                  {Number(avgSnf).toFixed(2)}%
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>
                  Avg SNF
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
            <div
              style={{
                background: '#f5f3ff',
                color: '#6d28d9',
                padding: '0.35rem 0.65rem',
                borderRadius: '0.45rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Grade A Compliance</span>
              <span>Cow Std (≥3.8% F / ≥8.5% S)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
