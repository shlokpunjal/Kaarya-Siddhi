from fastapi import FastAPI
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

AUTH_KEY = os.getenv("MSG91_AUTH_KEY")
TEMPLATE_ID = os.getenv("MSG91_TEMPLATE_ID")

class PhoneRequest(BaseModel):
    phone: str

@app.get("/")
def root():
    return {"message": "Kaarya Siddhi API is running"}

@app.post("/send-otp")
def send_otp(data: PhoneRequest):
    url = "https://control.msg91.com/api/v5/otp"
    
    headers = {
        "authkey": AUTH_KEY,
        "Content-Type": "application/json"
    }
    
    params = {
        "template_id": TEMPLATE_ID,
        "mobile": f"91{data.phone}",
        "otp_length": "6",
        "otp_expiry": "10",
        "sender": "KAARYA"
    }
    
    response = requests.post(url, headers=headers, params=params)
    result = response.json()
    
    print("MSG91 response:", result)
    
    if result.get("type") == "success":
        return {"success": True, "message": "OTP sent successfully"}
    else:
        return {"success": False, "message": result}