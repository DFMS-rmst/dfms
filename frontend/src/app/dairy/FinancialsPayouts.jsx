import { useState } from 'react';
import { api } from '../api.js';
import { toast } from '../toast.js';

/**
 * Section 4: Financials & Payouts
 * - Pending Farmer Payouts: Consolidated view grouping dairy_milk_intakes where paymentStatus = 'PENDING'.
 *   Includes 1-click action to mark batches as PAID.
 * - Sales Receivables: Tracking wholesale/commercial sales where buyer's paymentStatus is PENDING or PARTIAL.
 */
export function FinancialsPayouts({ intakes = [], sales = [], enrollments = [], onRefreshData }) {
  const [activeTab, setActiveTab] = useState('PAYOUTS'); // 'PAYOUTS' | 'RECEIVABLES'
  const [viewMode, setViewMode] = useState('GROUPED'); // 'GROUPED' | 'DETAILED'
  const [processingId, setProcessingId] = useState(null);

  // 1. Pending Farmer Payouts (dairy_milk_intakes where paymentStatus = 'PENDING')
  const pendingIntakes = intakes.filter((i) => i.paymentStatus === 'PENDING');
  const paidIntakes = intakes.filter((i) => i.paymentStatus === 'PAID');

  const totalPendingPayoutAmount = pendingIntakes.reduce(
    (acc, i) => acc + Number(i.totalCost || 0),
    0,
  );
  const totalPaidPayoutAmount = paidIntakes.reduce((acc, i) => acc + Number(i.totalCost || 0), 0);

  // Group pending intakes by farmerIdNumber
  const farmerEnrollmentMap = {};
  for (const enr of enrollments) {
    if (enr.farmerIdNumber) farmerEnrollmentMap[enr.farmerIdNumber] = enr;
  }

  const groupedFarmerPayouts = [];
  const farmerGroupMap = {};
  for (const intake of pendingIntakes) {
    const key = intake.farmerIdNumber || 'UNKNOWN';
    if (!farmerGroupMap[key]) {
      const enr = farmerEnrollmentMap[key] || {};
      farmerGroupMap[key] = {
        farmerIdNumber: key,
        farmerName: intake.farmerName || enr.farmerName || 'Registered Farmer',
        farmName: intake.farmName || enr.farmName || 'Dairy Farm',
        villageArea: intake.villageArea || enr.villageArea || 'Area',
        phone: enr.phone || 'N/A',
        paymentMethod: enr.paymentMethod || 'BANK_TRANSFER',
        bankAccount: enr.bankAccountNumber,
        bankIfsc: enr.bankIfsc,
        bankName: enr.bankName,
        upiId: enr.upiId,
        intakes: [],
        totalLiters: 0,
        totalCost: 0,
      };
      groupedFarmerPayouts.push(farmerGroupMap[key]);
    }
    farmerGroupMap[key].intakes.push(intake);
    farmerGroupMap[key].totalLiters += Number(intake.quantityLiters || 0);
    farmerGroupMap[key].totalCost += Number(intake.totalCost || 0);
  }

  // 2. Sales Receivables (dairy_milk_sales where paymentStatus = 'PENDING' or 'PARTIAL')
  const receivableSales = sales.filter(
    (s) => s.paymentStatus === 'PENDING' || s.paymentStatus === 'PARTIAL',
  );
  const totalReceivablesAmount = receivableSales.reduce(
    (acc, s) => acc + Number(s.totalAmount || 0),
    0,
  );

  // Mark single intake as PAID
  async function handleMarkIntakePaid(intakeId) {
    setProcessingId(intakeId);
    try {
      await api(`/dairy/inventory/intakes/${intakeId}/payment`, {
        method: 'PUT',
        body: JSON.stringify({ paymentStatus: 'PAID' }),
      });
      toast.success('Intake payout marked as PAID.');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      toast.error(err.message || 'Failed to update payment status.');
    } finally {
      setProcessingId(null);
    }
  }

  // Batch mark all pending intakes for a farmer as PAID
  async function handleBatchMarkFarmerPaid(farmerGroup) {
    const intakeIds = farmerGroup.intakes.map((i) => i.id);
    const count = intakeIds.length;
    setProcessingId(`farmer_${farmerGroup.farmerIdNumber}`);
    try {
      await api('/dairy/inventory/intakes/batch-payout', {
        method: 'PUT',
        body: JSON.stringify({ ids: intakeIds, farmerIdNumber: farmerGroup.farmerIdNumber }),
      });
      toast.success(
        `🎉 Successfully settled payout of ₹${Number(farmerGroup.totalCost).toLocaleString('en-IN')} across ${count} batches for ${farmerGroup.farmerName}.`,
      );
      if (onRefreshData) onRefreshData();
    } catch (err) {
      toast.error(err.message || 'Failed to settle batch payout.');
    } finally {
      setProcessingId(null);
    }
  }

  // Mark a milk sale receivable as PAID / RECEIVED
  async function handleMarkSalePaid(saleId, buyerName) {
    setProcessingId(saleId);
    try {
      await api(`/dairy/inventory/sales/${saleId}/payment`, {
        method: 'PUT',
        body: JSON.stringify({ paymentStatus: 'PAID' }),
      });
      toast.success(`Payment receivable marked as RECEIVED for ${buyerName}.`);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      toast.error(err.message || 'Failed to mark sale as paid.');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <section
      id="financials-payouts"
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
              4. Financials &amp; Payouts
            </h2>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#d97706',
                background: '#fffbeb',
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                border: '1px solid #fde68a',
              }}
            >
              SETTLEMENTS &amp; RECEIVABLES
            </span>
          </div>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Consolidated farmer milk supply liabilities, batch payment clearances, and commercial
            sales receivables.
          </p>
        </div>

        {/* Top Financial Summary Pills */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '0.65rem',
              padding: '0.45rem 0.85rem',
            }}
          >
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#991b1b',
                textTransform: 'uppercase',
              }}
            >
              Pending Payouts
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b91c1c' }}>
              ₹
              {Number(totalPendingPayoutAmount).toLocaleString('en-IN', {
                maximumFractionDigits: 0,
              })}
            </div>
          </div>

          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '0.65rem',
              padding: '0.45rem 0.85rem',
            }}
          >
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#1e40af',
                textTransform: 'uppercase',
              }}
            >
              Sales Receivables
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb' }}>
              ₹
              {Number(totalReceivablesAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '2px solid #f1f5f9',
          paddingBottom: '0.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* Tab 1: Pending Farmer Payouts */}
          <button
            type="button"
            onClick={() => setActiveTab('PAYOUTS')}
            style={{
              background: activeTab === 'PAYOUTS' ? '#ecfdf5' : 'transparent',
              color: activeTab === 'PAYOUTS' ? '#065f46' : '#64748b',
              border: 'none',
              borderBottom:
                activeTab === 'PAYOUTS' ? '2.5px solid #059669' : '2.5px solid transparent',
              padding: '0.55rem 1rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '0.5rem 0.5rem 0 0',
            }}
          >
            <span>Pending Farmer Payouts</span>
            <span
              style={{
                background: pendingIntakes.length > 0 ? '#ef4444' : '#e2e8f0',
                color: pendingIntakes.length > 0 ? '#ffffff' : '#64748b',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '0.1rem 0.5rem',
                borderRadius: '999px',
              }}
            >
              {pendingIntakes.length}
            </span>
          </button>

          {/* Tab 2: Sales Receivables */}
          <button
            type="button"
            onClick={() => setActiveTab('RECEIVABLES')}
            style={{
              background: activeTab === 'RECEIVABLES' ? '#eff6ff' : 'transparent',
              color: activeTab === 'RECEIVABLES' ? '#1d4ed8' : '#64748b',
              border: 'none',
              borderBottom:
                activeTab === 'RECEIVABLES' ? '2.5px solid #2563eb' : '2.5px solid transparent',
              padding: '0.55rem 1rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '0.5rem 0.5rem 0 0',
            }}
          >
            <span>Sales Receivables</span>
            <span
              style={{
                background: receivableSales.length > 0 ? '#f59e0b' : '#e2e8f0',
                color: receivableSales.length > 0 ? '#ffffff' : '#64748b',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '0.1rem 0.5rem',
                borderRadius: '999px',
              }}
            >
              {receivableSales.length}
            </span>
          </button>
        </div>

        {/* View mode toggle for Payouts */}
        {activeTab === 'PAYOUTS' && (
          <div
            style={{
              display: 'flex',
              gap: '0.35rem',
              background: '#f1f5f9',
              padding: '0.2rem',
              borderRadius: '0.5rem',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('GROUPED')}
              style={{
                background: viewMode === 'GROUPED' ? '#ffffff' : 'transparent',
                color: viewMode === 'GROUPED' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '0.35rem',
                padding: '0.3rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: viewMode === 'GROUPED' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              👥 Group by Farmer
            </button>
            <button
              type="button"
              onClick={() => setViewMode('DETAILED')}
              style={{
                background: viewMode === 'DETAILED' ? '#ffffff' : 'transparent',
                color: viewMode === 'DETAILED' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '0.35rem',
                padding: '0.3rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: viewMode === 'DETAILED' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              📋 Detailed Batches
            </button>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 1. PENDING FARMER PAYOUTS VIEW                                        */}
      {/* ===================================================================== */}
      {activeTab === 'PAYOUTS' && (
        <div>
          {pendingIntakes.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem 1rem',
                background: '#f8fafc',
                borderRadius: '0.75rem',
                border: '1.5px dashed #cbd5e1',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
              <h3 style={{ margin: '0 0 0.35rem', color: '#0f172a', fontSize: '1.1rem' }}>
                All Farmer Intakes Are Settled
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                There are currently no unpaid milk intakes. Lifetime settled payouts: ₹
                {Number(totalPaidPayoutAmount).toLocaleString('en-IN')}.
              </p>
            </div>
          ) : viewMode === 'GROUPED' ? (
            /* GROUPED BY FARMER VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {groupedFarmerPayouts.map((group) => {
                const isProcessing = processingId === `farmer_${group.farmerIdNumber}`;

                return (
                  <div
                    key={group.farmerIdNumber}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '0.85rem',
                      padding: '1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    {/* Farmer Details */}
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.35rem',
                        }}
                      >
                        <span style={{ fontSize: '1.15rem' }}>🧑‍🌾</span>
                        <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                          {group.farmerName}
                        </strong>
                        <span
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.45rem',
                            borderRadius: '0.3rem',
                          }}
                        >
                          {group.farmerIdNumber}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
                        <div>
                          Farm: <strong>{group.farmName}</strong> · Route:{' '}
                          <strong>{group.villageArea}</strong> · Phone:{' '}
                          <strong>{group.phone}</strong>
                        </div>
                        <div style={{ marginTop: '0.2rem', color: '#0f172a' }}>
                          Pending: <strong>{group.intakes.length} Collection Batches</strong>{' '}
                          totaling <strong>{group.totalLiters} Liters</strong>
                        </div>

                        {/* Payment Credentials */}
                        <div
                          style={{
                            marginTop: '0.4rem',
                            fontSize: '0.78rem',
                            color: '#475569',
                            background: '#f8fafc',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '0.4rem',
                            display: 'inline-block',
                          }}
                        >
                          💳 <strong>{group.paymentMethod}</strong>:{' '}
                          {group.upiId
                            ? `UPI: ${group.upiId}`
                            : group.bankAccount
                              ? `A/C: ${group.bankAccount} (${group.bankIfsc || ''})`
                              : 'Cash / Bank Transfer on file'}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Mark All Paid Action */}
                    <div
                      style={{
                        textAlign: 'right',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: '#64748b',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          Total Accumulated Payout
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#b45309' }}>
                          ₹
                          {Number(group.totalCost).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleBatchMarkFarmerPaid(group)}
                        style={{
                          background: isProcessing
                            ? '#94a3b8'
                            : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '0.6rem',
                          padding: '0.65rem 1.25rem',
                          fontSize: '0.88rem',
                          fontWeight: 800,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 4px 10px rgba(5, 150, 105, 0.25)',
                        }}
                      >
                        <span>✓</span>
                        <span>
                          {isProcessing
                            ? 'Settling…'
                            : `Mark ${group.intakes.length} Batches as PAID`}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* DETAILED INDIVIDUAL BATCHES TABLE */
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.86rem',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid #e2e8f0',
                      color: '#64748b',
                      fontSize: '0.76rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <th style={{ padding: '0.6rem 0.75rem' }}>Date &amp; Shift</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Farmer &amp; ID</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Quantity (L)</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Rate &amp; Quality</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Payout Owed</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingIntakes.map((i) => {
                    const isProcessing = processingId === i.id;

                    return (
                      <tr
                        key={i.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {i.collectionDate || 'Today'}
                          </div>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: i.shift === 'MORNING' ? '#047857' : '#1e40af',
                              background: i.shift === 'MORNING' ? '#ecfdf5' : '#eff6ff',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '0.3rem',
                            }}
                          >
                            {i.shift}
                          </span>
                        </td>

                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{i.farmerName}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            <code>{i.farmerIdNumber}</code>
                          </div>
                        </td>

                        <td style={{ padding: '0.75rem', fontWeight: 700, color: '#0f172a' }}>
                          {i.quantityLiters} L{' '}
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                            ({i.milkType})
                          </span>
                        </td>

                        <td style={{ padding: '0.75rem' }}>
                          <div>₹{Number(i.ratePerLiter).toFixed(2)}/L</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Fat: {i.fatPercentage}% · SNF: {i.snfPercentage}%
                          </div>
                        </td>

                        <td style={{ padding: '0.75rem', fontWeight: 800, color: '#b45309' }}>
                          ₹
                          {Number(i.totalCost).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </td>

                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleMarkIntakePaid(i.id)}
                            style={{
                              background: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              color: '#065f46',
                              borderRadius: '0.45rem',
                              padding: '0.4rem 0.85rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: isProcessing ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isProcessing ? 'Saving…' : '✓ Mark Paid'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. SALES RECEIVABLES VIEW                                             */}
      {/* ===================================================================== */}
      {activeTab === 'RECEIVABLES' && (
        <div>
          {receivableSales.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem 1rem',
                background: '#f8fafc',
                borderRadius: '0.75rem',
                border: '1.5px dashed #cbd5e1',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✨</div>
              <h3 style={{ margin: '0 0 0.35rem', color: '#0f172a', fontSize: '1.1rem' }}>
                No Outstanding Sales Receivables
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                All wholesale, retail, and commercial milk sale dispatches are fully paid for.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.86rem',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid #e2e8f0',
                      color: '#64748b',
                      fontSize: '0.76rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <th style={{ padding: '0.6rem 0.75rem' }}>Invoice &amp; Date</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Buyer &amp; Channel</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Volume Sold</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Total Receivable</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Payment Status</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {receivableSales.map((s) => {
                    const isProcessing = processingId === s.id;

                    return (
                      <tr
                        key={s.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Invoice & Date */}
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {s.invoiceNumber || 'INV-DIRECT'}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {s.saleDate || 'Recent'}
                          </div>
                        </td>

                        {/* Buyer & Channel */}
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.buyerName}</div>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#2563eb',
                              background: '#eff6ff',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '0.3rem',
                            }}
                          >
                            {s.buyerType?.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Volume */}
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {s.quantityLiters} L ({s.milkType})
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            @ ₹{Number(s.pricePerLiter).toFixed(2)}/L
                          </div>
                        </td>

                        {/* Amount */}
                        <td
                          style={{
                            padding: '0.75rem',
                            fontWeight: 800,
                            color: '#b45309',
                            fontSize: '1rem',
                          }}
                        >
                          ₹
                          {Number(s.totalAmount).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '0.75rem' }}>
                          <span
                            style={{
                              background: s.paymentStatus === 'PARTIAL' ? '#fef3c7' : '#fee2e2',
                              color: s.paymentStatus === 'PARTIAL' ? '#92400e' : '#b91c1c',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '0.35rem',
                            }}
                          >
                            {s.paymentStatus}
                          </span>
                          <div
                            style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}
                          >
                            Method: {s.paymentMethod || 'Credit'}
                          </div>
                        </td>

                        {/* Action */}
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleMarkSalePaid(s.id, s.buyerName)}
                            style={{
                              background: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '0.5rem',
                              padding: '0.45rem 0.95rem',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: isProcessing ? 'not-allowed' : 'pointer',
                              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                            }}
                          >
                            {isProcessing ? 'Saving…' : '✓ Mark Received'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
