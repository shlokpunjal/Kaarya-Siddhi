# this file has the structure of the data that is returned or processed in json format
from typing import Literal

from pydantic import BaseModel, Field

# The client already validates these shapes (10-digit phone, 6-digit OTP,
# etc.) in constants/validators.ts, but that's a UX nicety, not a security
# boundary — anyone can call the API directly. These constraints are the
# real enforcement.

Role = Literal["admin", "employee"]


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: str
    phone: str = Field(pattern=r"^\d{10}$")
    role: Role
    department: str | None = Field(default=None, max_length=80)


class LoginRequest(BaseModel):
    phone: str = Field(pattern=r"^\d{10}$")
    email: str
    role: Role


class SendOTPRequest(BaseModel):
    email: str
    role: Role


class VerifyOTPRequest(BaseModel):
    email: str
    otp: str = Field(pattern=r"^\d{6}$")


class ConnectRequest(BaseModel):
    employee_email: str
    admin_email: str


class ConnectionRespond(BaseModel):
    employee_email: str
    admin_email: str
    accept: bool


class SavePushTokenRequest(BaseModel):
    push_token: str = Field(min_length=1, max_length=512)


class CheckNameRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    role: Role


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class DisconnectAdminRequest(BaseModel):
    employee_email: str


class LogoutRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class DeleteAccountResponse(BaseModel):
    success: bool
    message: str
