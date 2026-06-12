import React, { useState, useEffect } from 'react';
import { Cpu, AlertTriangle, Play, RefreshCw, BarChart2, CheckCircle2, Award } from 'lucide-react';

export default function ModelStudio({ backendUrl }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Hyperparameters & Model Selector
  const [modelType, setModelType] = useState('random_forest');
  const [nEstimators, setNEstimators] = useState(100);
  const [maxDepth, setMaxDepth] = useState(10);

  const fetchMetrics = () => {
    setLoading(true);
    setError(null);
    
    // Fetch stats to see if model is already trained and load its type
    fetch(`${backendUrl}/api/stats`)
      .then((res) => {
        if (!res.ok) throw new Error('Could not retrieve model metrics.');
        return res.json();
      })
      .then((data) => {
        // Read current trained model details from stats
        const activeModel = data.kpis.model_type;
        setModelType(activeModel);
        
        // Retrain endpoint with current parameters is our clean way of fetching the full metrics array 
        // (accuracy, ROC, confusion matrix) for the active hyperparameter settings.
        fetch(`${backendUrl}/api/train-model`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ n_estimators: nEstimators, max_depth: maxDepth, model_type: activeModel })
        })
          .then((res) => res.json())
          .then((trainData) => {
            if (trainData.status === 'success') {
              setMetrics(trainData.metrics);
            } else {
              throw new Error('Retraining failed during metrics initialization.');
            }
            setLoading(false);
          })
          .catch((err) => {
            setError(err.message);
            setLoading(false);
          });
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMetrics();
  }, [backendUrl]);

  const handleRetrain = (e) => {
    e.preventDefault();
    setTraining(true);
    setError(null);
    setSuccessMsg('');

    fetch(`${backendUrl}/api/train-model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        n_estimators: nEstimators,
        max_depth: maxDepth,
        model_type: modelType
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Model training encountered an error.');
        return res.json();
      })
      .then((data) => {
        setMetrics(data.metrics);
        setTraining(false);
        setSuccessMsg(`${modelType === 'xgboost' ? 'XGBoost' : 'Random Forest'} model successfully trained! Accuracy: ${(data.metrics.accuracy * 100).toFixed(1)}%`);
        setTimeout(() => setSuccessMsg(''), 5000);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setTraining(false);
      });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading model evaluation matrices and hyperparameter profiles...</p>
      </div>
    );
  }

  return (
    <div className="studio-grid">
      {/* Hyperparameter Settings Control Panel */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
          <Cpu size={18} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Hyperparameter Tuner</h3>
        </div>

        <form onSubmit={handleRetrain} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="form-group">
            <label>Model Architecture</label>
            <select
              className="form-input-select"
              value={modelType}
              disabled={training}
              onChange={(e) => setModelType(e.target.value)}
            >
              <option value="random_forest">Random Forest Classifier</option>
              <option value="xgboost">XGBoost (Gradient Boosting)</option>
            </select>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Random Forest fits multiple decision trees in parallel. XGBoost fits trees sequentially to minimize residual error.
            </p>
          </div>

          <div className="form-group">
            <div className="slider-value-row">
              <label>Estimators (Number of Trees)</label>
              <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>{nEstimators}</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              step="10"
              className="slider-input"
              value={nEstimators}
              disabled={training}
              onChange={(e) => setNEstimators(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <div className="slider-value-row">
              <label>Max Tree Depth</label>
              <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>{maxDepth}</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              className="slider-input"
              value={maxDepth}
              disabled={training}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
            />
          </div>

          <button 
            type="submit" 
            className={`btn btn-primary ${training ? 'btn-disabled' : ''}`}
            style={{ justifyContent: 'center', width: '100%', padding: '0.75rem' }}
            disabled={training}
          >
            {training ? (
              <>
                <RefreshCw className="spinner" size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Fitting Estimator...
              </>
            ) : (
              <>
                <Play size={16} />
                Fit & Retrain Model
              </>
            )}
          </button>
        </form>

        {successMsg && (
          <div style={{ marginTop: '1.25rem', background: 'var(--success-glow)', border: '1px solid var(--success)', borderRadius: '6px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.85rem' }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '1.25rem', background: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: '6px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontSize: '0.85rem' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Metrics Reports and Confusion Matrix */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-card">
          <div className="chart-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={18} style={{ color: 'var(--secondary)' }} />
              <span>Model Validation Performance</span>
            </div>
            <span className="brand-tag" style={{ border: '1px solid var(--secondary)', background: 'var(--secondary-glow)', color: 'var(--secondary)' }}>
              Active: {metrics.model_type === 'xgboost' ? 'XGBoost' : 'Random Forest'}
            </span>
          </div>

          <div className="metrics-summary-grid">
            <div className="metric-mini-card">
              <div className="metric-mini-label">Classification Accuracy</div>
              <div className="metric-mini-val">{(metrics.accuracy * 100).toFixed(1)}%</div>
            </div>
            <div className="metric-mini-card">
              <div className="metric-mini-label">ROC-AUC Area Score</div>
              <div className="metric-mini-val">{(metrics.auc * 100).toFixed(1)}%</div>
            </div>
            <div className="metric-mini-card">
              <div className="metric-mini-label">Churn Precision</div>
              <div className="metric-mini-val">{(metrics.precision * 100).toFixed(1)}%</div>
            </div>
            <div className="metric-mini-card">
              <div className="metric-mini-label">Churn Recall (Sensitivity)</div>
              <div className="metric-mini-val">{(metrics.recall * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Award size={14} style={{ color: 'var(--primary)' }} />
              Comparative Architecture Notes
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {metrics.model_type === 'xgboost' ? (
                <span><strong>XGBoost (eXtreme Gradient Boosting)</strong> trains sequentially. Each new tree corrects the residual mistakes of the previous trees. It handles complex multi-feature boundaries and usually achieves higher ROC-AUC scores, though it is more sensitive to overfitting on small datasets if depth is too high.</span>
              ) : (
                <span><strong>Random Forest</strong> is an ensemble bagging method that builds independent decision trees in parallel using bootstrapped training subsets. It is extremely robust to outliers, does not overfit easily, and provides reliable baseline feature attributions.</span>
              )}
            </p>
          </div>
        </div>

        {/* Confusion Matrix Card */}
        <div className="glass-card">
          <div className="chart-title">
            <Cpu size={18} style={{ color: 'var(--primary)' }} />
            <span>Out-of-Sample Confusion Matrix</span>
          </div>

          {metrics.confusion_matrix ? (
            <table className="confusion-matrix-table">
              <thead>
                <tr>
                  <th className="cm-cell cm-header">Actual / Predicted</th>
                  <th className="cm-cell cm-header">Predicted Loyal</th>
                  <th className="cm-cell cm-header">Predicted Churn</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="cm-cell cm-header" style={{ fontWeight: '700' }}>Actual Loyal</td>
                  <td className="cm-cell cm-match">
                    <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{metrics.confusion_matrix[0][0]}</div>
                    <div style={{ fontSize: '0.7rem', opacity: '0.8', textTransform: 'uppercase' }}>True Negatives (TN)</div>
                  </td>
                  <td className="cm-cell cm-miss">
                    <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{metrics.confusion_matrix[0][1]}</div>
                    <div style={{ fontSize: '0.7rem', opacity: '0.8', textTransform: 'uppercase' }}>False Positives (FP)</div>
                  </td>
                </tr>
                <tr>
                  <td className="cm-cell cm-header" style={{ fontWeight: '700' }}>Actual Churn</td>
                  <td className="cm-cell cm-miss">
                    <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{metrics.confusion_matrix[1][0]}</div>
                    <div style={{ fontSize: '0.7rem', opacity: '0.8', textTransform: 'uppercase' }}>False Negatives (FN)</div>
                  </td>
                  <td className="cm-cell cm-match">
                    <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{metrics.confusion_matrix[1][1]}</div>
                    <div style={{ fontSize: '0.7rem', opacity: '0.8', textTransform: 'uppercase' }}>True Positives (TP)</div>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
              Confusion matrix unavailable.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
