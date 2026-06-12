import os
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import uvicorn

import model
import rag

app = FastAPI(title="AI-Powered Customer Churn Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models for request validation
class CustomerFeaturesInput(BaseModel):
    gender: str = "Male"
    SeniorCitizen: int = 0
    Partner: str = "No"
    Dependents: str = "No"
    tenure: int = Field(12, ge=0, le=100)
    PhoneService: str = "Yes"
    MultipleLines: str = "No"
    InternetService: str = "Fiber optic"
    OnlineSecurity: str = "No"
    OnlineBackup: str = "No"
    DeviceProtection: str = "No"
    TechSupport: str = "No"
    StreamingTV: str = "No"
    StreamingMovies: str = "No"
    Contract: str = "Month-to-month"
    PaperlessBilling: str = "Yes"
    PaymentMethod: str = "Electronic check"
    MonthlyCharges: float = Field(70.0, ge=0)
    TotalCharges: Optional[float] = None
    customerID: Optional[str] = "TEST-USER"

class RAGRequest(BaseModel):
    customer_data: CustomerFeaturesInput
    api_key: Optional[str] = None

class ChatHistoryItem(BaseModel):
    sender: str  # "user" or "assistant"
    text: str

class ChatRequest(BaseModel):
    customer_data: Dict[str, Any]
    chat_history: List[ChatHistoryItem]
    message: str
    api_key: Optional[str] = None

class TrainRequest(BaseModel):
    n_estimators: int = Field(100, ge=10, le=500)
    max_depth: int = Field(10, ge=2, le=30)
    model_type: str = "random_forest" # "random_forest" or "xgboost"

@app.on_event("startup")
def startup_event():
    print("API Starting up: ensuring data is present...")
    model.download_data()
    model.get_model()

@app.get("/api/customers")
def get_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = None,
    risk_filter: Optional[str] = None
):
    df = model.load_and_preprocess_data()
    pipeline = model.get_model()
    
    X = df[model.NUMERIC_FEATURES + model.CATEGORICAL_FEATURES]
    probs = pipeline.predict_proba(X)[:, 1]
    df["churn_probability"] = probs
    df["risk_level"] = np.where(probs >= 0.6, "High", np.where(probs >= 0.3, "Medium", "Low"))
    
    if search:
        df = df[df["customerID"].str.contains(search, case=False, na=False)]
        
    if risk_filter:
        df = df[df["risk_level"] == risk_filter]
        
    df = df.sort_values(by="churn_probability", ascending=False)
    
    total = len(df)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    
    customers = df.iloc[start_idx:end_idx].to_dict(orient="records")
    
    for c in customers:
        for k, v in c.items():
            if isinstance(v, float) and np.isnan(v):
                c[k] = None
                
    return {
        "customers": customers,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": int(np.ceil(total / limit))
    }

@app.get("/api/stats")
def get_stats():
    df = model.load_and_preprocess_data()
    pipeline = model.get_model()
    metadata = model.get_metadata()
    
    X = df[model.NUMERIC_FEATURES + model.CATEGORICAL_FEATURES]
    probs = pipeline.predict_proba(X)[:, 1]
    df["churn_probability"] = probs
    df["risk_level"] = np.where(probs >= 0.6, "High", np.where(probs >= 0.3, "Medium", "Low"))
    
    total_customers = len(df)
    avg_churn_prob = float(probs.mean())
    high_risk_count = int((df["risk_level"] == "High").sum())
    
    high_risk_df = df[df["risk_level"] == "High"]
    revenue_at_risk = float((high_risk_df["MonthlyCharges"] * high_risk_df["churn_probability"]).sum())
    
    avg_tenure = float(df["tenure"].mean())
    avg_monthly_charges = float(df["MonthlyCharges"].mean())
    
    contract_stats = df.groupby("Contract")["churn_probability"].mean().to_dict()
    contract_data = [{"contract": k, "avg_risk": float(v)} for k, v in contract_stats.items()]
    
    internet_stats = df.groupby("InternetService")["churn_probability"].mean().to_dict()
    internet_data = [{"service": k, "avg_risk": float(v)} for k, v in internet_stats.items()]
    
    payment_stats = df.groupby("PaymentMethod")["churn_probability"].mean().to_dict()
    payment_data = [{"method": k, "avg_risk": float(v)} for k, v in payment_stats.items()]
    
    try:
        importances = pipeline.named_steps["classifier"].feature_importances_
        feature_names = model.get_feature_names(pipeline.named_steps["preprocessor"])
        grouped_importances = model.group_feature_importances(feature_names, importances)
    except Exception as e:
        print(f"Error extracting features: {e}")
        grouped_importances = []
        
    # Calculate unique business cohort counts
    price_sensitive = int(((df["Contract"] == "Month-to-month") & (df["MonthlyCharges"] > 70)).sum())
    unprotected = int(((df["InternetService"] == "Fiber optic") & (df["OnlineSecurity"] == "No")).sum())
    early_friction = int(((df["tenure"] < 12) & (df["churn_probability"] > 0.5)).sum())
    payment_friction = int((df["PaymentMethod"].str.contains("check", case=False, na=False) & (df["churn_probability"] > 0.4)).sum())

    return {
        "kpis": {
            "total_customers": total_customers,
            "avg_churn_probability": avg_churn_prob,
            "high_risk_count": high_risk_count,
            "revenue_at_risk": round(revenue_at_risk, 2),
            "avg_tenure": round(avg_tenure, 1),
            "avg_monthly_charges": round(avg_monthly_charges, 2),
            "model_type": metadata.get("model_type", "random_forest")
        },
        "charts": {
            "contract": contract_data,
            "internet": internet_data,
            "payment": payment_data,
            "feature_importance": grouped_importances[:7]
        },
        "cohorts": {
            "price_sensitive": price_sensitive,
            "unprotected": unprotected,
            "early_friction": early_friction,
            "payment_friction": payment_friction
        }
    }

@app.post("/api/predict")
def predict_churn(customer_input: CustomerFeaturesInput):
    customer_dict = customer_input.dict()
    
    if customer_dict.get("TotalCharges") is None:
        customer_dict["TotalCharges"] = customer_dict["MonthlyCharges"] * customer_dict["tenure"]
        
    try:
        explanation = model.predict_single(customer_dict)
        return explanation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/api/retention-agent")
def get_retention_plan(request: RAGRequest):
    customer_dict = request.customer_data.dict()
    
    if customer_dict.get("TotalCharges") is None:
        customer_dict["TotalCharges"] = customer_dict["MonthlyCharges"] * customer_dict["tenure"]
        
    try:
        explanation = model.predict_single(customer_dict)
        prob = explanation["churn_probability"]
        risk_level = explanation["risk_level"]
        
        risk_factors = [c["feature"] for c in explanation["contributions"] if c["type"] == "risk"]
        
        if not risk_factors:
            risk_factors = ["Contract"]
            
        agent_response = rag.generate_retention_strategy(
            customer_data=customer_dict,
            risk_level=risk_level,
            probability=prob,
            risk_factors=risk_factors,
            api_key=request.api_key
        )
        
        return {
            "churn_probability": prob,
            "risk_level": risk_level,
            "retention_plan": agent_response
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retention strategist error: {str(e)}")

@app.post("/api/chat-agent")
def chat_with_coach(request: ChatRequest):
    """Conversational endpoint to chat with the AI Retention Coach about a specific customer."""
    try:
        history_dicts = [{"sender": item.sender, "text": item.text} for item in request.chat_history]
        coach_response = rag.generate_chat_response(
            customer_data=request.customer_data,
            chat_history=history_dicts,
            user_message=request.message,
            api_key=request.api_key
        )
        return {"response": coach_response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Coach error: {str(e)}")

@app.post("/api/train-model")
def train_model(request: TrainRequest):
    try:
        metrics = model.train_and_save_model(
            n_estimators=request.n_estimators,
            max_depth=request.max_depth,
            model_type=request.model_type
        )
        return {
            "status": "success",
            "message": "Model retrained and saved successfully.",
            "metrics": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
