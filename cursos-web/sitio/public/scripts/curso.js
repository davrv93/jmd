(function () {
  if (!window.gsap) return;
  var gsap = window.gsap;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce) return;

  // Sin ScrollTrigger: el smoke test toma fullPage screenshots sin scroll "humano".
  // Animación inicial simple desde un estado final visible, limpiando props inline.
  var els = gsap.utils.toArray('.course-head, .section, .insc');
  if (!els.length) return;
  gsap.from(els, {
    opacity: 0,
    y: 12,
    duration: 0.38,
    stagger: 0.06,
    ease: 'power2.out',
    clearProps: 'transform,opacity'
  });
})();
