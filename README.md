# ChurnShield AI: Predictive Customer Churn Dashboard & AI Retention Co-Pilot

**ChurnShield AI** is an end-to-end Machine Learning and Generative AI (RAG) customer retention application. Built for corporate customer success teams, this project transitions raw data insights into immediate retention actions, featuring a custom ML predictive pipeline, a "What-If" simulator, a Retrieval-Augmented Generation (RAG) assistant, and a live Model Tuning Studio.

Designed specifically to demonstrate full-stack engineering, machine learning modeling, and generative AI integration for technology placement portfolios.

---

## Key Features

1. **Executive Dashboard Analytics**
   - High-level KPIs representing Customer Lifetime Value metrics: Active Subscribers, Portfolio Churn Risk, Revenue at Risk (MRR), and Average Customer Loyalty.
   - Visual charts detailing churn correlations across contracts, payment methods, and internet service choices.

2. **Customer Risk Profiler & "What-If" Simulator**
   - Searchable customer directory sorted dynamically by model-calculated churn probabilities.
   - **Radial Progress Gauge**: Displays predicted churn risk instantly.
   - **Local Explainer (SHAP-like LOCO model)**: Outlines the exact mathematical reasons *why* a customer is flagged for churn (e.g. Month-to-month contract adding +32% risk, or long tenure reducing risk by -18%).
   - **Interactive Simulator**: Recruiters can toggle features (e.g., adding tech support, changing billing type, adjusting monthly charges) and watch the churn probability gauge update in real-time.

3. **AI Retention Co-Pilot (RAG Agent)**
   - **RAG Retrieval**: Programmatically searches a database of corporate retention strategies (e.g. contract upgrades, pricing adjustments, technical intervention protocols) based on customer risk profiles.
   - **LLM Synthesis**: Passes customer data and matching corporate playbooks to Google Gemini (`gemini-1.5-flash`) to generate:
     - A business-case risk analysis summary.
     - A step-by-step agent roadmap for negotiation.
     - A personalized, context-aware customer email template.
   - **Graceful Fallback**: Dynamically executes a highly structured, custom rule-based strategist if no API key is provided, ensuring 100% out-of-the-box runnability.

4. **Model Tuning Studio**
   - Inspects out-of-sample ML metrics: classification accuracy, F1-score, precision, recall, and ROC-AUC area.
   - **Confusion Matrix Grid**: Interactive visual representation of True/False Positives and Negatives.
   - **Live Hyperparameter Retraining**: Lets users adjust estimators (number of decision trees) and max split depth, click "Train", and animate the fitting process to watch validation metrics update in real-time.

---

## Tech Stack & Project Architecture

```
                                  +-----------------------+
                                  |    React Frontend     |
                                  |     (Vite + CSS)      |
                                  +-----------+-----------+
                                              |
                                              | HTTP REST Requests
                                              v
                                  +-----------------------+
                                  |    FastAPI Backend    |
                                  +-----+-----------+-----+
                                        |           |
                   +--------------------+           +--------------------+
                   |                                                     |
                   v                                                     v
      +-----------------------+                             +-----------------------+
      |  ML Model Pipeline    |                             |      RAG Engine       |
      |   (Scikit-Learn RF)   |                             |    (Gemini API +      |
      +-----------------------+                             |    policies.json)     |
                                                            +-----------------------+
```

### Backend (Python)
- **FastAPI**: Asynchronous REST API serving predictions, statistics, and training routes.
- **Scikit-Learn**: ColumnTransformer preprocessing pipelines, Standard Scaling, One-Hot Encoding, and Random Forest classification.
- **Joblib**: Caches and serializes the preprocessing pipeline and trained estimators.
- **Google Generative AI**: Drives the Generative RAG completion engine.

### Frontend (React & CSS)
- **Vite & React**: Hot-reloading module bundler and reactive single-page app framework.
- **Vanilla CSS (Design Tokens)**: Modern, custom dark-theme glassmorphism utilizing CSS variables, glowing borders, flex/grid layouts, SVG gauges, and animations.
- **Lucide Icons**: Premium UI vector icons.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### 1. Run Backend Server
Navigate to the backend directory, install packages, and launch Uvicorn:

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
On startup, the backend will automatically download the classic **IBM Telco Customer Churn dataset** (or generate a matching 1,500-customer synthetic sample if offline) and fit the initial model.

*API Docs will be available at:* `http://localhost:8000/docs`

### 2. Run Frontend Dashboard
Open a new terminal window, navigate to the frontend directory, install dependencies, and start the Vite development server:

```bash
cd frontend
npm install
npm run dev
```

*Vite Dev Server will launch at:* `http://localhost:5173`

---

## Machine Learning Rationale

In real-world telco retention, raw accuracy can be a deceptive metric. Since churners usually account for only a minority of total subscribers (~26%), a naive model that predicts "No Churn" for everyone would score 74% accuracy but save 0% of at-risk revenue.

Our pipeline employs **Balanced Class Weights** within the Random Forest estimator. This optimizes model recall (sensitivity), ensuring we capture the maximum number of potential churners (True Positives) and alert customer success agents *before* cancellation occurs.
