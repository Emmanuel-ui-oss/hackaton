import random
from datetime import datetime
from fastapi import APIRouter, Depends
from api.dependencies import get_current_user

router = APIRouter()

@router.get("/weather")
def get_weather(user=Depends(get_current_user)):
    data = {
        "temp": round(random.uniform(18, 28), 1),
        "condition": random.choice(["Soleado", "Nublado", "Lluvia ligera", "Tormenta"]),
        "humidity": random.randint(40, 95),
        "rain_prob": random.randint(0, 100),
        "wind": round(random.uniform(0, 15), 1),
        "updated": datetime.now().isoformat(),
    }
    return data
