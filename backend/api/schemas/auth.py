from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str = Field(min_length=6)
    first_name: str = ""
    last_name: str = ""


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    is_active: bool

    class Config:
        from_attributes = True
