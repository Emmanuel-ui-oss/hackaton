import jwt
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from django.contrib.auth.models import User
from django.conf import settings
from api.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from api.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(data: RegisterRequest):
    if User.objects.filter(username=data.username).exists():
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    if User.objects.filter(email=data.email).exists():
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    user = User.objects.create_user(
        username=data.username,
        email=data.email,
        password=data.password,
        first_name=data.first_name,
        last_name=data.last_name,
    )
    token = _generate_token(user)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest):
    try:
        user = User.objects.get(username=data.username)
        if not user.check_password(data.password):
            raise HTTPException(status_code=401, detail="Credenciales inválidas")
    except User.DoesNotExist:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    token = _generate_token(user)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user


def _generate_token(user: User) -> str:
    payload = {
        "user_id": user.id,
        "username": user.username,
        "exp": datetime.utcnow() + timedelta(days=7),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
