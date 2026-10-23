/**
 * Section 1: Quick Operations (The "POS" View)
 * Command center for daily activities, optimized for speed.
 * Features Fast Milk Intake (Split UI with QR Scan + Manual Search) and Record Milk Sale quick action.
 */
export function QuickOperationsPOS({
  validatedFarmer,
  fastSearchFarmerId,
  setFastSearchFarmerId,
  fastValidating,
  fastValidationError,
  handleValidateFarmerForIntake,
  setShowFastScanner,
  fastShift,
  setFastShift,
  fastQuantity,
  setFastQuantity,
  fastFat,
  setFastFat,
  fastSnf,
  setFastSnf,
  fastMilkType,
  setFastMilkType,
  fastSubmitting,
  fastTotalCost,
  handleSubmitFastIntake,
  onResetValidatedFarmer,
  enrollments = [],
  onOpenSaleModal,
  onOpenDetailedIntakeModal,
}) {
  const activeFarmers = enrollments.filter((e) => e.status === 'ACTIVE');

  return (
    <section
      id="quick-operations-pos"
      style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)',
        color: '#ffffff',
        borderRadius: '1.25rem',
        padding: '1.75rem',
        marginBottom: '2rem',
        boxShadow: '0 12px 30px -8px rgba(6, 78, 59, 0.45)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'rgba(52, 211, 153, 0.15)',
          filter: 'blur(35px)',
          pointerEvents: 'none',
        }}
      />

      {/* Header bar with title and quick-action buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          paddingBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '0.75rem',
              background: 'rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
            }}
          >
            ⚡
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
                1. Quick Operations (POS Command Center)
              </h2>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.28)',
                  border: '1px solid #6ee7b7',
                  color: '#a7f3d0',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px',
                  letterSpacing: '0.5px',
                }}
              >
                PHASE 2 LIVE
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#a7f3d0' }}>
              Rapid daily milk intake check-in &amp; outbound sales dispatch with sub-second
              lookups.
            </p>
          </div>
        </div>

        {/* Action Button: Record Milk Sale */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onOpenDetailedIntakeModal && (
            <button
              type="button"
              onClick={onOpenDetailedIntakeModal}
              style={{
                background: 'rgba(255, 255, 255, 0.14)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                borderRadius: '0.65rem',
                padding: '0.65rem 1rem',
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Open full detailed manual intake form"
            >
              ⚙️ Detailed Form
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSaleModal}
            style={{
              background: '#ffffff',
              color: '#064e3b',
              border: 'none',
              borderRadius: '0.65rem',
              padding: '0.68rem 1.25rem',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <span style={{ fontSize: '1.1rem' }}>🥛</span>
            <span>Record Milk Sale</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* FAST MILK INTAKE: SPLIT UI (QR SCAN VS MANUAL SEARCH)                  */}
      {/* ===================================================================== */}
      {!validatedFarmer ? (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {/* Split UI Left: Scan QR Pass */}
            <div
              style={{
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: '1rem',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                border: '2px solid transparent',
                transition: 'border-color 0.2s ease',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    marginBottom: '0.4rem',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '0.5rem',
                      background: '#ecfdf5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                    }}
                  >
                    📷
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                    Fast Milk Intake: Scan QR Pass
                  </h3>
                </div>
                <p
                  style={{
                    margin: '0 0 1.25rem',
                    fontSize: '0.85rem',
                    color: '#64748b',
                    lineHeight: 1.5,
                  }}
                >
                  Farmer presents their authorized <strong>Digital Farmer Pass QR</strong> from the
                  Farmer Portal. Camera scanner recognizes and validates enrollment in &lt;1 second.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowFastScanner(true)}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.75rem',
                  padding: '0.85rem 1.25rem',
                  fontSize: '0.96rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                  transition: 'opacity 0.15s ease',
                }}
              >
                <span>📷 Open Camera QR Scanner</span>
              </button>
            </div>

            {/* Split UI Right: Manual Search Bar */}
            <div
              style={{
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: '1rem',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    marginBottom: '0.4rem',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '0.5rem',
                      background: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                    }}
                  >
                    🔍
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                    Fast Milk Intake: Manual Search
                  </h3>
                </div>
                <p
                  style={{
                    margin: '0 0 1rem',
                    fontSize: '0.85rem',
                    color: '#64748b',
                    lineHeight: 1.5,
                  }}
                >
                  Enter Farmer ID (e.g. <code>FMR-001</code>) to verify relationship and auto-fetch
                  agreed base rates and daily expected volumes.
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Enter Farmer ID..."
                    value={fastSearchFarmerId}
                    onChange={(e) => setFastSearchFarmerId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleValidateFarmerForIntake();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.72rem 0.95rem',
                      borderRadius: '0.65rem',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none',
                      color: '#0f172a',
                    }}
                  />
                  <button
                    type="button"
                    disabled={fastValidating || !fastSearchFarmerId.trim()}
                    onClick={() => handleValidateFarmerForIntake()}
                    style={{
                      background: fastValidating ? '#94a3b8' : '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '0.65rem',
                      padding: '0.72rem 1.35rem',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: fastValidating ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
                    }}
                  >
                    {fastValidating ? 'Verifying…' : 'Verify'}
                  </button>
                </div>

                {/* Quick-Pick Chips for Active Farmers */}
                {activeFarmers.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                      Quick Select Active:
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.35rem',
                        marginTop: '0.25rem',
                      }}
                    >
                      {activeFarmers.slice(0, 5).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setFastSearchFarmerId(f.farmerIdNumber);
                            handleValidateFarmerForIntake(f.farmerIdNumber);
                          }}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '0.45rem',
                            padding: '0.2rem 0.55rem',
                            fontSize: '0.76rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                            color: '#1e293b',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {f.farmerName} ({f.farmerIdNumber})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Validation Error Banner */}
          {fastValidationError && (
            <div
              style={{
                marginTop: '1.25rem',
                background: '#fef2f2',
                border: '1.5px solid #f87171',
                color: '#991b1b',
                padding: '0.85rem 1.15rem',
                borderRadius: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <span>⚠️</span>
              <span>{fastValidationError}</span>
            </div>
          )}
        </div>
      ) : (
        /* =================================================================== */
        /* VALIDATED FARMER: FAST INTAKE ENTRY FORM (POS CHECKOUT)             */
        /* =================================================================== */
        <form
          onSubmit={handleSubmitFastIntake}
          style={{
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: '1rem',
            padding: '1.75rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
            border: '2px solid #10b981',
          }}
        >
          {/* Top Banner: Farmer Info Card */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              borderBottom: '1.5px solid #e2e8f0',
              paddingBottom: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                  fontWeight: 800,
                }}
              >
                ✓
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                    {validatedFarmer.farmerName}
                  </h3>
                  <span
                    style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '0.35rem',
                    }}
                  >
                    ACTIVE ENROLLMENT
                  </span>
                </div>
                <div style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '0.2rem' }}>
                  ID: <strong>{validatedFarmer.farmerIdNumber}</strong> · Farm:{' '}
                  <strong>{validatedFarmer.farmName || 'Registered Farm'}</strong> · Area:{' '}
                  <strong>{validatedFarmer.villageArea || 'Local Route'}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  textAlign: 'right',
                  padding: '0.4rem 0.85rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.6rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: '#64748b',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Contract Base Rate
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>
                  ₹{Number(validatedFarmer.agreedRatePerLiter || 42).toFixed(2)}/L
                </div>
              </div>

              <button
                type="button"
                onClick={onResetValidatedFarmer}
                style={{
                  background: '#f1f5f9',
                  border: '1.5px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: '0.6rem',
                  padding: '0.55rem 0.95rem',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✕ Cancel / Reset
              </button>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            {/* Shift */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '0.4rem',
                }}
              >
                Shift
              </label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setFastShift('MORNING')}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.5rem',
                    borderRadius: '0.55rem',
                    border: fastShift === 'MORNING' ? '2px solid #059669' : '1px solid #cbd5e1',
                    background: fastShift === 'MORNING' ? '#ecfdf5' : '#ffffff',
                    color: fastShift === 'MORNING' ? '#065f46' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  ☀️ Morning
                </button>
                <button
                  type="button"
                  onClick={() => setFastShift('EVENING')}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.5rem',
                    borderRadius: '0.55rem',
                    border: fastShift === 'EVENING' ? '2px solid #059669' : '1px solid #cbd5e1',
                    background: fastShift === 'EVENING' ? '#ecfdf5' : '#ffffff',
                    color: fastShift === 'EVENING' ? '#065f46' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  🌙 Evening
                </button>
              </div>
            </div>

            {/* Milk Type */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '0.4rem',
                }}
              >
                Milk Type
              </label>
              <select
                value={fastMilkType}
                onChange={(e) => setFastMilkType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: '0.55rem',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  background: '#ffffff',
                  outline: 'none',
                }}
              >
                <option value="COW">Cow Milk</option>
                <option value="BUFFALO">Buffalo Milk</option>
                <option value="MIXED">Mixed Milk</option>
              </select>
            </div>

            {/* Quantity in Liters */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '0.4rem',
                }}
              >
                Quantity (Liters) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="5000"
                value={fastQuantity}
                onChange={(e) => setFastQuantity(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: '0.55rem',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Fat % */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '0.4rem',
                }}
              >
                Fat %
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="15.0"
                value={fastFat}
                onChange={(e) => setFastFat(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: '0.55rem',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.95rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* SNF % */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '0.4rem',
                }}
              >
                SNF %
              </label>
              <input
                type="number"
                step="0.1"
                min="5.0"
                max="15.0"
                value={fastSnf}
                onChange={(e) => setFastSnf(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: '0.55rem',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.95rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Bottom Bar: Live Payout Calculation & Instant Submit */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                }}
              >
                Estimated Farmer Payout
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#059669' }}>
                ₹
                {Number(fastTotalCost || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                Formula: {fastQuantity || 0} L × ₹
                {Number(validatedFarmer.agreedRatePerLiter || 42).toFixed(2)}/L
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onResetValidatedFarmer}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: '0.65rem',
                  padding: '0.8rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>

              <button
                type="submit"
                disabled={fastSubmitting}
                style={{
                  background: fastSubmitting
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.65rem',
                  padding: '0.8rem 2rem',
                  fontSize: '1rem',
                  fontWeight: 800,
                  cursor: fastSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 16px rgba(5, 150, 105, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {fastSubmitting ? (
                  <span>Logging Intake…</span>
                ) : (
                  <>
                    <span>✅ Confirm &amp; Log Milk Intake</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
