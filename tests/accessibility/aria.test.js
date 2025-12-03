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
      expect(settingsToggle).toHaveAttribute('aria-expanded');
      expect(settingsToggle.getAttribute('aria-expanded')).toBe('false');
    });

    it('should have aria-controls linking to content', () => {
      const settingsToggle = document.getElementById('settingsToggle');
      const settingsContent = document.getElementById('settingsContent');
      
      expect(settingsToggle).toHaveAttribute('aria-controls');
      expect(settingsToggle.getAttribute('aria-controls')).toBe('settingsContent');
      expect(settingsContent).toBeTruthy();
    });

    it('should have hidden attribute on content when collapsed', () => {
      const settingsContent = document.getElementById('settingsContent');
      expect(settingsContent).toHaveAttribute('hidden');
    });
  });

  describe('Breakdown Accordion', () => {
    it('should have aria-expanded attribute on toggle button', () => {
      const breakdownToggle = document.getElementById('breakdownToggle');
      expect(breakdownToggle).toHaveAttribute('aria-expanded');
      expect(breakdownToggle.getAttribute('aria-expanded')).toBe('false');
    });

    it('should have aria-controls linking to content', () => {
      const breakdownToggle = document.getElementById('breakdownToggle');
      const breakdownContent = document.getElementById('breakdownContent');
      
      expect(breakdownToggle).toHaveAttribute('aria-controls');
      expect(breakdownToggle.getAttribute('aria-controls')).toBe('breakdownContent');
      expect(breakdownContent).toBeTruthy();
    });

    it('should have hidden attribute on content when collapsed', () => {
      const breakdownContent = document.getElementById('breakdownContent');
      expect(breakdownContent).toHaveAttribute('hidden');
    });
  });

  describe('Speaker Button', () => {
    it('should have aria-label for screen readers', () => {
      const speakerBtn = document.getElementById('speakerBtn');
      expect(speakerBtn).toHaveAttribute('aria-label');
      expect(speakerBtn.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have aria-hidden on decorative icons', () => {
      const defaultIcon = document.querySelector('.speaker-icon-default');
      const playingIcon = document.querySelector('.speaker-icon-playing');
      
      expect(defaultIcon).toHaveAttribute('aria-hidden', 'true');
      expect(playingIcon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Form Controls', () => {
    it('should have aria-label on select elements', () => {
      const subraceSelect = document.getElementById('subrace');
      expect(subraceSelect).toHaveAttribute('aria-label');
      expect(subraceSelect.getAttribute('aria-label')).toBeTruthy();
    });
  });
});

