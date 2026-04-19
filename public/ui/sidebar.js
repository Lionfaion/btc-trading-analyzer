// Sidebar Component - Navigation menu

class Sidebar {
  constructor() {
    this.sections = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'live-trading', label: 'Trading en Vivo' },
      { id: 'backtesting', label: 'Backtesting' },
      { id: 'strategy-manager', label: 'Estrategias' },
      { id: 'analytics', label: 'Analítica' },
      { id: 'account', label: 'Cuenta' }
    ];
    this.currentSection = 'dashboard';
    this.isMobileOpen = false;
  }

  init() {
    this.setupNavigation();
    this.setupMobileMenu();
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const sectionId = item.dataset.section;
        this.navigateTo(sectionId);
      });
    });
  }

  navigateTo(sectionId) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.section === sectionId) {
        item.classList.add('active');
      }
    });

    // Show active section
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });

    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
      activeSection.classList.add('active');

      // Animate section reveal
      if (typeof AnimationEngine !== 'undefined') {
        AnimationEngine.revealSection(activeSection);
      }
    }

    this.currentSection = sectionId;
    this.closeMobileMenu();
  }

  setupMobileMenu() {
    // Mobile menu toggle (if needed)
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Handle orientation changes
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        this.closeMobileMenu();
      }
    });
  }

  toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    this.isMobileOpen = !this.isMobileOpen;
    if (this.isMobileOpen) {
      sidebar.classList.add('active');
    } else {
      sidebar.classList.remove('active');
    }
  }

  closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.remove('active');
    }
    this.isMobileOpen = false;
  }

  getCurrentSection() {
    return this.currentSection;
  }

  getSectionLabel(sectionId) {
    const section = this.sections.find(s => s.id === sectionId);
    return section ? section.label : 'Unknown';
  }
}

const sidebar = new Sidebar();
sidebar.init();
