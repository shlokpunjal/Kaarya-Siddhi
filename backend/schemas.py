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
    # Exactly one of these should be set: a real token on success, or a
    # short machine-readable reason string when the client couldn't
    # register (e.g. "not_a_device", "permission_denied", "no_project_id").
    push_token: str | None = Field(default=None, max_length=512)
    push_token_status: str | None = Field(default=None, max_length=100)

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

class UpdateProfileRequest(BaseModel):
    name: str | None = None
    mobile_number: str | None = None
    email: str | None = None


# ---- Chat ----

MessageType = Literal["text", "image", "file", "video", "audio"]


class ChatFileInput(BaseModel):
    file_url: str
    file_name: str | None = None
    file_type: str | None = None
    file_size: int | None = None
    thumbnail_url: str | None = None


class SendMessageRequest(BaseModel):
    # Identify the other side of the conversation by email — mirrors
    # ConnectRequest/ConnectionRespond, and lets the client start a
    # conversation before it knows the thread's conversation_id yet
    # (first message ever sent creates the conversation row).
    other_email: str
    content: str | None = Field(default=None, max_length=4000)
    message_type: MessageType = "text"
    reply_to_id: str | None = None
    files: list[ChatFileInput] = Field(default_factory=list)


class ReactToMessageRequest(BaseModel):
    emoji: str = Field(min_length=1, max_length=8)


class ClearChatRequest(BaseModel):
    other_email: str