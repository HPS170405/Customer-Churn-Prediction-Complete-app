import os
import json
import google.generativeai as genai
from typing import List, Dict, Any

POLICIES_PATH = os.path.join(os.path.dirname(__file__), "policies.json")

def load_policies() -> List[Dict[str, Any]]:
    """Loads corporate retention policies from json."""
    if not os.path.exists(POLICIES_PATH):
        return []
    with open(POLICIES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def retrieve_policies(customer_data: dict, risk_factors: List[str]) -> List[Dict[str, Any]]:
    """Retrieves the most relevant retention playbooks based on customer attributes and risk factors."""
    policies = load_policies()
    scored_policies = []
    
    for policy in policies:
        score = 0
        policy_risk_factors = policy.get("risk_factors", [])
        
        for rf in risk_factors:
            if rf in policy_risk_factors:
                score += 3
                
        if "Contract" in policy_risk_factors and customer_data.get("Contract") == "Month-to-month":
            score += 2
        if "MonthlyCharges" in policy_risk_factors and float(customer_data.get("MonthlyCharges", 0)) > 70:
            score += 2
        if "TechSupport" in policy_risk_factors and customer_data.get("TechSupport") == "No":
            score += 2
        if "OnlineSecurity" in policy_risk_factors and customer_data.get("OnlineSecurity") == "No":
            score += 1
        if "PaymentMethod" in policy_risk_factors and "check" in str(customer_data.get("PaymentMethod", "")).lower():
            score += 2
            
        scored_policies.append((score, policy))
        
    scored_policies.sort(key=lambda x: x[0], reverse=True)
    return [policy for score, policy in scored_policies[:2] if score > 0] or policies[:2]

def generate_fallback_strategy(customer_data: dict, risk_level: str, probability: float, policies: List[dict]) -> dict:
    customer_id = customer_data.get("customerID", "VALUED-CUSTOMER")
    monthly_charge = customer_data.get("MonthlyCharges", 0)
    tenure = customer_data.get("tenure", 0)
    contract = customer_data.get("Contract", "Month-to-month")
    
    primary_reasons = []
    actions = []
    offers = []
    
    for p in policies:
        if p["id"] == "contract_upgrade":
            primary_reasons.append("flexible month-to-month billing without contract commitment")
            actions.append("Offer contract upgrade (1-Year or 2-Year) to secure long-term rates.")
            offers.append("15% loyalty discount on monthly base rates for signing a 12-month contract.")
        elif p["id"] == "price_saver":
            primary_reasons.append("high monthly billing relative to tenure")
            actions.append("Audit active features to streamline plan costs.")
            offers.append(f"Loyalty Value Pack consolidation to save $15/month and a $50 goodwill statement credit.")
        elif p["id"] == "tech_intervention":
            primary_reasons.append("technical setup complexity with fiber-optic line and no tech support")
            actions.append("Schedule senior technician check-up and add tech support coverage.")
            offers.append("6 months of premium Technical Support package at no charge ($48 total value).")
        elif p["id"] == "security_protection":
            primary_reasons.append("unprotected internet service line (missing core security features)")
            actions.append("Introduce digital protection suite to increase utility and contract stickiness.")
            offers.append("Digital Security and Online Backup suite free for 90 days, then 50% discount.")
        elif p["id"] == "autopay_incentive":
            primary_reasons.append("billing friction from manual check payments and paper billing statements")
            actions.append("Transition account to automated billing.")
            offers.append("One-time $25 billing credit for registering a bank/card auto-pay profile.")

    if not primary_reasons:
        primary_reasons.append("account tenure lifecycle adjustment")
        actions.append("Standard proactive customer relationship check-in.")
        offers.append("Complimentary 10% base rate discount for the next 3 months.")

    reasons_str = ", ".join(primary_reasons)
    
    email_subject = "Exclusive Loyalty Saves for your account"
    email_body = (
        f"Subject: {email_subject}\n\n"
        f"Dear Valued Customer (Account: {customer_id}),\n\n"
        f"Thank you for being part of our family for the past {tenure} months. We are committed to "
        f"delivering the best connection and service experience possible.\n\n"
        f"As part of our regular account reviews, we noticed that you are currently on a {contract} plan "
        f"and we want to ensure you are receiving the best value. To thank you for your loyalty, "
        f"we have selected some exclusive offers for your account:\n"
    )
    
    for offer in offers:
        email_body += f"- {offer}\n"
        
    email_body += (
        "\nIf you'd like to activate these loyalty savings, simply reply to this email or click the link "
        "below to visit your dashboard. No additional fees or hidden charges will apply.\n\n"
        "Thank you again for choosing us.\n\n"
        "Warm regards,\n"
        "Customer Success & Loyalty Team"
    )

    analysis = (
        f"The customer is at {risk_level} Churn Risk ({probability:.1%} probability). The primary churn driver "
        f"appears to be associated with {reasons_str}. The customer currently has a monthly charge of ${monthly_charge} "
        f"and a tenure of {tenure} months. To prevent churn, immediate action should be taken to offer value incentives "
        f"and transition them to more stable account features (e.g. contracts, auto-pay, or support add-ons)."
    )

    return {
        "analysis": analysis,
        "roadmap": actions,
        "email_subject": email_subject,
        "email_body": email_body,
        "using_fallback": True
    }

def generate_retention_strategy(customer_data: dict, risk_level: str, probability: float, risk_factors: List[str], api_key: str = None) -> dict:
    """Generates custom retention recommendations using RAG + Gemini API, falling back gracefully if key is missing."""
    retrieved = retrieve_policies(customer_data, risk_factors)
    
    gemini_key = api_key or os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        result = generate_fallback_strategy(customer_data, risk_level, probability, retrieved)
        result["retrieved_policies"] = retrieved
        return result
        
    try:
        genai.configure(api_key=gemini_key)
        
        customer_info = {
            "CustomerID": customer_data.get("customerID"),
            "Gender": customer_data.get("gender"),
            "Tenure Months": customer_data.get("tenure"),
            "Contract": customer_data.get("Contract"),
            "Internet Service": customer_data.get("InternetService"),
            "Tech Support": customer_data.get("TechSupport"),
            "Payment Method": customer_data.get("PaymentMethod"),
            "Monthly Charges": customer_data.get("MonthlyCharges"),
            "Total Charges": customer_data.get("TotalCharges"),
            "Churn Probability": f"{probability:.1%}",
            "Risk Level": risk_level,
            "ML Key Risk Drivers": risk_factors
        }
        
        prompt = f"""
You are an expert Customer Retention Strategist for a major Telecommunications provider.
Your goal is to prevent a customer from churning by analyzing their risk profile and applying corporate retention policies.

### Customer Risk Profile
{json.dumps(customer_info, indent=2)}

### Retrieved Corporate Retention Playbooks
{json.dumps(retrieved, indent=2)}

### Instructions:
Generate a detailed retention plan for this customer. Provide your output in JSON format with the following keys:
1. "analysis": A paragraph explaining the customer's churn triggers based on their profile, payment methods, and ML risk drivers.
2. "roadmap": An array of 3 to 4 actionable, step-by-step negotiation instructions for the agent (e.g. exact pricing discounts or feature bundles to propose).
3. "email_subject": A compelling, friendly subject line for the customer.
4. "email_body": An email draft from the 'Customer Loyalty Team' presenting the selected playbook offers warmly. Do not use generic placeholders like [Company Name], replace them with 'TelcoPro' or write them naturally.

Ensure the output is valid JSON. Return ONLY the JSON object, do not wrap it in markdown code blocks.
"""
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```json") or lines[0] == "```":
                lines = lines[1:-1]
            text = "\n".join(lines).strip()
            
        data = json.loads(text)
        data["using_fallback"] = False
        data["retrieved_policies"] = retrieved
        return data
        
    except Exception as e:
        print(f"Error calling Gemini API: {e}. Falling back to rule-based generation.")
        result = generate_fallback_strategy(customer_data, risk_level, probability, retrieved)
        result["retrieved_policies"] = retrieved
        result["error_msg"] = str(e)
        return result

def generate_chat_response(customer_data: dict, chat_history: List[Dict[str, str]], user_message: str, api_key: str = None) -> str:
    """Generates a conversational response from the 'AI Retention Coach' discussing customer-saving strategies."""
    
    gemini_key = api_key or os.environ.get("GEMINI_API_KEY")
    
    # 1. Use Gemini if key is available
    if gemini_key:
        try:
            genai.configure(api_key=gemini_key)
            
            # Format chat history
            history_str = ""
            for msg in chat_history[-6:]: # Include last 6 messages for context
                sender_label = "Agent (User)" if msg["sender"] == "user" else "Coach (AI)"
                history_str += f"{sender_label}: {msg['text']}\n"
                
            prompt = f"""
You are an AI Retention Coach assisting a Customer Success Agent.
The agent is currently looking at a customer profile and wants advice on how to prevent them from churning.

### Customer Details:
- Customer ID: {customer_data.get('customerID', 'Unknown')}
- Contract: {customer_data.get('Contract')}
- Tenure: {customer_data.get('tenure')} months
- Monthly Charges: ${customer_data.get('MonthlyCharges')}
- Internet Service: {customer_data.get('InternetService')}
- Tech Support: {customer_data.get('TechSupport')}
- Payment Method: {customer_data.get('PaymentMethod')}
- Online Security: {customer_data.get('OnlineSecurity')}

### Recent Conversation History:
{history_str}
Agent (User): {user_message}

### Instructions:
Reply as the AI Coach. Keep your response brief, highly actionable, and focused on telecom retention playbooks. Tell the agent exactly what offers to make, how to handle the customer's potential objections, or answer their specific questions. Be supportive and professional.
"""
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Chat Gemini Error: {e}. Falling back to keyword responder.")
            
    # 2. Fallback Keyword Responder (Rule-based Chat Agent)
    msg_lower = user_message.lower()
    tenure = customer_data.get("tenure", 12)
    charges = customer_data.get("MonthlyCharges", 50.0)
    contract = customer_data.get("Contract", "Month-to-month")
    
    if "discount" in msg_lower or "price" in msg_lower or "charge" in msg_lower or "bill" in msg_lower or "cost" in msg_lower:
        return (
            f"Since this customer has monthly charges of ${charges}, I recommend proposing our 'Price Saver Playbook'.\n\n"
            f"You can offer a **$15/month discount** by bundling their services into a loyalty tier. Additionally, "
            f"since they are on a {contract} plan, tell them they can lock in this lower rate for 12 months by signing "
            f"a 1-year contract. If they object, you have approval to apply a one-time **$50 billing statement credit**."
        )
        
    elif "contract" in msg_lower or "agreement" in msg_lower or "year" in msg_lower:
        return (
            f"This customer is currently on a **{contract}** plan. If they are Month-to-month, they have high churn risk. "
            f"Propose a contract upgrade to a 1-Year or 2-Year plan. \n\n"
            f"To close this deal, pitch the 'Loyalty Price Shield': we guarantee their monthly rate will not rise for the next "
            f"24 months, and we will bundle **3 months of free Premium Tech Support** or **Online Backup** to sweeten the deal."
        )
        
    elif "tech" in msg_lower or "support" in msg_lower or "slow" in msg_lower or "internet" in msg_lower or "fiber" in msg_lower:
        return (
            f"The customer is using **{customer_data.get('InternetService')} internet** and currently "
            f"has **Tech Support: {customer_data.get('TechSupport')}**.\n\n"
            f"If they complain about speed or service stability, explain that you are scheduling a proactive technical audit of their router line. "
            f"Offer to add the **Premium Tech Support package for free for the first 6 months** (normally $8/mo) to ensure they have "
            f"priority help if they ever experience another connection issue."
        )
        
    elif "security" in msg_lower or "backup" in msg_lower or "virus" in msg_lower or "hack" in msg_lower:
        return (
            f"I notice this customer has Online Security: {customer_data.get('OnlineSecurity')} and Online Backup: {customer_data.get('OnlineBackup')}.\n\n"
            f"Pitch our 'Peace of Mind' security suite. Explain that as a valued customer, they are eligible for 90 days "
            f"of complimentary protection against malware, identity theft, and automatic cloud backups. If they activate it, "
            f"it will increase account stickiness and lower their churn risk by over 15%!"
        )
        
    elif "email" in msg_lower or "draft" in msg_lower or "write" in msg_lower:
        return (
            f"Sure! Here is a quick draft you can copy/paste and send to this customer:\n\n"
            f"\"Hi, I wanted to reach out personally to thank you for your {tenure} months of loyalty. "
            f"I've reviewed your account profile and I want to make sure you are getting the absolute best value. "
            f"I have set aside an exclusive rate adjustment for you: a $15 discount on your monthly bill and a free upgrade to "
            f"Premium Tech Support. Please reply back if you'd like me to apply these savings to your next statement!\""
        )
        
    else:
        return (
            f"Hello! I am your AI Retention Coach. Looking at customer **{customer_data.get('customerID')}**, they have been with "
            f"us for {tenure} months on a {contract} contract. They are currently paying ${charges}/month.\n\n"
            f"Ask me anything specific like:\n"
            f"- *'How can I offer them a discount?'*\n"
            f"- *'What contract should I pitch?'*\n"
            f"- *'How do I handle support complaints?'*\n"
            f"- *'Write an email draft for me'* "
        )
