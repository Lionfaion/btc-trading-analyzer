// Animation Engine - GSAP utilities for futuristic UI animations

class AnimationEngine {
  // Initialize GSAP with defaults
  static init() {
    if (typeof gsap === 'undefined') {
      console.warn('GSAP not loaded. Animations will use CSS only.');
      return;
    }
    gsap.registerPlugin(ScrollToPlugin);
  }

  // Reveal section with staggered card animation
  static revealSection(sectionElement) {
    if (typeof gsap === 'undefined') return;

    const cards = sectionElement.querySelectorAll('.glass-card');

    gsap.timeline()
      .to(sectionElement, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out'
      }, 0)
      .to(cards, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      }, 0.1);
  }

  // Initial page load animation
  static initialLoad() {
    if (typeof gsap === 'undefined') return;

    const header = document.querySelector('.header');
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');
    const activeSection = document.querySelector('.section.active');

    const tl = gsap.timeline();

    // Animate header
    tl.from(header, {
      y: -80,
      opacity: 0,
      duration: 0.6,
      ease: 'power3.out'
    }, 0)
    // Animate sidebar
    .from(sidebar, {
      x: -280,
      opacity: 0,
      duration: 0.6,
      ease: 'power3.out'
    }, 0.1)
    // Animate content cards
    .from(activeSection.querySelectorAll('.glass-card'), {
      y: 30,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    }, 0.3);
  }

  // Hover glow effect on cards
  static cardHoverGlow(cardElement) {
    if (typeof gsap === 'undefined') return;

    cardElement.addEventListener('mouseenter', () => {
      gsap.to(cardElement, {
        duration: 0.3,
        ease: 'power2.out',
        boxShadow: '0 8px 32px rgba(0, 217, 255, 0.4)'
      });
    });

    cardElement.addEventListener('mouseleave', () => {
      gsap.to(cardElement, {
        duration: 0.3,
        ease: 'power2.out',
        boxShadow: '0 8px 32px rgba(31, 38, 135, 0.2)'
      });
    });
  }

  // Button click feedback
  static buttonClickFeedback(buttonElement) {
    if (typeof gsap === 'undefined') return;

    buttonElement.addEventListener('click', () => {
      gsap.to(buttonElement, {
        duration: 0.1,
        scale: 0.95,
        ease: 'power2.inOut'
      });

      gsap.to(buttonElement, {
        duration: 0.3,
        scale: 1,
        ease: 'elastic.out(1, 0.3)',
        delay: 0.1
      });
    });
  }

  // Metric value update animation
  static updateMetricValue(metricElement, newValue) {
    if (typeof gsap === 'undefined') return;

    const valueElement = metricElement.querySelector('.metric-value');

    gsap.timeline()
      .to(valueElement, {
        duration: 0.2,
        scale: 1.2,
        color: '#FF00FF',
        ease: 'back.out'
      })
      .to(valueElement, {
        duration: 0.4,
        scale: 1,
        color: '#00D9FF',
        ease: 'elastic.out(1, 0.5)'
      });

    // Update value after initial animation
    setTimeout(() => {
      valueElement.textContent = newValue;
    }, 100);
  }

  // Slide in list items
  static slideInList(listElement) {
    if (typeof gsap === 'undefined') return;

    const items = listElement.querySelectorAll('.order-item, .trade-item');

    gsap.to(items, {
      duration: 0.4,
      opacity: 1,
      x: 0,
      stagger: 0.05,
      ease: 'power2.out'
    });
  }

  // Smooth number counter
  static countTo(element, targetValue, duration = 1) {
    if (typeof gsap === 'undefined') return;

    const currentValue = parseFloat(element.textContent.replace(/[^0-9.-]/g, '')) || 0;

    gsap.to({ value: currentValue }, {
      value: targetValue,
      duration: duration,
      ease: 'power2.out',
      onUpdate: function() {
        element.textContent = '$' + this.targets()[0].value.toFixed(2);
      }
    });
  }

  // Pulse effect for status badges
  static pulseBadge(badgeElement) {
    if (typeof gsap === 'undefined') return;

    gsap.to(badgeElement, {
      duration: 1.5,
      repeat: -1,
      boxShadow: [
        '0 0 0 0 rgba(0, 255, 136, 0.4)',
        '0 0 0 10px rgba(0, 255, 136, 0)'
      ],
      ease: 'power1.out'
    });
  }

  // Form field focus animation
  static formFieldFocus(inputElement) {
    inputElement.addEventListener('focus', () => {
      if (typeof gsap === 'undefined') return;

      gsap.to(inputElement, {
        duration: 0.3,
        boxShadow: '0 0 20px rgba(0, 217, 255, 0.5), inset 0 0 10px rgba(0, 217, 255, 0.1)',
        ease: 'power2.out'
      });
    });

    inputElement.addEventListener('blur', () => {
      if (typeof gsap === 'undefined') return;

      gsap.to(inputElement, {
        duration: 0.3,
        boxShadow: 'none',
        ease: 'power2.out'
      });
    });
  }

  // Confirm success with toast notification
  static showSuccessToast(message) {
    if (typeof gsap === 'undefined') {
      alert(message);
      return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.textContent = '✅ ' + message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 255, 136, 0.2);
      border: 1px solid rgba(0, 255, 136, 0.5);
      border-radius: 4px;
      padding: 15px 20px;
      color: #00ff88;
      font-size: 13px;
      z-index: 1000;
      backdrop-filter: blur(10px);
    `;

    document.body.appendChild(toast);

    gsap.timeline()
      .from(toast, {
        opacity: 0,
        x: 100,
        duration: 0.4,
        ease: 'power2.out'
      })
      .to(toast, {
        opacity: 0,
        x: 100,
        duration: 0.4,
        ease: 'power2.in',
        delay: 3
      }, '-=0.2')
      .then(() => {
        toast.remove();
      });
  }

  // Show error with shake animation
  static showErrorToast(message) {
    if (typeof gsap === 'undefined') {
      alert('Error: ' + message);
      return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.textContent = '❌ ' + message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(255, 68, 68, 0.2);
      border: 1px solid rgba(255, 68, 68, 0.5);
      border-radius: 4px;
      padding: 15px 20px;
      color: #ff4444;
      font-size: 13px;
      z-index: 1000;
      backdrop-filter: blur(10px);
    `;

    document.body.appendChild(toast);

    gsap.timeline()
      .from(toast, {
        opacity: 0,
        x: 100,
        duration: 0.4,
        ease: 'power2.out'
      })
      .to(toast, {
        x: -5,
        duration: 0.05,
        repeat: 3,
        yoyo: true
      })
      .to(toast, {
        opacity: 0,
        x: 100,
        duration: 0.4,
        ease: 'power2.in',
        delay: 3
      })
      .then(() => {
        toast.remove();
      });
  }

  // Confetti effect for successful trade
  static celebrateWin() {
    if (typeof gsap === 'undefined') return;

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: ${Math.random() > 0.5 ? '#00D9FF' : '#FF00FF'};
        left: ${Math.random() * window.innerWidth}px;
        top: -10px;
        border-radius: 50%;
        pointer-events: none;
        z-index: 999;
      `;

      document.body.appendChild(confetti);

      gsap.to(confetti, {
        duration: 2 + Math.random(),
        y: window.innerHeight + 10,
        x: '+=' + (Math.random() * 200 - 100),
        opacity: 0,
        rotation: Math.random() * 360,
        ease: 'power2.in',
        onComplete: () => {
          confetti.remove();
        }
      });
    }
  }

  // Stagger button activation
  static staggerButtons(containerElement) {
    if (typeof gsap === 'undefined') return;

    const buttons = containerElement.querySelectorAll('button, [role="button"]');

    gsap.from(buttons, {
      duration: 0.5,
      opacity: 0,
      y: 20,
      stagger: 0.1,
      ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    });
  }

  // Scroll to element smoothly
  static scrollTo(element, duration = 0.8) {
    if (typeof gsap === 'undefined') {
      element.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    gsap.to(window, {
      duration: duration,
      scrollTo: { y: element, offsetY: 100 },
      ease: 'power2.inOut'
    });
  }

  // Chart animation (grows from bottom)
  static animateChart(chartElement) {
    if (typeof gsap === 'undefined') return;

    gsap.from(chartElement, {
      duration: 0.8,
      opacity: 0,
      scaleY: 0.8,
      transformOrigin: '50% 100%',
      ease: 'back.out(1.7)'
    });
  }

  // Loading spinner animation
  static createLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'loading';
    return spinner;
  }

  // Disable animations globally (for performance)
  static disableAnimations() {
    if (typeof gsap !== 'undefined') {
      gsap.globalTimeline.clear();
      gsap.set('*', { clearProps: 'all' });
    }
    document.documentElement.style.setProperty('--transition-fast', '0s');
    document.documentElement.style.setProperty('--transition-normal', '0s');
  }

  // Re-enable animations
  static enableAnimations() {
    document.documentElement.style.removeProperty('--transition-fast');
    document.documentElement.style.removeProperty('--transition-normal');
  }

  // Staggered grid animation (for multiple cards)
  static animateGrid(gridSelector) {
    if (typeof gsap === 'undefined') return;

    const cards = document.querySelectorAll(gridSelector);

    gsap.from(cards, {
      duration: 0.6,
      opacity: 0,
      y: 30,
      stagger: {
        grid: [Math.ceil(Math.sqrt(cards.length)), Math.ceil(Math.sqrt(cards.length))],
        from: 'center',
        amount: 0.3
      },
      ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    });
  }

  // Parallax scroll effect
  static enableParallax(elements, speed = 0.5) {
    if (typeof gsap === 'undefined') return;

    window.addEventListener('scroll', () => {
      elements.forEach(el => {
        gsap.to(el, {
          y: window.scrollY * speed,
          duration: 0,
          overwrite: 'auto'
        });
      });
    });
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AnimationEngine.init());
} else {
  AnimationEngine.init();
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimationEngine;
}
