import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, User, AlertCircle, Sparkles } from 'lucide-react';

export default function CustomerProfiler({ backendUrl, onSelectCustomerForPlan }) {
  const [customers, setCustomers] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  
  const [selectedCust, setSelectedCust] = useState(null);
  const [simulatedCust, setSimulatedCust] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loadingPred, setLoadingPred] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Fetch customer list
  const fetchCustomers = useCallback(() => {
    setLoadingList(true);
    let url = `${backendUrl}/api/customers?page=${page}&limit=12`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (riskFilter) url += `&risk_filter=${riskFilter}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setCustomers(data.customers);
        setTotalCustomers(data.total);
        setLoadingList(false);
        // Auto-select first customer if none selected yet
        if (data.customers.length > 0 && !selectedCust) {
          handleSelectCustomer(data.customers[0]);
        }
      })
      .catch((err) => {
        console.error('Error fetching customer directory:', err);
        setLoadingList(false);
      });
  }, [page, search, riskFilter, backendUrl]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Handle selection of a customer
  const handleSelectCustomer = (customer) => {
    setSelectedCust(customer);
    // Initialize simulation state with raw customer features
    setSimulatedCust({ ...customer });
    setSimulating(false);
    fetchPrediction(customer);
  };

  // Fetch prediction details for selected or simulated customer
  const fetchPrediction = (customerData) => {
    setLoadingPred(true);
    fetch(`${backendUrl}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData),
    })
      .then((res) => res.json())
      .then((data) => {
        setPrediction(data);
        setLoadingPred(false);
      })
      .catch((err) => {
        console.error('Prediction retrieval error:', err);
        setLoadingPred(false);
      });
  };

  // Handle "What-If" input updates
  const handleSimulateChange = (field, value) => {
    setSimulating(true);
    const updated = { ...simulatedCust, [field]: value };
    
    // Auto-calculate TotalCharges if tenure or monthly charges change
    if (field === 'tenure' || field === 'MonthlyCharges') {
      updated.TotalCharges = Number(updated.tenure) * Number(updated.MonthlyCharges);
    }
    
    setSimulatedCust(updated);
    fetchPrediction(updated);
  };

  // Reset simulation back to real customer values
  const handleResetSimulation = () => {
    setSimulating(false);
    setSimulatedCust({ ...selectedCust });
    fetchPrediction(selectedCust);
  };

  // Pagination controls
  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page * 12 < totalCustomers) setPage(page + 1);
  };

  // Helper for radial gauge variables
  const radius = 70;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = prediction 
    ? circumference - (prediction.churn_probability) * circumference 
    : circumference;

  // Determine gauge color
  const getRiskColor = (prob) => {
    if (prob >= 0.6) return 'var(--danger)';
    if (prob >= 0.3) return 'var(--warning)';
    return 'var(--success)';
  };

  return (
    <div className="profiler-container">
      {/* Sidebar: Customer Search & Selection */}
      <div className="glass-card customer-list-panel">
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.75rem' }}>Customer Portfolio</h3>
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search Customer ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select 
            className="form-input-select" 
            value={riskFilter}
            onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Risk Levels</option>
            <option value="High">High Risk (≥60%)</option>
            <option value="Medium">Medium Risk (30%-60%)</option>
            <option value="Low">Low Risk (&lt;30%)</option>
          </select>
        </div>

        <div className="customers-scroll-list">
          {loadingList ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
              <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto 0.5rem' }}></div>
              <span>Searching portfolio...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <AlertCircle size={24} className="empty-icon" />
              <span>No customers found matching queries.</span>
            </div>
          ) : (
            customers.map((c) => (
              <div
                key={c.customerID}
                className={`customer-item ${selectedCust?.customerID === c.customerID ? 'selected' : ''}`}
                onClick={() => handleSelectCustomer(c)}
              >
                <div>
                  <div className="cust-id-label">{c.customerID}</div>
                  <div className="cust-sub-details">
                    {c.Contract} • {c.tenure} mo • ${c.MonthlyCharges}
                  </div>
                </div>
                <span className={`risk-badge ${c.risk_level.toLowerCase()}`}>
                  {c.risk_level}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Pagination footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handlePrevPage} 
            disabled={page === 1}
            style={{ padding: '0.35rem 0.65rem' }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Page {page} of {Math.ceil(totalCustomers / 12) || 1}
          </span>
          <button 
            className="btn btn-secondary" 
            onClick={handleNextPage} 
            disabled={page * 12 >= totalCustomers}
            style={{ padding: '0.35rem 0.65rem' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Details Panel */}
      {selectedCust && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <div className="profile-card-header">
              <div className="profile-title-block">
                <h2>Customer Risk Profile</h2>
                <p>
                  ID: <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>{selectedCust.customerID}</span> &bull; {selectedCust.gender} &bull; Senior: {selectedCust.SeniorCitizen === 1 ? 'Yes' : 'No'} &bull; Partner: {selectedCust.Partner}
                </p>
              </div>
              {simulating && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" onClick={handleResetSimulation} style={{ padding: '0.4rem 0.8rem' }}>
                    Reset Sim
                  </button>
                  <span className="brand-tag" style={{ border: '1px solid var(--warning)', background: 'var(--warning-glow)', color: 'var(--warning)' }}>
                    Simulated Active
                  </span>
                </div>
              )}
            </div>

            <div className="profile-details-grid">
              {/* Left Column: Radial Churn Gauge */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border-light)', paddingRight: '1rem' }}>
                <div className="gauge-container">
                  <svg className="gauge-svg">
                    <circle
                      className="gauge-bg-circle"
                      r={normalizedRadius}
                      cx={radius}
                      cy={radius}
                    />
                    <circle
                      className="gauge-fill-circle"
                      stroke={prediction ? getRiskColor(prediction.churn_probability) : 'var(--primary)'}
                      fill="transparent"
                      strokeDasharray={circumference + ' ' + circumference}
                      style={{ strokeDashoffset }}
                      r={normalizedRadius}
                      cx={radius}
                      cy={radius}
                    />
                  </svg>
                  <div className="gauge-text-overlay">
                    <span className="gauge-value">
                      {prediction ? `${(prediction.churn_probability * 100).toFixed(0)}%` : '...'}
                    </span>
                    <span className="gauge-label">
                      {prediction ? `${prediction.risk_level} Risk` : 'Loading'}
                    </span>
                  </div>
                </div>
                
                {prediction && (
                  <button 
                    className="btn btn-primary"
                    style={{ marginTop: '1rem', width: '100%', maxWidth: '240px', justifyContent: 'center' }}
                    onClick={() => onSelectCustomerForPlan(simulatedCust, prediction)}
                  >
                    <Sparkles size={16} />
                    Run AI Retention Strategy
                  </button>
                )}
              </div>

              {/* Right Column: SHAP Waterfall / Local Factor Breakdowns */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Primary Risk / Benefit Drivers
                </h4>
                
                {loadingPred ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '0.5rem' }}>
                    <div className="spinner" style={{ width: '1.5rem', height: '1.5rem' }}></div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Recalculating ML model insights...</span>
                  </div>
                ) : prediction?.contributions.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem' }}>
                    Account features match historical averages. Churn risk is stable.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {prediction?.contributions.map((c, idx) => (
                      <div className="factor-row" key={idx}>
                        <span className="factor-desc" title={c.text}>{c.text}</span>
                        <div className="factor-bar-track">
                          <div
                            className={`factor-bar ${c.type}`}
                            style={{ width: `${Math.abs(c.impact) * 200}%` }}
                          ></div>
                        </div>
                        <span className={`factor-impact ${c.type}`}>
                          {c.impact > 0 ? '+' : ''}{(c.impact * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive What-If Simulation Settings */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <Sparkles size={18} style={{ color: 'var(--secondary)' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>"What-If" Retention Simulator</h3>
            </div>
            
            <div className="whatif-grid">
              <div className="form-group">
                <div className="slider-value-row">
                  <label>Tenure (Loyalty Months)</label>
                  <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>{simulatedCust.tenure} mo</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="72"
                  className="slider-input"
                  value={simulatedCust.tenure}
                  onChange={(e) => handleSimulateChange('tenure', Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <div className="slider-value-row">
                  <label>Monthly Charges</label>
                  <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>${simulatedCust.MonthlyCharges}</span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="120"
                  className="slider-input"
                  value={simulatedCust.MonthlyCharges}
                  onChange={(e) => handleSimulateChange('MonthlyCharges', Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Contract Type</label>
                <select
                  className="form-input-select"
                  value={simulatedCust.Contract}
                  onChange={(e) => handleSimulateChange('Contract', e.target.value)}
                >
                  <option value="Month-to-month">Month-to-month</option>
                  <option value="One year">One year</option>
                  <option value="Two year">Two year</option>
                </select>
              </div>

              <div className="form-group">
                <label>Internet Service</label>
                <select
                  className="form-input-select"
                  value={simulatedCust.InternetService}
                  onChange={(e) => handleSimulateChange('InternetService', e.target.value)}
                >
                  <option value="Fiber optic">Fiber optic</option>
                  <option value="DSL">DSL</option>
                  <option value="No">No Internet Service</option>
                </select>
              </div>

              <div className="form-group">
                <label>Technical Support</label>
                <select
                  className="form-input-select"
                  value={simulatedCust.TechSupport}
                  onChange={(e) => handleSimulateChange('TechSupport', e.target.value)}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="No internet service">No internet service</option>
                </select>
              </div>

              <div className="form-group">
                <label>Online Security</label>
                <select
                  className="form-input-select"
                  value={simulatedCust.OnlineSecurity}
                  onChange={(e) => handleSimulateChange('OnlineSecurity', e.target.value)}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="No internet service">No internet service</option>
                </select>
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <select
                  className="form-input-select"
                  value={simulatedCust.PaymentMethod}
                  onChange={(e) => handleSimulateChange('PaymentMethod', e.target.value)}
                >
                  <option value="Electronic check">Electronic check</option>
                  <option value="Mailed check">Mailed check</option>
                  <option value="Credit card (automatic)">Credit card (automatic)</option>
                  <option value="Bank transfer (automatic)">Bank transfer (automatic)</option>
                </select>
              </div>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1.25rem', fontStyle: 'italic' }}>
              *Adjust features above to test business decisions (e.g. extending contract term or proposing discounts) and see how the machine learning model adjusts the customer's churn risk.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
