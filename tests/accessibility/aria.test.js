import { describe, it, expect, beforeEach } from 'vitest';

// Setup DOM for testing
beforeEach(() => {
  document.body.innerHTML = `
    <button class="theme-toggle" id="themeToggle" aria-label="Toggle between light and dark theme">
      <span class="theme-icon" id="themeIcon" aria-hidden="true">🌙</span>
      <span class="theme-label" id="themeLabel">Moon Elf</span>
    </button>
    
    <div class="settings-accordion">
      <button class="settings-toggle" id="settingsToggle" aria-expanded="false" aria-controls="settingsContent">
        <span class="settings-toggle-title">Generation Settings</span>
      </button>
      <div class="settings-content" id="settingsContent" hidden>
        <div class="setting-group">
          <label for="subrace">Subrace</label>
          <select id="subrace" aria-label="Select elven subrace"></select>
        </div>
      </div>
    </div>
    
    <div class="breakdown">
      <button class="breakdown-toggle" id="breakdownToggle" aria-expanded="false" aria-controls="breakdownContent">
        <span class="breakdown-title">Component Breakdown</span>
      </button>
      <div class="breakdown-content" id="breakdownContent" hidden>
        <div id="breakdown"></div>
      </div>
    </div>
    
    <button id="speakerBtn" aria-label="Pronounce name">
      <span class="speaker-icon-default" aria-hidden="true">🔈</span>
      <span class="speaker-icon-playing" aria-hidden="true">🔊</span>
      <span class="speaker-beta">BETA</span>
    </button>
  `;
});

describe('Accessibility - ARIA Attributes', () => {
  describe('Theme Toggle Button', () => {
    it('should have aria-label for screen readers', () => {
      const themeToggle = document.getElementById('themeToggle');
      expect(themeToggle).toHaveAttribute('aria-label');
      expect(themeToggle.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have aria-hidden on decorative icon', () => {
      const themeIcon = document.getElementById('themeIcon');
      expect(themeIcon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Settings Accordion', () => {
    it('should have aria-expanded attribute on toggle button', () => {
      const settingsToggle = document.getElementById('settingsToggle');
      expect(settingsToggle.getAttribute('aria-expanded')).toBeTruthy();
      expect(settingsToggle.getAttribute('aria-expanded')).toBe('false');
    });

    it('should have aria-controls linking to content', () => {
      const settingsToggle = document.getElementById('settingsToggle');
      const settingsContent = document.getElementById('settingsContent');
      
      expect(settingsToggle.getAttribute('aria-controls')).toBeTruthy();
      expect(settingsToggle.getAttribute('aria-controls')).toBe('settingsContent');
      expect(settingsContent).toBeTruthy();
    });

    it('should have hidden attribute on content when collapsed', () => {
      const settingsContent = document.getElementById('settingsContent');
      expect(settingsContent.hasAttribute('hidden')).toBe(true);
    });
  });

  describe('Breakdown Accordion', () => {
    it('should have aria-expanded attribute on toggle button', () => {
      const breakdownToggle = document.getElementById('breakdownToggle');
      expect(breakdownToggle.getAttribute('aria-expanded')).toBeTruthy();
      expect(breakdownToggle.getAttribute('aria-expanded')).toBe('false');
    });

    it('should have aria-controls linking to content', () => {
      const breakdownToggle = document.getElementById('breakdownToggle');
      const breakdownContent = document.getElementById('breakdownContent');
      
      expect(breakdownToggle.getAttribute('aria-controls')).toBeTruthy();
      expect(breakdownToggle.getAttribute('aria-controls')).toBe('breakdownContent');
      expect(breakdownContent).toBeTruthy();
    });

    it('should have hidden attribute on content when collapsed', () => {
      const breakdownContent = document.getElementById('breakdownContent');
      expect(breakdownContent.hasAttribute('hidden')).toBe(true);
    });
  });

  describe('Speaker Button', () => {
    it('should have aria-label for screen readers', () => {
      const speakerBtn = document.getElementById('speakerBtn');
      expect(speakerBtn.getAttribute('aria-label')).toBeTruthy();
      expect(speakerBtn.getAttribute('aria-label')).toBe('Pronounce name');
    });

    it('should have aria-hidden on decorative icons', () => {
      const defaultIcon = document.querySelector('.speaker-icon-default');
      const playingIcon = document.querySelector('.speaker-icon-playing');
      
      expect(defaultIcon.getAttribute('aria-hidden')).toBe('true');
      expect(playingIcon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Form Controls', () => {
    it('should have aria-label on select elements', () => {
      const subraceSelect = document.getElementById('subrace');
      expect(subraceSelect.getAttribute('aria-label')).toBeTruthy();
      expect(subraceSelect.getAttribute('aria-label')).toBe('Select elven subrace');
    });
  });
<<<<<<< Updated upstream
=======

  describe('Filter Buttons', () => {
    beforeEach(() => {
      document.body.innerHTML += `
        <div class="favorites-filter" role="group" aria-label="Filter favorites by generator type">
          <button class="filter-btn active" data-filter="all" aria-label="Show all favorites" aria-pressed="true">All</button>
          <button class="filter-btn" data-filter="elven" aria-label="Show only Elven favorites" aria-pressed="false"><span aria-hidden="true">⚔️</span> Elven</button>
          <button class="filter-btn" data-filter="dwarven" aria-label="Show only Dwarven favorites" aria-pressed="false"><span aria-hidden="true">⚒️</span> Dwarven</button>
        </div>
      `;
    });

    it('should have role="group" on filter container', () => {
      const filterGroup = document.querySelector('.favorites-filter');
      expect(filterGroup.getAttribute('role')).toBe('group');
      expect(filterGroup.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have aria-pressed on filter buttons', () => {
      const allBtn = document.querySelector('[data-filter="all"]');
      const elvenBtn = document.querySelector('[data-filter="elven"]');
      
      expect(allBtn.getAttribute('aria-pressed')).toBe('true');
      expect(elvenBtn.getAttribute('aria-pressed')).toBe('false');
    });

    it('should have aria-label on filter buttons', () => {
      const buttons = document.querySelectorAll('.filter-btn');
      buttons.forEach(btn => {
        expect(btn.getAttribute('aria-label')).toBeTruthy();
      });
    });

    it('should have aria-hidden on decorative emoji icons', () => {
      const emojiSpans = document.querySelectorAll('.filter-btn span[aria-hidden]');
      emojiSpans.forEach(span => {
        expect(span.getAttribute('aria-hidden')).toBe('true');
      });
    });
  });

  describe('Accordions', () => {
    beforeEach(() => {
      document.body.innerHTML += `
        <div class="accordion">
          <button class="accordion-header" aria-expanded="false" aria-controls="test-content">
            <span class="accordion-title">Test Accordion</span>
            <span class="accordion-icon" aria-hidden="true">▼</span>
          </button>
          <div class="accordion-content" id="test-content">
            <p>Test content</p>
          </div>
        </div>
      `;
    });

    it('should have aria-controls linking to content', () => {
      const header = document.querySelector('.accordion-header');
      const content = document.getElementById('test-content');
      
      expect(header.getAttribute('aria-controls')).toBe('test-content');
      expect(content).toBeTruthy();
    });

    it('should have aria-hidden on decorative icons', () => {
      const icon = document.querySelector('.accordion-icon');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Tab Icons', () => {
    beforeEach(() => {
      document.body.innerHTML += `
        <button class="generator-tab" id="elvenTab" aria-label="Switch to Elven Name Generator">
          <span class="tab-icon" aria-hidden="true">⚔️</span>
          <span class="tab-label">ESPRUAR</span>
        </button>
        <a href="#" class="footer-tab" aria-label="Buy Me a Coffee - Opens in new window">
          <span class="tab-icon" aria-hidden="true">☕</span>
          <span class="tab-label">KAETH</span>
          <span class="external-link-icon" aria-hidden="true">⧉</span>
        </a>
      `;
    });

    it('should have aria-label on tab buttons', () => {
      const elvenTab = document.getElementById('elvenTab');
      expect(elvenTab.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have aria-hidden on tab icons', () => {
      const icons = document.querySelectorAll('.tab-icon');
      icons.forEach(icon => {
        expect(icon.getAttribute('aria-hidden')).toBe('true');
      });
    });

    it('should indicate external links in aria-label', () => {
      const footerTab = document.querySelector('.footer-tab');
      const label = footerTab.getAttribute('aria-label');
      expect(label).toContain('Opens in new window');
    });

    it('should have aria-hidden on external link icons', () => {
      const externalIcon = document.querySelector('.external-link-icon');
      expect(externalIcon.getAttribute('aria-hidden')).toBe('true');
    });
  });
>>>>>>> Stashed changes
});

