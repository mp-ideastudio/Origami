
            document.addEventListener('DOMContentLoaded', () => {
                const pipCanvas = document.getElementById('pipCanvas');
                if (pipCanvas) {
                    pipCanvas.addEventListener('click', () => {
                        window.parent.postMessage({ type: 'PIP_TOGGLE' }, '*');
                    });
                    pipCanvas.addEventListener('wheel', (e) => {
                        e.preventDefault();
                        window.parent.postMessage({ type: 'PIP_ZOOM', delta: Math.sign(e.deltaY) }, '*');
                    }, { passive: false });
                }

                // Moonphase calculation based on current Date
                function getMoonPhase() {
                    const today = new Date();
                    let year = today.getFullYear();
                    let month = today.getMonth() + 1;
                    let day = today.getDate();
                    if (month < 3) { year--; month += 12; }
                    month++;
                    const c = 365.25 * year;
                    const e = 30.6 * month;
                    let jd = c + e + day - 694039.09;
                    jd /= 29.5305882;
                    const b = Math.floor(jd);
                    jd -= b;
                    let phase = Math.round(jd * 8);
                    if (phase >= 8) phase = 0;
                    return phase;
                }
                
                const phase = getMoonPhase(); // 0 to 7
                const phaseNames = ['NEW MOON PHASE', 'WAXING CRESCENT MOON PHASE', 'FIRST QUARTER MOON PHASE', 'WAXING GIBBOUS MOON PHASE', 'FULL MOON PHASE', 'WANING GIBBOUS MOON PHASE', 'LAST QUARTER MOON PHASE', 'WANING CRESCENT MOON PHASE'];
                window.parent.postMessage({ type: 'MOON_PHASE', phase: phaseNames[phase] }, '*');

                const ring = document.querySelector('.season-outer-ring');
                if (ring) {
                    const rotation = -(phase * 45);
                    ring.style.transform = `rotate(${rotation}deg)`;
                }
            });
        