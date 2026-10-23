// One full breath = 8s (4s in, 4s out). The 3D orb and the text label both derive their
// phase from performance.now(), so they always stay in sync.
export const BREATH_MS = 8000;
export const breathPhase = () => (performance.now() % BREATH_MS) / BREATH_MS; // 0..1
