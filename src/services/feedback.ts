let audio: AudioContext | undefined;
export const soundsEnabled = () => { try { return localStorage.getItem('virla-sounds') === 'on'; } catch { return false; } };
export function unlockSounds() {
  if (!soundsEnabled()) return;
  try { audio ??= new AudioContext(); if (audio.state === 'suspended') void audio.resume().catch(() => undefined); } catch { /* Audio is optional. */ }
}
export function setSounds(enabled: boolean) {
  try { localStorage.setItem('virla-sounds', enabled ? 'on' : 'off'); } catch { /* Device setting only. */ }
  if (enabled) { audio ??= new AudioContext(); void audio.resume().then(() => playFeedback('sent')).catch(() => undefined); }
}
export function playFeedback(kind: 'sent' | 'confirmed' | 'incoming') {
  if (!soundsEnabled() || !audio || audio.state !== 'running') return;
  const notes = kind === 'confirmed' ? [523, 659, 784] : kind === 'incoming' ? [740, 554, 740] : [440, 660];
  notes.forEach((frequency, index) => { const oscillator = audio!.createOscillator(); const gain = audio!.createGain(); const time = audio!.currentTime + index * .16; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(.065, time + .02); gain.gain.exponentialRampToValueAtTime(.001, time + .15); oscillator.connect(gain); gain.connect(audio!.destination); oscillator.start(time); oscillator.stop(time + .16); });
}
export function readGuide(text: string) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(text); speech.lang = 'es-AR'; speech.rate = .95; window.speechSynthesis.speak(speech); return true;
}
