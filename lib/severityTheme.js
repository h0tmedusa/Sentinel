/**
 * Shared severity and accent color tokens.
 * All components should import from here instead of defining their own maps.
 */

export const SEVERITY_ORDER = { critical: 1, high: 2, medium: 3, low: 4 };

export const SEVERITY_COLORS = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low:      'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export const SEVERITY_BADGE = {
  critical: 'bg-red-600 text-white',
  high:     'bg-orange-600 text-white',
  medium:   'bg-amber-600 text-white',
  low:      'bg-blue-600 text-white',
};

export const SEVERITY_TEXT = {
  critical: 'text-red-400',
  high:     'text-orange-400',
  medium:   'text-yellow-400',
  low:      'text-blue-400',
};

export const ACCENT_COLORS = {
  emerald: {
    icon:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    active: 'bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-300',
  },
  red: {
    icon:   'text-red-400 bg-red-500/10 border-red-500/20',
    active: 'bg-red-500/10 border-l-2 border-red-500 text-red-300',
  },
  cyan: {
    icon:   'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    active: 'bg-cyan-500/10 border-l-2 border-cyan-500 text-cyan-300',
  },
  amber: {
    icon:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
    active: 'bg-amber-500/10 border-l-2 border-amber-500 text-amber-300',
  },
  slate: {
    icon:   'text-slate-400 bg-slate-500/10 border-slate-500/20',
    active: 'bg-slate-500/10 border-l-2 border-slate-500 text-slate-300',
  },
};
