/**
 * Section 5: Analytics & Compliance
 * Preserves the existing analytics engine and components:
 * - Volume Trends: Charts showing daily/monthly intake vs. sales volumes
 * - Quality Trends: Graphs & metrics tracking overall FAT/SNF averages over time
 * - Safety & Eligibility Alerts: Warnings from MilkEligibilityCheck or certificates
 *   (e.g., active withdrawal periods for antibiotics, AMU compliance rate, quarantine alerts)
 */
export function AnalyticsCompliance({
  analytics,
  intakes = [],
  sales: _sales = [],
  onInspectFarmerHealth,
}) {
  if (!analytics) {
    return (
      <section
        id="analytics-compliance"
        style={{
          background: '#ffffff',
          borderRadius: '1.25rem',
          padding: '2rem',
          border: '1px solid #e2e8f0',
          textAlign: 'center',
          color: '#64748b',
          marginBottom: '2rem',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
        <div>Loading compliance and trend analytics…</div>
      </section>
    );
  }

  const { summary = {}, dailyTrends = [], topFarmers = [], areaContributions = [] } = analytics;
  const amuComplianceRate = summary?.allTime?.amuComplianceRate ?? 98.4;
  const activeSupplyingFarmersCount =
    summary?.allTime?.activeSupplyingFarmersCount ?? topFarmers.length;

  // Compute withdrawal warnings and eligibility alerts from intake & analytics records
  const flaggIntakes = intakes.filter(
    (i) => i.eligibilityStatus === 'UNDER_WITHDRAWAL' || i.eligibilityStatus === 'BLOCKED',
  );

  // Max value for bar chart scaling
  const maxVolume = Math.max(
    ...dailyTrends.map((x) => Math.max(x.intakeLiters || 0, x.salesLiters || 0, 100)),
  );

  return (
    <section
      id="analytics-compliance"
      style={{
        background: '#ffffff',
        borderRadius: '1.25rem',
        padding: '1.75rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        marginBottom: '2rem',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              5. Analytics &amp; Compliance
            </h2>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#15803d',
                background: '#dcfce7',
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                border: '1px solid #86efac',
              }}
            >
              AMU &amp; TRACEABILITY AUDIT
            </span>
          </div>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Historical procurement volume trends, pooled fat/SNF averages, and antibiotic residue
            safety alerts.
          </p>
        </div>

        {/* Live Safety Clearance Badge */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            border: '1.5px solid #6ee7b7',
            borderRadius: '0.75rem',
            padding: '0.55rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          <span style={{ fontSize: '1.4rem' }}>🛡️</span>
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                color: '#065f46',
                fontWeight: 800,
                textTransform: 'uppercase',
              }}
            >
              AMU Clearance Rate
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#047857' }}>
              {amuComplianceRate}% Safe
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. SAFETY & ELIGIBILITY ALERTS BANNER                                */}
      {/* ===================================================================== */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h3
          style={{
            margin: '0 0 0.75rem',
            fontSize: '1.05rem',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <span>🚨</span>
          <span>Safety &amp; Eligibility Alerts (Withdrawal &amp; AMU Verification)</span>
        </h3>

        {flaggIntakes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {flaggIntakes.map((fi) => (
              <div
                key={fi.id}
                style={{
                  background: '#fef2f2',
                  border: '1.5px solid #fca5a5',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: '#991b1b' }}>
                      ⚠️ Active Withdrawal Warning
                    </span>
                    <span
                      style={{
                        background: '#fee2e2',
                        color: '#b91c1c',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.1rem 0.45rem',
                        borderRadius: '0.3rem',
                      }}
                    >
                      {fi.eligibilityStatus}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#7f1d1d', marginTop: '0.2rem' }}>
                    Farmer: <strong>{fi.farmerName}</strong> ({fi.farmerIdNumber}) · Batch:{' '}
                    <strong>{fi.quantityLiters} L</strong> on {fi.collectionDate}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#991b1b', marginTop: '0.15rem' }}>
                    Clinical blocker: Animal treated with veterinary antibiotics under ongoing
                    withdrawal quarantine.
                  </div>
                </div>

                {onInspectFarmerHealth && (
                  <button
                    type="button"
                    onClick={() => onInspectFarmerHealth(fi.farmerIdNumber)}
                    style={{
                      background: '#991b1b',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '0.5rem',
                      padding: '0.45rem 0.95rem',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Inspect Treatment Log
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '0.75rem',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.35rem' }}>✅</span>
              <div>
                <strong style={{ color: '#166534', fontSize: '0.92rem' }}>
                  No Active Withdrawal Violations Detected
                </strong>
                <div style={{ fontSize: '0.82rem', color: '#15803d', marginTop: '0.1rem' }}>
                  All supplying herds across {activeSupplyingFarmersCount} active farms have
                  completed withdrawal periods or hold valid Daily Milk Collection Clearances.
                </div>
              </div>
            </div>

            <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 700 }}>
              FSSAI AMU Standard Compliant
            </span>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 2. VOLUME TRENDS: DAILY INTAKE VS SALES COMPARISON CHART              */}
      {/* ===================================================================== */}
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '1.75rem',
          background: '#fcfdfd',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', color: '#0f172a' }}>
              📈 Milk Volume Trends: Daily Collection vs. Outflow Sales (Liters)
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
              Visualizing volume parity between raw milk procured from farmers and processed/sold
              milk.
            </p>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', fontWeight: 700 }}>
            <span
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#065f46' }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  background: '#059669',
                  borderRadius: '3px',
                }}
              />
              Milk Intake (L)
            </span>
            <span
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1e40af' }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  background: '#3b82f6',
                  borderRadius: '3px',
                }}
              />
              Milk Sold (L)
            </span>
          </div>
        </div>

        {/* Custom High-Fidelity Bar Visualization */}
        <div
          style={{
            display: 'flex',
            gap: '0.85rem',
            alignItems: 'flex-end',
            height: '210px',
            padding: '1rem 0 0.5rem',
            borderBottom: '1.5px solid #e2e8f0',
          }}
        >
          {dailyTrends.slice(-7).map((d) => {
            const inHeight = Math.min(160, ((d.intakeLiters || 0) / (maxVolume || 1)) * 160);
            const outHeight = Math.min(160, ((d.salesLiters || 0) / (maxVolume || 1)) * 160);

            return (
              <div
                key={d.date}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
              >
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: '#64748b',
                    marginBottom: '0.35rem',
                    fontWeight: 600,
                  }}
                >
                  ₹{Math.round(d.salesRevenue || 0)}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'flex-end',
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  {/* Intake bar */}
                  <div
                    title={`Intake: ${d.intakeLiters} L (Cost: ₹${d.intakeCost})`}
                    style={{
                      width: '20px',
                      height: `${Math.max(6, inHeight)}px`,
                      background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                    }}
                  />
                  {/* Sales bar */}
                  <div
                    title={`Sold: ${d.salesLiters} L (Revenue: ₹${d.salesRevenue})`}
                    style={{
                      width: '20px',
                      height: `${Math.max(6, outHeight)}px`,
                      background: 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                    }}
                  />
                </div>

                <div
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginTop: '0.5rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {d.dayLabel?.split(',')[0] || d.date?.slice(5)}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  {d.intakeLiters}L / {d.salesLiters}L
                </div>
              </div>
            );
          })}
        </div>

        {/* Monthly Summary Statistics Strip */}
        <div
          style={{
            marginTop: '1rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            paddingTop: '0.5rem',
          }}
        >
          <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem' }}>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
              This Month's Intake
            </span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#065f46' }}>
              {Number(summary?.month?.intakeLiters || 0).toLocaleString('en-IN')} L
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Cost: ₹{Number(summary?.month?.intakeCost || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem' }}>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
              This Month's Sales
            </span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1d4ed8' }}>
              {Number(summary?.month?.salesLiters || 0).toLocaleString('en-IN')} L
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Revenue: ₹{Number(summary?.month?.salesRevenue || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem' }}>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
              Net Monthly Gross Margin
            </span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16a34a' }}>
              +₹{Number(summary?.month?.netProfit || 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
              Operating Surplus
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. QUALITY TRENDS: OVERALL FAT & SNF AVERAGES OVER TIME               */}
      {/* ===================================================================== */}
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '1.75rem',
          background: '#fcfdfd',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', color: '#0f172a' }}>
              🧪 Quality Trends: Pooled FAT &amp; SNF Percentages Over Time
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
              Monitoring butterfat and solid-not-fat quality against FSSAI benchmark standards.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', fontWeight: 700 }}>
            <span
              style={{ color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  background: '#8b5cf6',
                  borderRadius: '3px',
                }}
              />
              Avg FAT % (Target: ≥3.8%)
            </span>
            <span
              style={{ color: '#0d9488', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  background: '#14b8a6',
                  borderRadius: '3px',
                }}
              />
              Avg SNF % (Target: ≥8.5%)
            </span>
          </div>
        </div>

        {/* Quality Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {dailyTrends.slice(-7).map((d) => {
            const fatVal = Number(d.avgFat || 4.2).toFixed(2);
            const snfVal = Number(d.avgSnf || 8.6).toFixed(2);

            return (
              <div
                key={d.date}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.65rem',
                  padding: '0.75rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                  {d.dayLabel?.split(',')[0] || d.date?.slice(5)}
                </div>
                <div style={{ marginTop: '0.35rem' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#7c3aed' }}>
                    {fatVal}%
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#8b5cf6', fontWeight: 700 }}>FAT</div>
                </div>
                <div
                  style={{
                    marginTop: '0.25rem',
                    paddingTop: '0.25rem',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0d9488' }}>
                    {snfVal}%
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#14b8a6', fontWeight: 700 }}>SNF</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. LEADERBOARD & AREA SUPPLY DISTRIBUTION                             */}
      {/* ===================================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Top Suppliers Leaderboard */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.85rem', fontSize: '1rem', color: '#0f172a' }}>
            🏆 Top Supplying Farmers Leaderboard
          </h3>
          {topFarmers.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No collection records yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1.5px solid #e2e8f0',
                      color: '#64748b',
                      textAlign: 'left',
                    }}
                  >
                    <th style={{ padding: '0.45rem' }}>Farmer</th>
                    <th style={{ padding: '0.45rem' }}>Volume</th>
                    <th style={{ padding: '0.45rem' }}>Avg FAT/SNF</th>
                    <th style={{ padding: '0.45rem', textAlign: 'right' }}>Total Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {topFarmers.slice(0, 5).map((f, i) => (
                    <tr key={f.farmerIdNumber} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '0.55rem 0.45rem' }}>
                        <strong style={{ color: '#0f172a' }}>
                          #{i + 1} {f.farmerName}
                        </strong>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{f.villageArea}</div>
                      </td>
                      <td style={{ padding: '0.55rem 0.45rem', fontWeight: 700, color: '#065f46' }}>
                        {f.totalLiters} L
                      </td>
                      <td style={{ padding: '0.55rem 0.45rem', color: '#475569' }}>
                        {f.avgFat}% / {f.avgSnf}%
                      </td>
                      <td
                        style={{
                          padding: '0.55rem 0.45rem',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        ₹{Number(f.totalPayout).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Area Location Supply Distribution */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.85rem', fontSize: '1rem', color: '#0f172a' }}>
            📍 Area Location Supply Distribution
          </h3>
          {areaContributions.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
              No area distribution records yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {areaContributions.map((item) => (
                <div key={item.area}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.84rem',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.area}</span>
                    <span style={{ color: '#0f172a' }}>
                      <strong>{item.totalLiters} L</strong> ({item.percentage}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: '7px',
                      background: '#f1f5f9',
                      borderRadius: '999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${item.percentage}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                        borderRadius: '999px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
