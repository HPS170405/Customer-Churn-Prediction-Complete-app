import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Copy, Check, FileText, AlertTriangle, Send, ShieldAlert, Cpu, MessageSquare } from 'lucide-react';

export default function AICopilot({ backendUrl, selectedCustomer, customerPrediction, apiKey }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // Conversational Coach Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  const chatEndRef = useRef(null);
  const lastProcessedId = useRef(null);

  // Initialize chat when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      setChatMessages([
        {
          sender: 'assistant',
          text: `Hello! I am your AI Churn Coach. I've analyzed account ${selectedCustomer.customerID}. They have a tenure of ${selectedCustomer.tenure} months on a ${selectedCustomer.Contract} contract, paying $${selectedCustomer.MonthlyCharges}/mo.\n\nAsk me how to save them, ask for specific discount playbooks, or say "write a sms draft".`
        }
      ]);
    }
  }, [selectedCustomer]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const generateStrategy = (customer) => {
    if (!customer) return;
    
    setLoading(true);
    setError(null);
    lastProcessedId.current = customer.customerID;

    fetch(`${backendUrl}/api/retention-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_data: customer,
        api_key: apiKey || null
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to generate retention strategy.');
        return res.json();
      })
      .then((data) => {
        setResult(data.retention_plan);
        setLoading(false);
      })
      .catch((err) => {
        console.error('RAG Strategy error:', err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (selectedCustomer && selectedCustomer.customerID !== lastProcessedId.current) {
      generateStrategy(selectedCustomer);
    }
  }, [selectedCustomer]);

  // Submit Chat Message
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    
    const userMsg = chatInput.trim();
    const updatedMessages = [...chatMessages, { sender: 'user', text: userMsg }];
    
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);

    fetch(`${backendUrl}/api/chat-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_data: selectedCustomer,
        chat_history: updatedMessages.slice(0, -1), // Send previous messages
        message: userMsg,
        api_key: apiKey || null
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('AI Coach chatbot failed to respond.');
        return res.json();
      })
      .then((data) => {
        setChatMessages([...updatedMessages, { sender: 'assistant', text: data.response }]);
        setChatLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setChatMessages([...updatedMessages, { sender: 'assistant', text: `Sorry, I ran into an issue: ${err.message}` }]);
        setChatLoading(false);
      });
  };

  const handleCopyEmail = () => {
    if (!result?.email_body) return;
    navigator.clipboard.writeText(result.email_body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!selectedCustomer) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <Sparkles size={48} style={{ color: 'var(--primary)', marginBottom: '1.25rem', animation: 'pulse 2s infinite' }} />
        <h3>AI Retention Co-Pilot</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '450px', margin: '0.5rem auto' }}>
          Please go to the <strong>Customer Profiler</strong> tab and select a customer.
          The AI Copilot will automatically analyze their risk profile and draft a custom retention strategy.
        </p>
      </div>
    );
  }

  return (
    <div className="ai-copilot-container">
      {/* Left Column: Retrieved Policies & Overview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} style={{ color: 'var(--secondary)' }} />
              RAG Playbook Retrieval
            </h3>
            <span className="brand-tag">Knowledge Base</span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
            Our RAG (Retrieval-Augmented Generation) pipeline scans corporate retention playbooks for matches against the customer's risk vectors. These playbooks are injected into the AI prompt to draft compliant offers.
          </p>

          <div className="policies-list">
            {loading ? (
              <div style={{ padding: '2rem 0', textAlign: 'center' }}>
                <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto 0.5rem' }}></div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Searching playbooks...</span>
              </div>
            ) : result?.retrieved_policies && result.retrieved_policies.length > 0 ? (
              result.retrieved_policies.map((p, idx) => (
                <div className="policy-item" key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="policy-badge">Playbook #{idx + 1}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target: {p.risk_factors.join(', ')}</span>
                  </div>
                  <h4 className="policy-title">{p.name}</h4>
                  <p className="policy-desc">{p.description}</p>
                  <div className="policy-steps">
                    {p.action_steps.slice(0, 2).map((s, sIdx) => (
                      <span key={sIdx}>&bull; {s}</span>
                    ))}
                    {p.action_steps.length > 2 && <span style={{ color: 'var(--text-muted)' }}>+{p.action_steps.length - 2} more steps...</span>}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No active playbooks retrieved.
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Strategist Controls
          </h4>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1, justifyContent: 'center' }} 
              onClick={() => generateStrategy(selectedCustomer)}
              disabled={loading}
            >
              Regenerate Plan
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Current Target: <strong style={{ color: 'var(--text-secondary)' }}>{selectedCustomer.customerID}</strong> (Risk: {(customerPrediction?.churn_probability * 100).toFixed(0)}%)
          </p>
        </div>
      </div>

      {/* Right Column: AI Outputs */}
      <div className="ai-results-panel">
        {loading ? (
          <div className="glass-card loading-container" style={{ minHeight: '400px' }}>
            <Cpu size={40} style={{ color: 'var(--primary)', animation: 'spin 2s linear infinite' }} />
            <h3>Consulting AI retention co-pilot...</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Synthesizing local ML outputs, retrieved corporate policy briefs, and writing communications templates...
            </p>
          </div>
        ) : error ? (
          <div className="glass-card danger-glow" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <AlertTriangle size={36} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
            <h4>Failed to Consult AI Assistant</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{error}</p>
            <button className="btn btn-primary" style={{ margin: '1rem auto 0' }} onClick={() => generateStrategy(selectedCustomer)}>
              Retry Request
            </button>
          </div>
        ) : result ? (
          <>
            {/* Strategy Card */}
            <div className="glass-card ai-card-accent">
              <div className="chart-title" style={{ borderBottom: 'none', marginBottom: '0.5rem' }}>
                <Sparkles size={18} style={{ color: 'var(--primary)' }} />
                <span>AI Risk Assessment & Retention Mandate</span>
              </div>
              <p className="ai-text">{result.analysis}</p>
            </div>

            {/* Negotiation Roadmap */}
            <div className="glass-card">
              <div className="chart-title">
                <Send size={16} style={{ color: 'var(--secondary)' }} />
                <span>Negotiation Agent Roadmap</span>
              </div>
              <div className="roadmap-list">
                {result.roadmap && result.roadmap.map((step, idx) => (
                  <div className="roadmap-step" key={idx}>
                    <span className="step-num">0{idx + 1}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Drafting */}
            <div className="glass-card">
              <div style={{ display: 'flex', justify_content: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Cpu size={16} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: '600' }}>Custom Outreach Draft</span>
                </div>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleCopyEmail}
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '0.35rem' }}
                >
                  {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Template'}
                </button>
              </div>
              
              <textarea
                className="email-editor"
                value={result.email_body}
                readOnly
              />
            </div>

            {/* AI Retention Coach Chatbot */}
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: '600' }}>Interactive Churn Coach Chat</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Ask the virtual strategist for advice on retaining this customer in real-time.
              </p>
              
              <div className="chat-container">
                <div className="chat-header">
                  <Cpu size={14} style={{ color: 'var(--secondary)' }} />
                  <span>CS Agent Chat Room</span>
                </div>
                
                <div className="chat-messages">
                  {chatMessages.map((msg, idx) => (
                    <div className={`chat-bubble ${msg.sender}`} key={idx}>
                      {msg.text}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="coach-typing">
                      Coach is formulating retention guidelines...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                <form className="chat-input-form" onSubmit={handleSendChat}>
                  <input
                    type="text"
                    className="chat-input"
                    placeholder="Ask Coach: 'Draft SMS' or 'Objection pricing'..."
                    value={chatInput}
                    disabled={chatLoading}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 0.8rem' }} disabled={chatLoading}>
                    <Send size={14} />
                  </button>
                </form>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {result.using_fallback ? (
                    <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <ShieldAlert size={12} />
                      Local Fallback Agent Chat active.
                    </span>
                  ) : (
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Cpu size={12} />
                      Generative Chat via Gemini API active.
                    </span>
                  )}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="glass-card loading-container" style={{ minHeight: '400px' }}>
            <Cpu size={40} style={{ color: 'var(--text-muted)' }} />
            <h3>Waiting for strategy generation...</h3>
          </div>
        )}
      </div>
    </div>
  );
}
