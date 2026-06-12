import React, { useState, useEffect } from 'react';
import './styles/dashboard.css';
import DashboardHome from './components/DashboardHome';
import CustomerProfiler from './components/CustomerProfiler';
import AICopilot from './components/AICopilot';
import ModelStudio from './components/ModelStudio';
import { BarChart3, Users, Sparkles, Cpu } from 'lucide-react';

const BACKEND_URL = 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerPrediction, setCustomerPrediction] = useState(null);
  
  // Manage Gemini API Key in state and LocalStorage
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });

  const handleApiKeyChange = (e) => {
    const key = e.target.value;
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const handleSelectCustomerForPlan = (customer, prediction) => {
    setSelectedCustomer(customer);
    setCustomerPrediction(prediction);
    setActiveTab('copilot'); // Auto-switch tab to AI Copilot
  };

  return (
    <div className="app-container">
      {/* Premium Dark Navigation Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">CS</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="brand-name">ChurnShield AI</span>
              <span className="brand-tag">v1.0</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Churn Analytics & AI Retention Co-Pilot
            </span>
          </div>
        </div>

        {/* Tab navigation links */}
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart3 size={16} />
            <span>Dashboard</span>
          </button>
          
          <button
            className={`nav-tab ${activeTab === 'profiler' ? 'active' : ''}`}
            onClick={() => setActiveTab('profiler')}
          >
            <Users size={16} />
            <span>Profiler & Sim</span>
          </button>
          
          <button
            className={`nav-tab ${activeTab === 'copilot' ? 'active' : ''}`}
            onClick={() => setActiveTab('copilot')}
          >
            <Sparkles size={16} />
            <span>AI Copilot</span>
          </button>
          
          <button
            className={`nav-tab ${activeTab === 'studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('studio')}
          >
            <Cpu size={16} />
            <span>Model Studio</span>
          </button>
        </nav>

        {/* API key configuration block */}
        <div className="api-key-config">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gemini API Key:</span>
          <input
            type="password"
            className="api-key-input"
            placeholder="AI Key (Optional)..."
            value={apiKey}
            onChange={handleApiKeyChange}
            title="Optional. Provide a Google Gemini API Key to enable live generative AI summaries. If left blank, a highly descriptive local rule-based strategist will execute."
          />
          {apiKey ? (
            <span className="brand-tag" style={{ border: '1px solid var(--success)', background: 'var(--success-glow)', color: 'var(--success)' }}>
              Live RAG
            </span>
          ) : (
            <span className="brand-tag" style={{ border: '1px solid var(--text-muted)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)' }}>
              Fallback
            </span>
          )}
        </div>
      </header>

      {/* Main Page Area */}
      <main className="dashboard-main">
        {activeTab === 'dashboard' && (
          <DashboardHome backendUrl={BACKEND_URL} />
        )}
        
        {activeTab === 'profiler' && (
          <CustomerProfiler 
            backendUrl={BACKEND_URL} 
            onSelectCustomerForPlan={handleSelectCustomerForPlan}
          />
        )}
        
        {activeTab === 'copilot' && (
          <AICopilot 
            backendUrl={BACKEND_URL}
            selectedCustomer={selectedCustomer}
            customerPrediction={customerPrediction}
            apiKey={apiKey}
          />
        )}
        
        {activeTab === 'studio' && (
          <ModelStudio backendUrl={BACKEND_URL} />
        )}
      </main>
    </div>
  );
}

export default App;
