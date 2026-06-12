import os
import urllib.request
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix
import joblib
import json

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DATA_PATH = os.path.join(DATA_DIR, "telco_churn.csv")
MODEL_PATH = os.path.join(DATA_DIR, "churn_model.joblib")
METADATA_PATH = os.path.join(DATA_DIR, "model_metadata.json")

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)

DATA_URL = "https://raw.githubusercontent.com/treselle-systems/customer_churn_analysis/master/WA_Fn-UseC_-Telco-Customer-Churn.csv"

def download_data():
    """Downloads the IBM Telco Churn dataset or generates a high-quality fallback dataset if offline."""
    if os.path.exists(DATA_PATH):
        return

    print("Attempting to download Telco Churn dataset...")
    try:
        urllib.request.urlretrieve(DATA_URL, DATA_PATH)
        print("Dataset downloaded successfully.")
    except Exception as e:
        print(f"Failed to download dataset: {e}. Generating high-quality synthetic dataset...")
        generate_synthetic_data()

def generate_synthetic_data():
    """Generates synthetic Telco Churn data matching the schema of the real dataset."""
    np.random.seed(42)
    n_samples = 1500
    
    genders = np.random.choice(["Male", "Female"], n_samples)
    senior_citizen = np.random.choice([0, 1], n_samples, p=[0.85, 0.15])
    partner = np.random.choice(["Yes", "No"], n_samples)
    dependents = np.random.choice(["Yes", "No"], n_samples, p=[0.7, 0.3])
    
    tenure = np.random.randint(1, 73, n_samples)
    phone_service = np.random.choice(["Yes", "No"], n_samples, p=[0.9, 0.1])
    multiple_lines = []
    for p in phone_service:
        if p == "No":
            multiple_lines.append("No phone service")
        else:
            multiple_lines.append(np.random.choice(["Yes", "No"], p=[0.35, 0.65]))
            
    internet_service = np.random.choice(["DSL", "Fiber optic", "No"], n_samples, p=[0.35, 0.45, 0.20])
    
    services = ["OnlineSecurity", "OnlineBackup", "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies"]
    service_data = {s: [] for s in services}
    for net in internet_service:
        for s in services:
            if net == "No":
                service_data[s].append("No internet service")
            else:
                service_data[s].append(np.random.choice(["Yes", "No"], p=[0.4, 0.6]))
                
    contract = np.random.choice(["Month-to-month", "One year", "Two year"], n_samples, p=[0.55, 0.20, 0.25])
    paperless_billing = np.random.choice(["Yes", "No"], n_samples, p=[0.6, 0.4])
    payment_method = np.random.choice([
        "Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"
    ], n_samples, p=[0.35, 0.25, 0.20, 0.20])
    
    monthly_charges = []
    for i in range(n_samples):
        charge = 20.0  # Base charge
        if phone_service[i] == "Yes": charge += 10.0
        if multiple_lines[i] == "Yes": charge += 10.0
        if internet_service[i] == "DSL": charge += 30.0
        elif internet_service[i] == "Fiber optic": charge += 50.0
        
        for s in services:
            if service_data[s][i] == "Yes": charge += 8.0
            
        charge += np.random.normal(0, 5) # noise
        monthly_charges.append(round(max(18.0, charge), 2))
        
    total_charges = [round(monthly_charges[i] * tenure[i] * np.random.uniform(0.95, 1.05), 2) for i in range(n_samples)]
    
    churn_prob = []
    for i in range(n_samples):
        p = 0.1
        if contract[i] == "Month-to-month": p += 0.35
        if internet_service[i] == "Fiber optic": p += 0.15
        if service_data["TechSupport"][i] == "No" and internet_service[i] != "No": p += 0.15
        if tenure[i] < 12: p += 0.2
        if payment_method[i] == "Electronic check": p += 0.1
        if senior_citizen[i] == 1: p += 0.05
        
        p = min(0.95, max(0.02, p))
        churn_prob.append(p)
        
    churn = np.where(np.array(churn_prob) > np.random.uniform(0, 1, n_samples), "Yes", "No")
    
    customer_ids = [f"{np.random.randint(1000, 9999)}-{np.random.choice(list('ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 5)}" for _ in range(n_samples)]
    
    df = pd.DataFrame({
        "customerID": customer_ids,
        "gender": genders,
        "SeniorCitizen": senior_citizen,
        "Partner": partner,
        "Dependents": dependents,
        "tenure": tenure,
        "PhoneService": phone_service,
        "MultipleLines": multiple_lines,
        "InternetService": internet_service,
        "OnlineSecurity": service_data["OnlineSecurity"],
        "OnlineBackup": service_data["OnlineBackup"],
        "DeviceProtection": service_data["DeviceProtection"],
        "TechSupport": service_data["TechSupport"],
        "StreamingTV": service_data["StreamingTV"],
        "StreamingMovies": service_data["StreamingMovies"],
        "Contract": contract,
        "PaperlessBilling": paperless_billing,
        "PaymentMethod": payment_method,
        "MonthlyCharges": monthly_charges,
        "TotalCharges": total_charges,
        "Churn": churn
    })
    
    df.to_csv(DATA_PATH, index=False)

def load_and_preprocess_data():
    """Loads the dataset and performs initial clean up."""
    download_data()
    df = pd.read_csv(DATA_PATH)
    
    if df["TotalCharges"].dtype == object:
        df["TotalCharges"] = df["TotalCharges"].str.strip().replace("", np.nan)
    df["TotalCharges"] = pd.to_numeric(df["TotalCharges"])
    df["TotalCharges"] = df["TotalCharges"].fillna(0)
    
    if "Churn" in df.columns:
        df["Churn"] = df["Churn"].map({"Yes": 1, "No": 0})
        
    return df

NUMERIC_FEATURES = ["tenure", "MonthlyCharges", "TotalCharges"]
CATEGORICAL_FEATURES = [
    "gender", "SeniorCitizen", "Partner", "Dependents", "PhoneService", 
    "MultipleLines", "InternetService", "OnlineSecurity", "OnlineBackup", 
    "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies", 
    "Contract", "PaperlessBilling", "PaymentMethod"
]

def build_pipeline(n_estimators=100, max_depth=10, model_type="random_forest", scale_pos_weight=1.0):
    """Creates the scikit-learn preprocessing and classifier pipeline (RF or XGBoost)."""
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES)
        ]
    )
    
    if model_type == "xgboost":
        classifier = XGBClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            scale_pos_weight=scale_pos_weight,
            random_state=42,
            eval_metric="logloss"
        )
    else:
        classifier = RandomForestClassifier(
            n_estimators=n_estimators, 
            max_depth=max_depth, 
            random_state=42, 
            class_weight="balanced"
        )
        
    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", classifier)
        ]
    )
    return pipeline

def train_and_save_model(n_estimators=100, max_depth=10, model_type="random_forest"):
    """Trains the selected model and saves it, returning evaluation metrics."""
    df = load_and_preprocess_data()
    
    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y = df["Churn"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Calculate scale_pos_weight for XGBoost to handle class imbalance
    neg_count = sum(y_train == 0)
    pos_count = sum(y_train == 1)
    scale_pos_weight = float(neg_count / pos_count) if pos_count > 0 else 1.0
    
    pipeline = build_pipeline(
        n_estimators=n_estimators, 
        max_depth=max_depth, 
        model_type=model_type,
        scale_pos_weight=scale_pos_weight
    )
    pipeline.fit(X_train, y_train)
    
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]
    
    report = classification_report(y_test, y_pred, output_dict=True)
    auc = roc_auc_score(y_test, y_prob)
    cm = confusion_matrix(y_test, y_pred).tolist()
    
    # Save the pipeline
    joblib.dump(pipeline, MODEL_PATH)
    
    # Save model metadata
    metadata = {
        "model_type": model_type,
        "n_estimators": n_estimators,
        "max_depth": max_depth
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f)
    
    # Calculate feature importances
    feature_names = get_feature_names(pipeline.named_steps["preprocessor"])
    importances = pipeline.named_steps["classifier"].feature_importances_
    grouped_importances = group_feature_importances(feature_names, importances)
    
    metrics = {
        "accuracy": report["accuracy"],
        "precision": report["1"]["precision"],
        "recall": report["1"]["recall"],
        "f1_score": report["1"]["f1-score"],
        "auc": auc,
        "confusion_matrix": cm,
        "feature_importances": grouped_importances,
        "model_type": model_type
    }
    
    return metrics

def get_feature_names(column_transformer):
    feature_names = []
    for name, trans, cols in column_transformer.transformers_:
        if name == "num":
            feature_names.extend(cols)
        elif name == "cat":
            if hasattr(trans, "get_feature_names_out"):
                feature_names.extend(trans.get_feature_names_out(cols))
            else:
                feature_names.extend(cols)
    return feature_names

def group_feature_importances(encoded_names, importances):
    grouped = {}
    for name, imp in zip(encoded_names, importances):
        found = False
        for orig in NUMERIC_FEATURES + CATEGORICAL_FEATURES:
            if name == orig or name.startswith(orig + "_"):
                grouped[orig] = grouped.get(orig, 0) + imp
                found = True
                break
        if not found:
            grouped[name] = grouped.get(name, 0) + imp
            
    sorted_importances = sorted(grouped.items(), key=lambda x: x[1], reverse=True)
    return [{"feature": k, "importance": float(v)} for k, v in sorted_importances]

def get_model():
    """Loads the model, training a Random Forest first if not present."""
    if not os.path.exists(MODEL_PATH):
        train_and_save_model()
    return joblib.load(MODEL_PATH)

def get_metadata():
    """Loads model metadata (e.g. active model architecture)."""
    if not os.path.exists(METADATA_PATH):
        return {"model_type": "random_forest", "n_estimators": 100, "max_depth": 10}
    with open(METADATA_PATH, "r") as f:
        return json.load(f)

def predict_single(customer_data: dict):
    model = get_model()
    df_input = pd.DataFrame([customer_data])
    
    for col in NUMERIC_FEATURES + CATEGORICAL_FEATURES:
        if col not in df_input.columns:
            if col in NUMERIC_FEATURES:
                df_input[col] = 0
            else:
                df_input[col] = "No"
                
    df_input["tenure"] = pd.to_numeric(df_input["tenure"])
    df_input["MonthlyCharges"] = pd.to_numeric(df_input["MonthlyCharges"])
    df_input["TotalCharges"] = pd.to_numeric(df_input["TotalCharges"])
    
    base_prob = float(model.predict_proba(df_input[NUMERIC_FEATURES + CATEGORICAL_FEATURES])[0, 1])
    
    df_all = load_and_preprocess_data()
    baselines = {}
    for col in NUMERIC_FEATURES:
        baselines[col] = float(df_all[col].median())
    for col in CATEGORICAL_FEATURES:
        baselines[col] = df_all[col].mode()[0]
        
    contributions = []
    explain_features = ["Contract", "tenure", "TechSupport", "InternetService", "MonthlyCharges", "PaymentMethod", "OnlineSecurity"]
    
    for feat in explain_features:
        if feat not in customer_data:
            continue
        df_alt = df_input.copy()
        df_alt[feat] = baselines[feat]
        
        alt_prob = float(model.predict_proba(df_alt[NUMERIC_FEATURES + CATEGORICAL_FEATURES])[0, 1])
        diff = base_prob - alt_prob
        
        val = customer_data[feat]
        if diff > 0.02:
            if feat == "Contract":
                text = "Month-to-month contract increases risk" if val == "Month-to-month" else "Contract type increases risk"
            elif feat == "tenure":
                text = f"Low tenure ({val} mos) increases risk"
            elif feat == "TechSupport" and val == "No":
                text = "Lack of tech support increases risk"
            elif feat == "InternetService" and val == "Fiber optic":
                text = "Fiber optic service correlates with higher churn"
            elif feat == "MonthlyCharges":
                text = f"High monthly charges (${val}) increase risk"
            elif feat == "OnlineSecurity" and val == "No":
                text = "No online security increases risk"
            else:
                text = f"{feat} ({val}) increases risk"
            contributions.append({"feature": feat, "value": val, "impact": float(diff), "type": "risk", "text": text})
        elif diff < -0.02:
            if feat == "Contract":
                text = f"Long-term contract ({val}) reduces risk"
            elif feat == "tenure":
                text = f"High loyalty tenure ({val} mos) reduces risk"
            elif feat == "TechSupport" and val == "Yes":
                text = "Subscribed to tech support reduces risk"
            elif feat == "OnlineSecurity" and val == "Yes":
                text = "Subscribed to online security reduces risk"
            elif feat == "MonthlyCharges":
                text = f"Low monthly charges (${val}) reduce risk"
            else:
                text = f"{feat} ({val}) reduces risk"
            contributions.append({"feature": feat, "value": val, "impact": float(diff), "type": "benefit", "text": text})

    contributions = sorted(contributions, key=lambda x: abs(x["impact"]), reverse=True)

    metadata = get_metadata()
    return {
        "churn_probability": base_prob,
        "risk_level": "High" if base_prob >= 0.6 else "Medium" if base_prob >= 0.3 else "Low",
        "contributions": contributions,
        "model_type": metadata.get("model_type", "random_forest")
    }

if __name__ == "__main__":
    print("Running model script...")
    metrics = train_and_save_model()
    print("Model Type:", metrics["model_type"])
    print("Accuracy:", metrics["accuracy"])
    print("AUC:", metrics["auc"])
