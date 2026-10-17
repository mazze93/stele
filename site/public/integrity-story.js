/* Editorial walkthrough of independent gate examples, not a running session.
   The examples are checked against the production gate by site/check-story.mjs. */
(() => {
  const story = document.querySelector('[data-integrity-story]');
  if (!story) return;
  const scenes = [...story.querySelectorAll('[data-scene]')];
  const choices = [...story.querySelectorAll('[data-choice]')];
  const play = story.querySelector('[data-play]');
  const announcement = story.querySelector('[data-announcement]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer;
  let current = 3;
  let playing = false;

  function show(index) {
    current = index;
    scenes.forEach((scene, i) => { scene.hidden = i !== index; });
    choices.forEach((choice, i) => { choice.setAttribute('aria-pressed', String(i === index)); });
    story.dataset.active = scenes[index].dataset.scene;
    announcement.textContent = scenes[index].querySelector('h2').textContent + '. ' +
      scenes[index].querySelector('.verdict').textContent;
  }
  function stop() {
    clearTimeout(timer);
    playing = false;
    play.textContent = 'Play the four states';
  }
  function advance() {
    if (current === 3) { stop(); return; }
    show(current + 1);
    timer = setTimeout(advance, 5000);
  }
  choices.forEach((choice, i) => choice.addEventListener('click', () => { stop(); show(i); }));
  play.addEventListener('click', () => {
    if (playing) { stop(); return; }
    show(0);
    if (motion.matches) return; // Deliberate, manual state selection with reduced motion.
    playing = true;
    play.textContent = 'Pause the walkthrough';
    timer = setTimeout(advance, 5000);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  motion.addEventListener('change', () => { stop(); syncMotion(); });
  function syncMotion() {
    play.hidden = motion.matches;
    story.querySelector('[data-manual]').hidden = !motion.matches;
  }
  story.classList.add('interactive');
  story.querySelector('.story-controls').hidden = false;
  syncMotion();
  show(3); // The first impression and the final resting state are deliberate suspension.
})();
