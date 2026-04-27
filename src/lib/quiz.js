import { COMMON_NAMES } from './data/nomenclature-data.js';

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return String(Math.random()).slice(2);
}

export function makeQuestion(mode) {
  const entry = pickRandom(COMMON_NAMES);
  const direction = Math.random() < 0.5 ? 'formula→name' : 'name→formula';
  const prompt = direction === 'formula→name' ? entry.formula : entry.name;
  const answer = direction === 'formula→name' ? entry.name : entry.formula;

  const q = { id: newId(), direction, prompt, answer };

  if (mode === 'mc') {
    const distractors = new Set();
    const answerSide = direction === 'formula→name' ? 'name' : 'formula';
    while (distractors.size < 3) {
      const candidate = pickRandom(COMMON_NAMES);
      if (candidate[answerSide] !== answer) distractors.add(candidate[answerSide]);
    }
    q.options = shuffle([answer, ...distractors]);
  }

  return q;
}

function normalize(s) {
  return s.trim().replace(/\s+/g, ' ');
}

export function checkAnswer(question, userAnswer) {
  const correctAnswer = question.answer;
  if (question.options) {
    return { correct: userAnswer === correctAnswer, correctAnswer };
  }
  const a = normalize(userAnswer);
  const b = normalize(correctAnswer);
  const isName = question.direction === 'formula→name';
  const correct = isName ? a.toLowerCase() === b.toLowerCase() : a === b;
  return { correct, correctAnswer };
}
