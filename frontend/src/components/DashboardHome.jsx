import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, DollarSign, Calendar, TrendingUp, Info, BarChart2, ShieldAlert, Award } from 'lucide-react';

export default function DashboardHome({ backendUrl }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Business ROI State
  const [retentionRate, setRetentionRate] = useState(30);

  useEffect(() => {
    fetch(`${backendUrl}/api/stats`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch analytics statistics.');
        return res.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [backendUrl]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Analyzing customer portfolio and training metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card danger-glow" style={{ textAlign: 'center', padding: '3rem' }}>
        <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
        <h3>Analytics Dashboard Unavailable</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{error}</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
          Please make sure the FastAPI backend server is running on port 8000.
        </p>
      </div>
    );
  }

  const { kpis, charts, cohorts } = stats;

  // Calculate simulated business savings
  const monthlyRevenueAtRisk = kpis.revenue_at_risk;
  const simulatedMonthlySavings = monthlyRevenueAtRisk * (retentionRate / 100);
  const simulatedAnnualSavings = simulatedMonthlySavings * 12;

  return (
    <div>
      {/* Active Model Architecture Alert */}
      <div 
        className="glass-card" 
        style={{ 
          marginBottom: '1.5rem', 
          padding: '0.75rem 1.25rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          align_items: 'center',
          background: 'linear-gradient(90deg, rgba(99,102,241,0.06), rgba(6,182,212,0.06))',
          borderLeft: '4px solid var(--primary)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={16} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
            Active Predictor Model: <strong style={{ textTransform: 'uppercase', color: 'var(--secondary)' }}>{kpis.model_type.replace('_', ' ')}</strong>
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          *Tweak model parameters in the Model Studio tab
        </span>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid">
        <div className="glass-card kpi-card">
          <div className="kpi-header">
            <span>Total Subscribers</span>
            <div className="kpi-icon" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-value">{kpis.total_customers.toLocaleString()}</div>
          <div className="kpi-footer">
            <TrendingUp size={14} style={{ color: 'var(--success)' }} />
            <span style={{ color: 'var(--success)', fontWeight: '600' }}>Active Accounts</span>
          </div>
        </div>

        <div className="glass-card kpi-card danger-glow">
          <div className="kpi-header">
            <span>Portfolio Churn Risk</span>
            <div className="kpi-icon" style={{ background: 'var(--danger-glow)', color: 'var(--danger)' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="kpi-value">{(kpis.avg_churn_probability * 100).toFixed(1)}%</div>
          <div className="kpi-footer">
            <span style={{ color: 'var(--danger)', fontWeight: '600' }}>{kpis.high_risk_count} Customers</span>
            <span style={{ color: 'var(--text-secondary)' }}>at high risk</span>
          </div>
        </div>

        <div className="glass-card kpi-card danger-glow">
          <div className="kpi-header">
            <span>Monthly Revenue At Risk</span>
            <div className="kpi-icon" style={{ background: 'var(--danger-glow)', color: 'var(--danger)' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="kpi-value">${kpis.revenue_at_risk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="kpi-footer">
            <span style={{ color: 'var(--text-secondary)' }}>Vulnerable monthly billing</span>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-header">
            <span>Average Loyalty</span>
            <div className="kpi-icon" style={{ background: 'var(--secondary-glow)', color: 'var(--secondary)' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div className="kpi-value">{kpis.avg_tenure} mo</div>
          <div className="kpi-footer">
            <span style={{ color: 'var(--text-secondary)' }}>Average customer tenure</span>
          </div>
        </div>
      </div>

      {/* Cohorts Campaign Section */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ShieldAlert size={18} style={{ color: 'var(--secondary)' }} />
        Actionable Churn Risk Cohorts
      </h3>
      <div className="cohorts-grid">
        <div className="glass-card cohort-card">
          <span className="risk-badge high">Price Sensitive</span>
          <div className="cohort-count">{cohorts.price_sensitive}</div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Month-to-month contract & billing monthly charges &gt; $70.
          </p>
        </div>

        <div className="glass-card cohort-card">
          <span className="risk-badge high" style={{ background: 'var(--warning-glow)', color: 'var(--warning)', borderColor: 'rgba(245,158,11,0.3)' }}>Unprotected Users</span>
          <div className="cohort-count">{cohorts.unprotected}</div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Fiber optic internet but missing online security service.
          </p>
        </div>

        <div className="glass-card cohort-card">
          <span className="risk-badge high">Early Loyalty Friction</span>
          <div className="cohort-count">{cohorts.early_friction}</div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Tenure &lt; 12 months with model churn probability &gt; 50%.
          </p>
        </div>

        <div className="glass-card cohort-card">
          <span className="risk-badge high" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }}>Payment Friction</span>
          <div className="cohort-count">{cohorts.payment_friction}</div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Pays manually via check with churn probability &gt; 40%.
          </p>
        </div>
      </div>

      {/* ROI & Features Row */}
      <div className="chart-grid">
        {/* Interactive Business ROI Simulator */}
        <div className="glass-card">
          <div className="chart-title">
            <DollarSign size={18} style={{ color: 'var(--success)' }} />
            <span>Business ROI & Saved ARR Simulator</span>
          </div>
          
          <div className="roi-container">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Translate model accuracy directly into corporate finance value. Adjust the slider to represent the success rate of your customer success campaigns using the AI Co-Pilot recommendations.
            </p>
            
            <div className="roi-slider-container">
              <div className="slider-value-row" style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>CS Campaign Success Rate</span>
                <span style={{ color: 'var(--success)', fontWeight: '700', fontSize: '0.95rem' }}>{retentionRate}% Success</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                className="slider-input"
                style={{ accentColor: 'var(--success)' }}
                value={retentionRate}
                onChange={(e) => setRetentionRate(Number(e.target.value))}
              />
            </div>

            <div className="roi-metrics-grid">
              <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', padding: '1rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Monthly Saved MRR</span>
                <div className="roi-metric-val">${simulatedMonthlySavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', padding: '1rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Annual Saved ARR</span>
                <div className="roi-metric-val" style={{ background: 'linear-gradient(to right, #60a5fa, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  ${simulatedAnnualSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            
            <div style={{ background: 'var(--success-glow)', border: '1px solid rgba(16,185,129,0.2)', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--success)', lineHeight: '1.4' }}>
              <strong>Business Impact Summary:</strong> By successfully recovering {retentionRate}% of high-risk customers, the business preserves <strong>${simulatedAnnualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> in Annual Recurring Revenue (ARR), yielding immediate dividends on the AI churn deployment cost.
            </div>
          </div>
        </div>

        {/* Feature Importance Chart */}
        <div className="glass-card">
          <div className="chart-title">
            <BarChart2 size={18} style={{ color: 'var(--primary)' }} />
            <span>Top ML Churn Drivers (Feature Importance)</span>
          </div>
          <div className="bar-chart-container">
            {charts.feature_importance && charts.feature_importance.map((item, idx) => (
              <div className="bar-row" key={idx}>
                <div className="bar-label-row">
                  <span className="bar-label">{item.feature}</span>
                  <span className="bar-value">{(item.importance * 100).toFixed(1)}%</span>
                </div>
                <div className="bar-track">
                  <div 
                    className="bar-fill" 
                    style={{ 
                      width: `${item.importance * 100}%`,
                      background: 'linear-gradient(90deg, var(--primary), var(--secondary))'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="chart-grid">
        <div className="glass-card">
          <div className="chart-title">
            <Info size={18} style={{ color: 'var(--secondary)' }} />
            <span>Risk by Contract Type</span>
          </div>
          <div className="bar-chart-container">
            {charts.contract && charts.contract.map((item, idx) => (
              <div className="bar-row" key={idx}>
                <div className="bar-label-row">
                  <span className="bar-label">{item.contract}</span>
                  <span className="bar-value">{(item.avg_risk * 100).toFixed(1)}% risk</span>
                </div>
                <div className="bar-track">
                  <div 
                    className="bar-fill" 
                    style={{ 
                      width: `${item.avg_risk * 100}%`,
                      background: item.avg_risk > 0.45 ? 'linear-gradient(90deg, var(--danger), var(--warning))' : 'linear-gradient(90deg, var(--success), var(--secondary))'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <div className="chart-title">
            <Info size={18} style={{ color: 'var(--secondary)' }} />
            <span>Risk by Payment Method</span>
          </div>
          <div className="bar-chart-container">
            {charts.payment && charts.payment.map((item, idx) => (
              <div className="bar-row" key={idx}>
                <div className="bar-label-row">
                  <span className="bar-label">{item.method}</span>
                  <span className="bar-value">{(item.avg_risk * 100).toFixed(1)}% risk</span>
                </div>
                <div className="bar-track">
                  <div 
                    className="bar-fill" 
                    style={{ 
                      width: `${item.avg_risk * 100}%`,
                      background: item.avg_risk > 0.35 ? 'linear-gradient(90deg, var(--danger), var(--warning))' : 'linear-gradient(90deg, var(--success), var(--secondary))'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
