import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from './api.js';

const PALETTE = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
];

const MRL_COLORS = {
  ELIGIBLE_FOR_MILK: '#10b981',
  UNDER_WITHDRAWAL: '#f59e0b',
  TREATMENT_ACTIVE: '#ef4444',
};

const RISK_COLORS = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  CRITICAL: '#7c3aed',
  UNKNOWN: '#94a3b8',
};

export function OrganizationWideAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await api('/admin/dashboard-stats');
        if (isMounted) {
          setData(res);
          setError('');
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load organization-wide analytics');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#64748b' }}>
        <p>Loading organization-wide analytics…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="notice" style={{ margin: '1.5rem 0' }}>
        <p className="error" style={{ margin: 0 }}>
          {error}
        </p>
      </div>
    );
  }

  const pending = data?.pendingVerifications || {
    total: 0,
    farmerProfiles: 0,
    veterinarianProfiles: 0,
    dairyOwnerProfiles: 0,
    farms: 0,
  };

  const mrlStatus = data?.mrlStatus || [];
  const amuTrends = data?.amuAndDiseaseTrends || { antibioticClasses: [], topDiseases: [] };
  const antibioticClasses = amuTrends.antibioticClasses || [];
  const topDiseases = amuTrends.topDiseases || [];
  const dairy = data?.dairyEconomy || { totalCost: 0, totalQuantityLiters: 0, dailyProcurement: [] };
  const mlRisk = data?.mlRiskDistribution || [];

  return (
    <div className="organization-wide-analytics-section" style={{ margin: '2rem 0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.65rem', margin: '0 0 0.35rem', color: '#0f172a' }}>
          🌐 Organization wide Analytics
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
          Macro-level operational governance, MRL food safety, AMU trends, and dairy procurement economics.
        </p>
      </div>

      {/* Large KPI Summary Cards at the Top */}
      <div
        className="grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* KPI 1: Pending Verifications */}
        <article
          className="card"
          style={{
            padding: '1.5rem',
            borderRadius: '1.15rem',
            background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
            border: '1px solid #e2e8f0',
            borderLeft: '5px solid #f59e0b',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Verifications
            </span>
            <span style={{ fontSize: '1.6rem' }}>⏳</span>
          </div>
          <h3 style={{ margin: '0.6rem 0 0.3rem', fontSize: '2.6rem', fontWeight: 800, color: '#b45309' }}>
            {pending.total}
          </h3>
          <p style={{ margin: '0 0 0.75rem', color: '#64748b', fontSize: '0.82rem' }}>
            Awaiting platform governance review
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.78rem' }}>
            <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.55rem', borderRadius: '0.5rem', fontWeight: 600 }}>
              🧑‍🌾 Farmers: {pending.farmerProfiles}
            </span>
            <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.55rem', borderRadius: '0.5rem', fontWeight: 600 }}>
              🩺 Vets: {pending.veterinarianProfiles}
            </span>
            <span style={{ background: '#ecfdf5', color: '#065f46', padding: '0.2rem 0.55rem', borderRadius: '0.5rem', fontWeight: 600 }}>
              🥛 Dairy: {pending.dairyOwnerProfiles}
            </span>
            <span style={{ background: '#f1f5f9', color: '#334155', padding: '0.2rem 0.55rem', borderRadius: '0.5rem', fontWeight: 600 }}>
              🏡 Farms: {pending.farms}
            </span>
          </div>
        </article>

        {/* KPI 2: Total Milk Procurement Value */}
        <article
          className="card"
          style={{
            padding: '1.5rem',
            borderRadius: '1.15rem',
            background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
            border: '1px solid #e2e8f0',
            borderLeft: '5px solid #10b981',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Milk Procurement Value
            </span>
            <span style={{ fontSize: '1.6rem' }}>🥛</span>
          </div>
          <h3 style={{ margin: '0.6rem 0 0.3rem', fontSize: '2.6rem', fontWeight: 800, color: '#059669' }}>
            ₹{dairy.totalCost.toLocaleString('en-IN')}
          </h3>
          <p style={{ margin: '0 0 0.75rem', color: '#64748b', fontSize: '0.82rem' }}>
            Cumulative supply intake across registered dairies
          </p>
          <div style={{ display: 'inline-flex', background: '#d1fae5', color: '#065f46', padding: '0.25rem 0.65rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.82rem' }}>
            Total Volume: {dairy.totalQuantityLiters.toLocaleString('en-IN')} Liters Procured
          </div>
        </article>
      </div>

      {/* Grid of 5 Analytical Visualizations */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Chart 1: Donut Chart for MRL Status (Food Safety) */}
        <div
          className="card"
          style={{
            padding: '1.5rem',
            borderRadius: '1.15rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>
              🛡️ MRL Food Safety Status
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              DailyFarmEligibilityItem withdrawal compliance breakdown
            </p>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mrlStatus}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={4}
                >
                  {mrlStatus.map((entry) => (
                    <Cell
                      key={`mrl-${entry.status}`}
                      fill={MRL_COLORS[entry.status] || '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`${val} animals`, name]}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '0.5rem', border: 'none', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '0.8rem', paddingTop: '0.5rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Pie Chart for Antibiotic Usage by Class (Health) */}
        <div
          className="card"
          style={{
            padding: '1.5rem',
            borderRadius: '1.15rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>
              💊 Antibiotic Usage by Class
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Prescribed & administered antimicrobial classes
            </p>
          </div>

          {antibioticClasses.length === 0 ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              No antibiotic administrations recorded yet.
            </div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={antibioticClasses}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {antibioticClasses.map((entry, index) => (
                      <Cell
                        key={`class-${entry.antimicrobialClass}-${index}`}
                        fill={PALETTE[index % PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [`${val} administrations`, name]}
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '0.5rem', border: 'none', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '0.78rem', paddingTop: '0.5rem' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 3: Horizontal Bar Chart for Top 5 Diseases */}
        <div
          className="card"
          style={{
            padding: '1.5rem',
            borderRadius: '1.15rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>
              🔬 Top 5 Diagnosed Diseases
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Most frequent veterinary clinical diagnoses
            </p>
          </div>

          {topDiseases.length === 0 ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              No clinical diagnoses recorded yet.
            </div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topDiseases}
                  margin={{ top: 5, right: 30, left: 15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" allowDecimals={false} stroke="#64748b" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val) => [`${val} cases`, 'Diagnoses']}
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '0.5rem', border: 'none', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {topDiseases.map((_, i) => (
                      <Cell key={`bar-${i}`} fill={PALETTE[(i + 1) % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 4: Line Chart for Daily Safe Milk Procurement */}
        <div
          className="card"
          style={{
            padding: '1.5rem',
            borderRadius: '1.15rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>
              📈 Daily Safe Milk Procurement (Liters)
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Volume trend from verified collection records (dairy_milk_intakes)
            </p>
          </div>

          {dairy.dailyProcurement.length === 0 ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              No dairy intake collection logs found.
            </div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dairy.dailyProcurement}
                  margin={{ top: 10, right: 25, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="collectionDate"
                    stroke="#64748b"
                    fontSize={11}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    formatter={(val) => [`${Number(val).toLocaleString()} Liters`, 'Procured Volume']}
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '0.5rem', border: 'none', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="quantityLiters"
                    stroke="#0284c7"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#0284c7' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 5: Donut Chart for Platform-Wide Animal Risk Distribution */}
        <div
          className="card"
          style={{
            padding: '1.5rem',
            borderRadius: '1.15rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>
              🤖 Platform-Wide Animal Risk Distribution
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              ML predicted AMU pattern risk from AnimalRiskAssessment
            </p>
          </div>

          {mlRisk.length === 0 ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              No animal risk assessments evaluated yet.
            </div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mlRisk}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {mlRisk.map((entry, index) => (
                      <Cell
                        key={`risk-${entry.predictedRisk}-${index}`}
                        fill={RISK_COLORS[entry.predictedRisk] || PALETTE[index % PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [`${val} animals`, name]}
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '0.5rem', border: 'none', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '0.8rem', paddingTop: '0.5rem' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const AdminDashboard = OrganizationWideAnalytics;
export default OrganizationWideAnalytics;
