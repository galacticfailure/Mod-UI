(() => {
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'slick';
  // Slick centralizes all the little animation helpers so other modules can
  // bounce UI in/out without duplicating the transition boilerplate.

  
  window.fjfeSlickAnimateIn = function(host) {
    if (!host) return;
    try {
      host.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease';
      host.style.willChange = 'transform, opacity';
      host.style.transform = 'translateY(-12px)';
      host.style.opacity = '0';
      host.offsetHeight;
      host.style.transform = 'translateY(0)';
      host.style.opacity = '1';
      let finished = false;
      const cleanup = () => {
        if (finished) return;
        finished = true;
        try {
          host.removeEventListener('transitionend', onEnd);
        }
 catch (e) {}
        try {
          host.style.transition = ''; host.style.willChange = '';
        }
 catch (e) {}
      };
      const onEnd = (ev) => {
        if (ev.target !== host) return;
        cleanup();
      };
      host.addEventListener('transitionend', onEnd);
      setTimeout(cleanup, 420);
    } catch (e) {}
  };

  const safe = (fn) => {
    try {
      return fn();
    } catch (e) {
      void e;
      return null;
    }
  };

  const openTweakerMenu = (host) => {
    return new Promise((resolve) => {
      if (!host) return resolve();
      const ok = safe(() => {
        host.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease';
        host.style.willChange = 'transform, opacity';
        host.style.transform = 'translateY(-6px)';
        host.style.opacity = '0';
        host.offsetHeight;
        host.style.transform = 'translateY(0)';
        host.style.opacity = '1';

        let finished = false;
        const cleanup = () => {
          if (finished) return;
          finished = true;
          try {
            host.removeEventListener('transitionend', onEnd);
          }
 catch (e) {}
          try {
            host.style.transition = ''; host.style.willChange = '';
          }
 catch (e) {}
          resolve();
        };

        const onEnd = (ev) => {
          if (ev.target !== host) return;
          cleanup();
        };

        host.addEventListener('transitionend', onEnd);
        setTimeout(cleanup, 420);
        return true;
      });
      if (!ok) resolve();
    });
  };

  const closeTweakerMenu = (host) => {
    return new Promise((resolve) => {
      if (!host) return resolve();
      const ok = safe(() => {
        try {
          if (host.style.display === 'none') host.style.display = 'block';
          host.style.visibility = '';
        } catch (e) {}

        host.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease';
        host.style.willChange = 'transform, opacity';

        try {
          host.style.transform = 'translateY(0)';
        }
 catch(e) {}
        try {
          host.style.opacity = '1';
        }
 catch(e) {}
        host.offsetHeight;

        let finished = false;
        const cleanup = () => {
          if (finished) return;
          finished = true;
          try {
            host.removeEventListener('transitionend', onEnd);
          }
 catch (e) {}
          try {
            host.style.transition = ''; host.style.willChange = '';
          }
 catch (e) {}
          resolve();
        };

        const onEnd = (ev) => {
          if (ev.target !== host) return;
          cleanup();
        };

        host.addEventListener('transitionend', onEnd);
        try {
          host.style.transform = 'translateY(-6px)';
          host.style.opacity = '0';
        } catch (e) {}

        setTimeout(() => {
          cleanup();
        }, 420);
        return true;
      });
      if (!ok) resolve();
    });
  };

  const openRateCounter = (host) => {
    return new Promise((resolve) => {
      if (!host) return resolve();
      const ok = safe(() => {
        host.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease';
        host.style.willChange = 'transform, opacity';
        host.style.transform = 'translateY(6px) scale(0.95)';
        host.style.opacity = '0';
        host.style.display = 'flex';
        host.offsetHeight;
        host.style.transform = 'translateY(0) scale(1)';
        host.style.opacity = '1';

        let finished = false;
        const cleanup = () => {
          if (finished) return;
          finished = true;
          try {
            host.removeEventListener('transitionend', onEnd);
          }
 catch (e) {}
          try {
            host.style.transition = ''; host.style.willChange = '';
          }
 catch (e) {}
          resolve();
        };

        const onEnd = (ev) => {
          if (ev.target !== host) return;
          cleanup();
        };

        host.addEventListener('transitionend', onEnd);
        setTimeout(cleanup, 420);
        return true;
      });
      if (!ok) resolve();
    });
  };

  const closeRateCounter = (host) => {
    return new Promise((resolve) => {
      if (!host) return resolve();
      const ok = safe(() => {
        host.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease';
        host.style.willChange = 'transform, opacity';

        try {
          host.style.transform = 'translateY(0) scale(1)';
        }
 catch(e) {}
        try {
          host.style.opacity = '1';
        }
 catch(e) {}
        host.offsetHeight;

        let finished = false;
        const cleanup = () => {
          if (finished) return;
          finished = true;
          try {
            host.removeEventListener('transitionend', onEnd);
          }
 catch (e) {}
          try {
            host.style.transition = ''; host.style.willChange = '';
          }
 catch (e) {}
          try {
            host.style.display = 'none';
          }
 catch (e) {}
          resolve();
        };

        const onEnd = (ev) => {
          if (ev.target !== host) return;
          cleanup();
        };

        host.addEventListener('transitionend', onEnd);
        try {
          host.style.transform = 'translateY(6px) scale(0.95)';
          host.style.opacity = '0';
        } catch (e) {}

        setTimeout(() => {
          cleanup();
        }, 420);
        return true;
      });
      if (!ok) resolve();
    });
  };

  const slideElementTo = (element, targetLeft, targetTop) => {
    return new Promise((resolve) => {
      if (!element) return resolve();
      const ok = safe(() => {

        const currentRect = element.getBoundingClientRect();
        const currentLeft = currentRect.left;
        const currentTop = currentRect.top;
        // Compute the screen-space delta so we can animate to the new position
        // before committing the final fixed coordinates.

        const deltaX = targetLeft - currentLeft;
        const deltaY = targetTop - currentTop;
        

        element.style.transition = 'transform 180ms cubic-bezier(.25,.8,.25,1)';
        element.style.willChange = 'transform';
        

        element.offsetHeight;
        

        element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        
        let finished = false;
        const cleanup = () => {
          if (finished) return;
          finished = true;
          try {
            element.removeEventListener('transitionend', onEnd);
          }
 catch (e) {}
          try { 
            element.style.transition = ''; 
            element.style.willChange = '';
            element.style.transform = '';

            element.style.position = 'fixed';
            element.style.left = `${targetLeft}px`;
            element.style.top = `${targetTop}px`;
          } catch (e) {}
          resolve();
        };

        const onEnd = (ev) => {
          if (ev.target !== element) return;
          cleanup();
        };

        element.addEventListener('transitionend', onEnd);
        setTimeout(cleanup, 300);
        return true;
      });
      if (!ok) resolve();
    });
  };

  const init = () => {
    if (window.location.hostname !== targetHost) {
      return;
    }
  };

  if (!window.fjTweakerModules) {
    window.fjTweakerModules = {};
  }

  window.fjTweakerModules[MODULE_KEY] = { init, openTweakerMenu, closeTweakerMenu, openRateCounter, closeRateCounter, slideElementTo };
})();
