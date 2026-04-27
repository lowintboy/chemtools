<script>
  import { browser } from '$app/environment';
  import { makeQuestion, checkAnswer } from '$lib/quiz.js';
  import FormulaDisplay from './FormulaDisplay.svelte';

  const STATS_KEY = 'chemtools.quiz-stats';
  const DEFAULT_STATS = { total: 0, correct: 0, streak: 0, bestStreak: 0 };

  function loadStats() {
    if (!browser) return { ...DEFAULT_STATS };
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (!raw) return { ...DEFAULT_STATS };
      return { ...DEFAULT_STATS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_STATS };
    }
  }

  let mode = $state(null);
  let current = $state(null);
  let userAnswer = $state('');
  let phase = $state('asking');
  let lastResult = $state(null);
  let stats = $state(loadStats());
  let inputRef = $state(null);
  let advanceTimer = null;

  function clearAdvanceTimer() {
    if (advanceTimer) {
      clearTimeout(advanceTimer);
      advanceTimer = null;
    }
  }

  $effect(() => {
    if (!browser) return;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  });

  function startMode(m) {
    mode = m;
    nextQuestion();
  }

  function nextQuestion() {
    clearAdvanceTimer();
    current = makeQuestion(mode);
    userAnswer = '';
    lastResult = null;
    phase = 'asking';
    if (mode === 'input') {
      queueMicrotask(() => inputRef?.focus());
    }
  }

  function submit(answer) {
    if (phase !== 'asking') return;
    const a = answer ?? userAnswer;
    if (mode === 'input' && !a.trim()) return;
    userAnswer = a;
    const res = checkAnswer(current, a);
    lastResult = res;
    phase = 'feedback';
    stats.total += 1;
    if (res.correct) {
      stats.correct += 1;
      stats.streak += 1;
      if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
      advanceTimer = setTimeout(() => {
        advanceTimer = null;
        nextQuestion();
      }, 400);
    } else {
      stats.streak = 0;
    }
  }

  function handleInputKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (phase === 'asking') submit();
      else nextQuestion();
    }
  }

  function handleGlobalKey(e) {
    if (mode === null) return;

    if (phase === 'feedback') {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        nextQuestion();
      }
      return;
    }

    // asking phase: number keys 1–4 select MC options
    if (mode === 'mc' && current?.options) {
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx >= 0 && idx < current.options.length) {
        e.preventDefault();
        submit(current.options[idx]);
      }
    }
  }

  function changeMode() {
    clearAdvanceTimer();
    mode = null;
    current = null;
    userAnswer = '';
    lastResult = null;
    phase = 'asking';
  }

  function resetStats() {
    stats = { ...DEFAULT_STATS };
  }

  let accuracy = $derived(stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100));
  let promptIsFormula = $derived(current?.direction === 'formula→name');
</script>

<svelte:window onkeydown={handleGlobalKey} />

<div>
  <div class="section-head">
    <div>
      <h2 class="section-title">Practice nomenclature</h2>
      <p class="section-subtitle">
        Test your recall of chemical names and formulas. Random direction, immediate feedback.
      </p>
    </div>
  </div>

  {#if mode === null}
    <div class="quiz-mode-picker">
      <button class="quiz-mode-card" onclick={() => startMode('mc')}>
        <div class="quiz-mode-num">01</div>
        <div class="quiz-mode-title">Multiple choice</div>
        <div class="quiz-mode-desc">Pick the correct answer from four options. Faster, no spelling worries.</div>
      </button>
      <button class="quiz-mode-card" onclick={() => startMode('input')}>
        <div class="quiz-mode-num">02</div>
        <div class="quiz-mode-title">Free input</div>
        <div class="quiz-mode-desc">Type the answer yourself. Closer to a real exam, harder.</div>
      </button>
    </div>

    <div class="quiz-summary">
      <div class="quiz-summary-row">
        <div class="quiz-stat">
          <span class="quiz-stat-label">Answered</span>
          <span class="quiz-stat-value">{stats.total}</span>
        </div>
        <div class="quiz-stat">
          <span class="quiz-stat-label">Accuracy</span>
          <span class="quiz-stat-value">{accuracy}%</span>
        </div>
        <div class="quiz-stat">
          <span class="quiz-stat-label">Best streak</span>
          <span class="quiz-stat-value">{stats.bestStreak}</span>
        </div>
        {#if stats.total > 0}
          <button class="btn" style="margin-left: auto" onclick={resetStats}>Reset stats</button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="quiz-stats-bar">
      <span class="quiz-chip">Total <strong>{stats.total}</strong></span>
      <span class="quiz-chip">Correct <strong>{stats.correct}</strong></span>
      <span class="quiz-chip" class:hot={stats.streak >= 3}>Streak <strong>{stats.streak}</strong></span>
      <span class="quiz-chip">Best <strong>{stats.bestStreak}</strong></span>
      <span class="quiz-chip-spacer"></span>
      <button class="btn" onclick={changeMode}>Change mode</button>
    </div>

    {#key current.id}
      <div class="quiz-card">
        <div class="quiz-direction">
          {current.direction === 'formula→name' ? 'Formula → Name' : 'Name → Formula'}
        </div>
        <div class="quiz-prompt" class:formula={promptIsFormula} class:name={!promptIsFormula}>
          {#if promptIsFormula}
            <FormulaDisplay formula={current.prompt} />
          {:else}
            {current.prompt}
          {/if}
        </div>

        {#if mode === 'mc'}
          <div class="quiz-options">
            {#each current.options as opt, i}
              {@const isCorrect = phase === 'feedback' && opt === lastResult.correctAnswer}
              {@const isWrongPick = phase === 'feedback' && opt === userAnswer && opt !== lastResult.correctAnswer}
              <button
                class="quiz-option"
                class:correct={isCorrect}
                class:incorrect={isWrongPick}
                disabled={phase === 'feedback'}
                onclick={() => submit(opt)}
              >
                <span class="quiz-option-num">{i + 1}</span>
                <span class="quiz-option-text">
                  {#if current.direction === 'name→formula'}
                    <FormulaDisplay formula={opt} />
                  {:else}
                    {opt}
                  {/if}
                </span>
              </button>
            {/each}
          </div>
        {:else}
          <div class="quiz-input-row">
            <input
              bind:this={inputRef}
              bind:value={userAnswer}
              onkeydown={handleInputKey}
              class="quiz-input"
              class:correct={phase === 'feedback' && lastResult.correct}
              class:incorrect={phase === 'feedback' && !lastResult.correct}
              placeholder={current.direction === 'formula→name' ? 'Type the name…' : 'Type the formula…'}
              disabled={phase === 'feedback'}
              spellcheck="false"
              autocomplete="off"
            />
            {#if phase === 'asking'}
              <button class="btn primary" onclick={() => submit()}>Submit</button>
            {/if}
          </div>
        {/if}

        {#if phase === 'feedback'}
          <div class="quiz-feedback" class:ok={lastResult.correct} class:bad={!lastResult.correct}>
            {#if lastResult.correct}
              <span class="quiz-feedback-mark">✓</span>
              <span>Correct</span>
            {:else}
              <span class="quiz-feedback-mark">✗</span>
              <span>
                Answer:
                {#if current.direction === 'name→formula'}
                  <strong><FormulaDisplay formula={lastResult.correctAnswer} /></strong>
                {:else}
                  <strong>{lastResult.correctAnswer}</strong>
                {/if}
              </span>
            {/if}
            {#if !lastResult.correct}
              <button class="btn primary quiz-next" onclick={nextQuestion}>Next →</button>
            {/if}
          </div>
        {/if}
      </div>
    {/key}

    <div class="quiz-hint">
      {#if mode === 'mc' && phase === 'asking'}
        Press <kbd>1</kbd>–<kbd>4</kbd> to pick an option
      {:else if phase === 'feedback'}
        Press <kbd>Space</kbd> for the next question
      {:else if mode === 'input' && phase === 'asking'}
        Press <kbd>Enter</kbd> to submit
      {/if}
    </div>
  {/if}
</div>
