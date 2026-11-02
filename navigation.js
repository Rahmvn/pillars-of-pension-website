/* Shared progressive navigation. The four destinations remain ordinary HTML links. */
(() => {
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const layer = header.parentElement;
  const toggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.primary-navigation');
  const scrim = document.querySelector('.menu-scrim');
  const main = document.querySelector('main');
  const skipLink = document.querySelector('.skip-link');
  const compact = window.matchMedia('(max-width: 1099px)');
  let open = false;

  root.classList.add('js');
  toggle.hidden = false;

  function setOpen(next, restoreFocus = true) {
    open = next && compact.matches;
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    scrim.hidden = !open;
    main.inert = open;
    skipLink.inert = open;
    if (open) {
      layer.setAttribute('role', 'dialog');
      layer.setAttribute('aria-modal', 'true');
      layer.setAttribute('aria-label', 'Site navigation');
      toggle.focus({ preventScroll: true });
    } else {
      layer.removeAttribute('role');
      layer.removeAttribute('aria-modal');
      layer.removeAttribute('aria-label');
      if (restoreFocus && compact.matches) toggle.focus({ preventScroll: true });
    }
  }

  toggle.addEventListener('click', () => setOpen(!open));
  scrim.addEventListener('click', () => setOpen(false));
  navigation.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    if (link.hasAttribute('aria-current')) event.preventDefault();
    if (open) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
    if (event.key === 'Tab') {
      const controls = [toggle, ...navigation.querySelectorAll('a')];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
  });
  compact.addEventListener('change', () => {
    const focusWasInHeader = header.contains(document.activeElement);
    setOpen(false, false);
    if (focusWasInHeader) {
      (compact.matches ? toggle : navigation.querySelector('[aria-current]')).focus({ preventScroll: true });
    }
  });

  // Keep the designed control discoverable without inventing an acquisition route.
  document.querySelector('.get-book')?.addEventListener('click', event => {
    event.currentTarget.textContent = 'Coming soon';
    document.querySelector('#acquisition-status').textContent = 'Book ordering information is coming soon.';
  });
})();
