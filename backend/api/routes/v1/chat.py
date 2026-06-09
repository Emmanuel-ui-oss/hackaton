import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

import re
from datetime import date
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from apps.core.models import ZonaRiesgo, ReporteIncidente, Alerta, EventoSOS
from api.dependencies import get_current_user

router = APIRouter()

NIVELES = ["CRITICO", "ALTO", "MEDIO", "BAJO"]

class ChatRequest(BaseModel):
    message: str

def detect_intent(msg):
    m = msg.lower()
    if re.search(r'\b(hola|buenos días|buenas|qué tal|saludos)\b', m): return 'greeting'
    if re.search(r'\b(ayuda|qué haces|comandos|puedes hacer|help)\b', m): return 'help'
    if re.search(r'\b(zonas?|riesgo|crítico|crítica|comuna|nivel)\b', m): return 'zones'
    if re.search(r'\b(clima|temperatura|lluvia|weather|humedad|soleado)\b', m): return 'weather'
    if re.search(r'\b(estadísticas?|stats|total|reportes?|incidentes?|alertas?)\b', m): return 'stats'
    if re.search(r'\b(ruta|ruteo|llegar|destino|navegar|segura|viaje|ir a)\b', m): return 'routes'
    if re.search(r'\b(sos|emergencia|urgencia|peligro|ayuda rápi)\b', m): return 'sos'
    return 'unknown'

@router.post("/chat")
def chat(body: ChatRequest, user=Depends(get_current_user)):
    intent = detect_intent(body.message)
    reply = handle_intent(intent, body.message)
    return {"reply": reply}

def handle_intent(intent, msg):
    if intent == 'greeting':
        return (
            "👋 ¡Hola! Soy tu asistente de movilidad de Medellín.\n\n"
            "Puedes preguntarme sobre:\n"
            "• ⚠️ Zonas de riesgo — \"¿Cuántas zonas críticas hay?\"\n"
            "• 🌤️ Clima — \"¿Cómo está el clima?\"\n"
            "• 📊 Estadísticas — \"¿Cuántos reportes hay?\"\n"
            "• 🚇 Transporte — \"¿Qué líneas de metro hay?\"\n"
            "• 🗺️ Rutas — \"¿Ruta segura al centro?\"\n\n"
            "¿En qué puedo ayudarte?"
        )

    if intent == 'help':
        return (
            "🤖 Puedes preguntarme cosas como:\n\n"
            "• \"¿Cuántas zonas críticas hay en Medellín?\"\n"
            "• \"¿Cómo está el clima hoy?\"\n"
            "• \"¿Cuántos reportes activos hay?\"\n"
            "• \"¿Qué líneas de transporte público existen?\"\n"
            "• \"¿Ruta segura de El Poblado a Robledo?\"\n"
            "• \"¿Cuántas alertas tengo?\"\n\n"
            "También puedes escribir \"hola\" para saludarme 😊"
        )

    if intent == 'zones':
        zonas = list(ZonaRiesgo.objects.filter(activo=True).values('nivel', 'comuna'))
        if not zonas:
            return "✅ No hay zonas de riesgo activas en este momento."

        por_nivel = {}
        por_comuna = {}
        for z in zonas:
            n = z['nivel'] or 'BAJO'
            c = z['comuna'] or 'Sin comuna'
            por_nivel[n] = por_nivel.get(n, 0) + 1
            por_comuna[c] = por_comuna.get(c, 0) + 1

        total = sum(por_nivel.values())
        criticas = por_nivel.get('CRITICO', 0)
        altas = por_nivel.get('ALTO', 0)
        medias = por_nivel.get('MEDIO', 0)
        bajas = por_nivel.get('BAJO', 0)

        reply = f"⚠️ **Total zonas activas: {total}**\n\n"
        reply += f"🔴 CRÍTICO: {criticas}\n🟡 ALTO: {altas}\n🔵 MEDIO: {medias}\n🟢 BAJO: {bajas}\n\n"

        if criticas > 0:
            top = sorted(por_comuna.items(), key=lambda x: -x[1])[:5]
            reply += "📍 **Zonas por comuna:**\n"
            for c, cnt in top:
                reply += f"• {c}: {cnt}\n"

        if 'comuna' in msg.lower():
            for c_name in ['Comuna 13', 'Comuna 7', 'Comuna 10', 'Comuna 14', 'Comuna 11', 'Comuna 16', 'Comuna 15', 'Comuna 5', 'Comuna 4', 'Comuna 3', 'Comuna 1', 'Comuna 2', 'Comuna 6', 'Comuna 8', 'Comuna 9', 'Comuna 12']:
                if c_name.lower() in msg.lower():
                    comuna_zonas = [z for z in zonas if c_name in (z['comuna'] or '')]
                    if comuna_zonas:
                        reply = f"📍 **{c_name}** — {len(comuna_zonas)} zonas activas\n"
                        for n in NIVELES:
                            cnt = len([z for z in comuna_zonas if z['nivel'] == n])
                            if cnt:
                                emoji = {'CRITICO': '🔴', 'ALTO': '🟡', 'MEDIO': '🔵', 'BAJO': '🟢'}
                                reply += f"{emoji[n]} {n}: {cnt}\n"
                        break
        return reply

    if intent == 'weather':
        try:
            from api.utils.weather_map import weather_condition
            from api.services.weather import fetch_current_weather, extract_current
            data = fetch_current_weather()
            if not data:
                return "🌤️ No pude obtener el clima en este momento. Intenta de nuevo más tarde."
            cur = extract_current(data)
            temp = cur["temp"]
            humidity = cur["humidity"]
            rain = cur["precipitation"] or 0
            cond = weather_condition(cur["weather_code"])
            return (
                f"🌤️ **Clima en Medellín ahora**\n\n"
                f"🌡️ Temperatura: {temp}°C\n"
                f"☁️ Condición: {cond}\n"
                f"💧 Humedad: {humidity}%\n"
                f"🌧️ Precipitación: {rain}mm\n\n"
                f"{'⚠️ Lleva paraguas' if rain > 0 else '☀️ Buen día para salir'}."
            )
        except Exception:
            return "🌤️ No pude obtener el clima en este momento. Intenta de nuevo más tarde."

    if intent == 'stats':
        total_reportes = ReporteIncidente.objects.count()
        activos = ReporteIncidente.objects.filter(activo=True).count()
        hoy = ReporteIncidente.objects.filter(creado__date=date.today()).count()
        zonas_count = ZonaRiesgo.objects.filter(activo=True).count()
        alertas_hoy = Alerta.objects.filter(leida=False).count()
        sos_hoy = EventoSOS.objects.filter(creado__date=date.today()).count()

        return (
            "📊 **Estadísticas en vivo**\n\n"
            f"📋 Total reportes: {total_reportes}\n"
            f"🟢 Activos: {activos}\n"
            f"📅 Hoy: {hoy}\n"
            f"⚠️ Zonas riesgo: {zonas_count}\n"
            f"🔔 Alertas no leídas: {alertas_hoy}\n"
            f"🆘 SOS hoy: {sos_hoy}\n"
        )

    if intent == 'routes':
        return (
            "🗺️ **Rutas seguras**\n\n"
            "Para calcular una ruta con evaluación de riesgo:\n\n"
            "1️⃣ Abre el **mapa** 🗺️\n"
            "2️⃣ Activa el botón **🚗 Ruta** en la barra de capas\n"
            "3️⃣ Escribe tu **origen y destino**\n"
            "4️⃣ El sistema evalúa el riesgo de cada segmento\n"
            "5️⃣ Puedes filtrar por **evitar CRÍTICO/ALTO** y ordenar por ⚡rápido o 🛡️seguro\n\n"
            "¿Quieres que te lleve al mapa? 👉 [Abrir mapa 🗺️]"
        )

    if intent == 'sos':
        return (
            "🚨 **¿Necesitas ayuda de emergencia?**\n\n"
            "En la app tienes el botón **🆘 SOS** (esquina inferior derecha)\n\n"
            "• Al activarlo, notifica a tus contactos de emergencia\n"
            "• Comparte tu ubicación en tiempo real\n"
            "• Recibirás asistencia prioritaria\n\n"
            "Si es una emergencia real, llama también a las autoridades:\n"
            "🚓 Policía: 123\n🚑 Ambulancia: 125\n🔥 Bomberos: 119"
        )

    return (
        "🤔 No entendí bien tu pregunta.\n\n"
        "Puedes preguntarme sobre:\n"
        "• ⚠️ Zonas de riesgo\n"
        "• 🌤️ Clima\n"
        "• 📊 Estadísticas\n"
        "• 🚇 Transporte\n"
        "• 🗺️ Rutas seguras\n\n"
        "O escribe **\"ayuda\"** para ver todos los comandos."
    )
