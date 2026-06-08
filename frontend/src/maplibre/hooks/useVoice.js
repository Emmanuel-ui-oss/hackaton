import { useEffect, useRef, useCallback } from 'react';

const VELOCIDAD = { ALTA: 0.82, NORMAL: 0.88, BAJA: 0.95 };
const PRIO = { ALTA: 3, NORMAL: 2, BAJA: 1 };
const TIMEOUT_SEG = 12;

const LANG_PREF = ['es-CO', 'es-MX', 'es-ES', 'es-US', 'es'];

function encontrarMejorVoz(synth) {
    const voces = synth.getVoices();
    if (!voces || voces.length === 0) return null;
    for (const lang of LANG_PREF) {
        const encontrada = voces.find(v => v.lang.startsWith(lang));
        if (encontrada) return encontrada;
    }
    return voces.find(v => v.lang.startsWith('es')) || voces[0];
}

export default function useVoice() {
    const colaRef = useRef([]);
    const hablandoRef = useRef(false);
    const vozRef = useRef(null);
    const timerRef = useRef(null);
    const onSpeakingRef = useRef(null);
    const synthRef = useRef(null);

    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    synthRef.current = synth;

    useEffect(() => {
        if (!synth) return;
        const handler = () => {
            vozRef.current = encontrarMejorVoz(synth);
        };
        handler();
        synth.addEventListener('voiceschanged', handler);
        return () => synth.removeEventListener('voiceschanged', handler);
    }, [synth]);

    function limpiarTimeout() {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }

    function procesarCola() {
        if (!synthRef.current || hablandoRef.current || colaRef.current.length === 0) return;
        hablandoRef.current = true;
        if (onSpeakingRef.current) onSpeakingRef.current(true);

        const item = colaRef.current.shift();
        if (item.onPlay) item.onPlay();

        const u = new SpeechSynthesisUtterance(item.texto);
        const voz = vozRef.current;
        if (voz) {
            u.voice = voz;
            u.lang = voz.lang;
        } else {
            u.lang = 'es-CO';
        }
        u.rate = VELOCIDAD[item.prio] ?? 0.88;
        u.volume = 1;

        u.onend = () => {
            limpiarTimeout();
            hablandoRef.current = false;
            if (onSpeakingRef.current) onSpeakingRef.current(false);
            procesarCola();
        };

        u.onerror = () => {
            limpiarTimeout();
            hablandoRef.current = false;
            if (onSpeakingRef.current) onSpeakingRef.current(false);
            if (!item.reintentado) {
                item.reintentado = true;
                colaRef.current.unshift(item);
            }
            procesarCola();
        };

        limpiarTimeout();
        timerRef.current = setTimeout(() => {
            if (hablandoRef.current) {
                hablandoRef.current = false;
                if (onSpeakingRef.current) onSpeakingRef.current(false);
                procesarCola();
            }
        }, TIMEOUT_SEG * 1000);

        try {
            synthRef.current.speak(u);
        } catch {
            hablandoRef.current = false;
            if (onSpeakingRef.current) onSpeakingRef.current(false);
            procesarCola();
        }
    }

    const speak = useCallback((texto, prioridad = PRIO.NORMAL, onPlay = null) => {
        if (!synthRef.current || !texto) return;
        const prioNum = typeof prioridad === 'number' ? prioridad : (PRIO[prioridad] ?? PRIO.NORMAL);

        const insertar = (items) => {
            colaRef.current = items;
            if (!hablandoRef.current) procesarCola();
        };

        const filtrarMenor = (minPrio) =>
            colaRef.current.filter(q => q.prio >= minPrio);

        if (prioNum >= PRIO.ALTA) {
            if (hablandoRef.current) {
                const hablandoPrio = colaRef.current.length > 0 ? colaRef.current[0].prio : PRIO.ALTA;
                if (hablandoPrio < PRIO.ALTA) {
                    // Interrumpir — solo si lo que suena es BAJA o NORMAL
                    try { synthRef.current.cancel(); } catch {}
                    hablandoRef.current = false;
                    if (onSpeakingRef.current) onSpeakingRef.current(false);
                }
            }
            insertar([{ texto, prio: prioNum, onPlay }, ...filtrarMenor(PRIO.ALTA)]);
            return;
        }

        if (prioNum === PRIO.NORMAL) {
            if (hablandoRef.current) {
                const hablandoPrio = colaRef.current.length > 0 ? colaRef.current[0].prio : PRIO.ALTA;
                if (hablandoPrio < PRIO.NORMAL) {
                    try { synthRef.current.cancel(); } catch {}
                    hablandoRef.current = false;
                    if (onSpeakingRef.current) onSpeakingRef.current(false);
                }
            }
            const nuevaCola = [{ texto, prio: prioNum, onPlay }];
            // Conservar los HIGH existentes
            for (const q of colaRef.current) {
                if (q.prio > prioNum) nuevaCola.push(q);
            }
            insertar(nuevaCola);
            return;
        }

        // BAJA — solo si nada está sonando ni en cola
        if (!hablandoRef.current && colaRef.current.length === 0) {
            insertar([{ texto, prio: prioNum, onPlay }]);
        }
    }, []);

    const cancelAll = useCallback(() => {
        if (synthRef.current) {
            try { synthRef.current.cancel(); } catch {}
        }
        colaRef.current = [];
        hablandoRef.current = false;
        limpiarTimeout();
        if (onSpeakingRef.current) onSpeakingRef.current(false);
    }, []);

    return { speak, cancelAll, setOnSpeaking: cb => { onSpeakingRef.current = cb; }, vozRef };
}
