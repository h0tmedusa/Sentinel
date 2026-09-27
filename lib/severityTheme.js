/**
 * Shared severity and accent color tokens.
 * All components should import from here instead of defining their own maps.
 */

export const SEVERITY_ORDER = { critical: 1, high: 2, medium: 3, low: 4 };

export const SEVERITY_COLORS = {
  critical: 'bg-severity-critical/15 text-severity-critical border-severity-critical/30',
  high:     'bg-severity-high/15 text-severity-high border-severity-high/30',
  medium:   'bg-severity-medium/15 text-severity-medium border-severity-medium/30',
  low:      'bg-severity-low/15 text-severity-low border-severity-low/30',
};

export const SEVERITY_BADGE = {
  critical: 'bg-severity-critical text-white',
  high:     'bg-severity-high text-white',
  medium:   'bg-severity-medium text-white',
  low:      'bg-severity-low text-white',
};

export const SEVERITY_TEXT = {
  critical: 'text-severity-critical',
  high:     'text-severity-high',
  medium:   'text-severity-medium',
  low:      'text-severity-low',
};

export const NAV_ITEM_STATE = {
  active: 'bg-accent-muted text-ink border-l-2 border-accent',
  inactive: 'text-ink-muted hover:text-ink hover:bg-canvas-raised',
};

export const ACCENT_COLORS = {
  emerald: { icon: 'text-accent bg-accent-muted border-accent/20', active: NAV_ITEM_STATE.active },
  red:     { icon: 'text-severity-critical bg-severity-critical/10 border-severity-critical/20', active: NAV_ITEM_STATE.active },
  cyan:    { icon: 'text-accent bg-accent-muted border-accent/20', active: NAV_ITEM_STATE.active },
  amber:   { icon: 'text-severity-medium bg-severity-medium/10 border-severity-medium/20', active: NAV_ITEM_STATE.active },
  slate:   { icon: 'text-ink-muted bg-canvas-raised border-border', active: NAV_ITEM_STATE.active },
};
