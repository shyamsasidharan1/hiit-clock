/**
 * AudioController — all TTS logic via Web Speech API.
 * Not a React component; used as a plain module singleton.
 */

let muted = false
let rate = 1.0
let selectedVoice = null

export function setMuted(val) { muted = val }
export function setRate(val) { rate = val }
export function setVoice(voice) { selectedVoice = voice }

/** Returns available voices filtered to English. */
export function getVoices() {
  return window.speechSynthesis
    ? window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'))
    : []
}

function speak(text) {
  if (muted || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = rate
  utt.pitch = 1.0
  utt.volume = 1.0
  if (selectedVoice) utt.voice = selectedVoice
  window.speechSynthesis.speak(utt)
}

export function cueSessionStart(sessionName, firstExercise, firstDescription) {
  const desc = firstDescription ? ` ${firstDescription}.` : ''
  speak(`Starting ${sessionName}. First exercise: ${firstExercise}.${desc}`)
}

export function cueWorkStart(exerciseName, description) {
  const desc = description ? ` ${description}.` : ''
  speak(`${exerciseName}. Go!${desc}`)
}

export function cueHalfway() {
  speak('Halfway!')
}

export function cueWorkEnding() {
  // "Three. Two. One." — spoken one word per second via chained utterances
  if (muted || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const words = ['Three', 'Two', 'One']
  words.forEach((word, i) => {
    setTimeout(() => {
      if (muted) return
      const utt = new SpeechSynthesisUtterance(word)
      utt.rate = rate
      utt.pitch = 1.0
      utt.volume = 1.0
      if (selectedVoice) utt.voice = selectedVoice
      window.speechSynthesis.speak(utt)
    }, i * 1000)
  })
}

export function cueRest() {
  speak('Rest.')
}

export function cueRestEnding() {
  speak('Get ready!')
}

export function cueNextExercise(exerciseName) {
  speak(`${exerciseName}. Go!`)
}

export function cueComplete() {
  speak('Well done! Workout complete.')
}

export function cancelSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel()
}
