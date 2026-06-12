from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel

from api.dependencies import get_current_user
from api.limiter import limiter
from apps.core.models import PerfilUsuario

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
User = get_user_model()


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    first_name: str = ""
    last_name: str = ""
    telefono: str = ""


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    is_staff: bool = False
    telefono: str = ""

    class Config:
        from_attributes = True


def create_access_token(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "type": "access",
        "exp": datetime.utcnow() + timedelta(minutes=15),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def create_refresh_token(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=7),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/10minutes")
def register(request: Request, data: RegisterRequest):
    if User.objects.filter(username=data.username).exists():
        raise HTTPException(status_code=400, detail="Usuario ya existe")
    if User.objects.filter(email=data.email).exists():
        raise HTTPException(status_code=400, detail="Email ya registrado")

    try:
        validate_password(data.password, user=User(username=data.username, email=data.email))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=" · ".join(e.messages))

    user = User.objects.create_user(
        username=data.username,
        email=data.email,
        password=data.password,
        first_name=data.first_name,
        last_name=data.last_name,
    )
    if data.telefono:
        PerfilUsuario.objects.create(usuario=user, telefono=data.telefono)
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, data: LoginRequest):
    user = authenticate(username=data.username, password=data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("5/minute")
def refresh(request: Request, data: RefreshRequest):
    try:
        payload = jwt.decode(data.refresh_token, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token inválido")
        user_id = payload.get("user_id")
        User = get_user_model()
        user = User.objects.filter(id=user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")


@router.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    perfil = getattr(user, 'perfil', None)
    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_staff=user.is_staff,
        telefono=perfil.telefono if perfil else "",
    )


@router.get("/users")
def list_users(user=Depends(get_current_user)):
    if not user.is_staff:
        raise HTTPException(status_code=403, detail="Solo administradores")
    qs = User.objects.all().values("id", "username", "email", "first_name", "last_name", "is_staff", "date_joined")
    return list(qs)


class UserUpdate(BaseModel):
    username: str = ""
    email: str = ""
    first_name: str = ""
    last_name: str = ""
    is_staff: bool = False
    password: str = ""


@router.put("/users/{user_id}")
def update_user(user_id: int, data: UserUpdate, user=Depends(get_current_user)):
    if not user.is_staff:
        raise HTTPException(status_code=403, detail="Solo administradores")
    target = User.objects.filter(id=user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if data.username:
        target.username = data.username
    if data.email:
        target.email = data.email
    target.first_name = data.first_name
    target.last_name = data.last_name
    target.is_staff = data.is_staff
    if data.password:
        target.set_password(data.password)
    target.save()
    return {"ok": True}


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, user=Depends(get_current_user)):
    if not user.is_staff:
        raise HTTPException(status_code=403, detail="Solo administradores")
    if user.id == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    target = User.objects.filter(id=user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    target.delete()
