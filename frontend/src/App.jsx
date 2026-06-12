import React, { useState, useEffect } from 'react';
import './styles/dashboard.css';
import DashboardHome from './components/DashboardHome';
import CustomerProfiler from './components/CustomerProfiler';
import AICopilot from './components/AICopilot';
import ModelStudio from './components/ModelStudio';
import { BarChart3, Users, Sparkles, Cpu } from 'lucide-react';

const BACKEND_URL = 'https://customer-churn-prediction-complete-app.onrender.com';

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

        {/* API key configuration block & GitHub link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
          
          <a
            href="https://github.com/HPS170405/Customer-Churn-Prediction-Complete-app"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ 
              padding: '0.45rem 0.75rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              textDecoration: 'none',
              fontSize: '0.85rem'
            }}
          >
            <svg 
              className="lucide lucide-github" 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
            <span>Code Repo</span>
          </a>
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
