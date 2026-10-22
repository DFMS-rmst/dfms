import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from './api.js';

const PIE_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
];

export function MyClinicalAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await api('/vet/analytics');
        if (isMounted) {
          setData(res);
          setError('');
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load clinical analytics');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', color: '#64748b' }}>
        <p>Loading clinical analytics…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="notice" style={{ margin: '1rem 0' }}>
        <p className="error" style={{ margin: 0 }}>
          {error}
        </p>
      </div>
    );
  }

  const kpiStats = data?.kpiStats || {
    totalCases: 0,
    activeTreatments: 0,
    antibioticsPrescribed: 0,
  };
  const amuProfile = data?.amuProfile || [];
  const topDiseases = data?.topDiseases || [];

  return (
    <div className="my-clinical-analytics-wrapper" style={{ margin: '2rem 0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.35rem', color: '#0f172a' }}>
          🩺 My Clinical Analytics
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Personal caseload performance, antimicrobial class distribution, and diagnosed diseases.
        </p>
      </div>

      {/* KPI Stats Row */}
      <div
        className="grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <article
          className="card"
          style={{
            padding: '1.25rem',
            borderRadius: '1rem',
            background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              Total Cases
            </span>
            <span style={{ fontSize: '1.4rem' }}>📁</span>
          </div>
          <h3 style={{ margin: '0.5rem 0 0.2rem', fontSize: '2.1rem', fontWeight: 800, color: '#1e293b' }}>
            {kpiStats.totalCases}
          </h3>
          <small style={{ color: '#64748b', fontSize: '0.8rem' }}>Veterinary cases opened</small>
        </article>

        <article
          className="card"
          style={{
            padding: '1.25rem',
            borderRadius: '1rem',
            background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #3b82f6',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
              Active Treatments
            </span>
            <span style={{ fontSize: '1.4rem' }}>💉</span>
          </div>
          <h3 style={{ margin: '0.5rem 0 0.2rem', fontSize: '2.1rem', fontWeight: 800, color: '#2563eb' }}>
            {kpiStats.activeTreatments}
          </h3>
          <small style={{ color: '#64748b', fontSize: '0.8rem' }}>Currently ongoing therapy</small>
        </article>

        <article
          className="card"
          style={{
            padding: '1.25rem',
            borderRadius: '1rem',
            background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #10b981',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
              Antibiotics Prescribed
            </span>
            <span style={{ fontSize: '1.4rem' }}>💊</span>
          </div>
          <h3 style={{ margin: '0.5rem 0 0.2rem', fontSize: '2.1rem', fontWeight: 800, color: '#059669' }}>
            {kpiStats.antibioticsPrescribed}
          </h3>
          <small style={{ color: '#64748b', fontSize: '0.8rem' }}>Items where isAntibiotic is verified</small>
        </article>
      </div>

      {/* Visualizations Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* AMU Profile - Pie Chart */}
        <div
          className="card"
          style={{
            padding: '1.5rem',
            borderRadius: '1rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>
              Prescribed AMU Profile
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Distribution of prescribed antimicrobial drug classes
            </p>
          </div>

          {amuProfile.length === 0 ? (
            <div
              style={{
                height: 260,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: '0.9rem',
                border: '1px dashed #cbd5e1',
                borderRadius: '0.75rem',
              }}
            >
              No antimicrobial prescriptions recorded yet.
            </div>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={amuProfile}
                    dataKey="count"
                    nameKey="antimicrobialClass"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {amuProfile.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.antimicrobialClass}-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} prescriptions`, name]}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '0.5rem',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                    }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '0.8rem', paddingTop: '0.75rem' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Diagnosed Diseases - Bar Chart */}
        <div
          className="card"
          style={{
            padding: '1.5rem',
            borderRadius: '1rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>
              Top 5 Diagnosed Diseases
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Most frequent clinical diagnoses in your practice
            </p>
          </div>

          {topDiseases.length === 0 ? (
            <div
              style={{
                height: 260,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: '0.9rem',
                border: '1px dashed #cbd5e1',
                borderRadius: '0.75rem',
              }}
            >
              No clinical diagnoses recorded yet.
            </div>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topDiseases}
                  margin={{ top: 10, right: 20, left: -10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} cases`, 'Diagnosed Count']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '0.5rem',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                    }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {topDiseases.map((_entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={PIE_COLORS[(index + 1) % PIE_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
