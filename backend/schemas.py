from pydantic import BaseModel


class SignupRequest(BaseModel):
    name: str
    email: str
    phone: str
    role: str
    department: str | None = None


class LoginRequest(BaseModel):
    phone: str
    email: str
    role: str


class SendOTPRequest(BaseModel):
    email: str
    role: str


class VerifyOTPRequest(BaseModel):
    email: str
    otp: str


class ConnectRequest(BaseModel):
    employee_email: str
    admin_email: str


class ConnectionRespond(BaseModel):
    employee_email: str
    admin_email: str
    accept: bool


class SavePushTokenRequest(BaseModel):
    push_token: str


class CheckNameRequest(BaseModel):
    name: str
    role: str


class RefreshRequest(BaseModel):
    refresh_token: str


class DisconnectAdminRequest(BaseModel):
    employee_email: str


class LogoutRequest(BaseModel):
    refresh_token: str

class DeleteAccountResponse(BaseModel):
    success: bool
    message: str