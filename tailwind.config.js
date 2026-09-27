export default {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#0B0D10',   // page background, replaces bg-slate-950
          raised: '#111318',    // one level up — sparingly used surface (replaces most bg-slate-900)
          overlay: '#16181E',   // modal/dropdown surfaces
        },
        border: {
          DEFAULT: '#22252B',   // replaces border-slate-800 everywhere
          subtle: '#1A1C21',
        },
        ink: {
          DEFAULT: '#E7E8EA',   // primary text, replaces text-slate-100
          muted: '#9A9DA6',     // secondary text, replaces text-slate-400/500
          faint: '#5D6069',     // tertiary/disabled text
        },
        accent: {
          DEFAULT: '#3E7BFA',   // the ONE restrained accent color, replaces emerald-everywhere
          hover: '#5A8FFB',
          muted: '#1C2A47',     // low-opacity accent surface, replaces bg-emerald-500/10 style patterns
        },
        severity: {
          critical: '#D33B3B',
          high: '#D97A3D',
          medium: '#C9A227',
          low: '#5D8FCB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        xs:   ['0.75rem',  { lineHeight: '1.1rem' }],
        sm:   ['0.8125rem',{ lineHeight: '1.3rem' }],
        base: ['0.9375rem',{ lineHeight: '1.5rem' }],
        lg:   ['1.125rem', { lineHeight: '1.6rem' }],
        xl:   ['1.375rem', { lineHeight: '1.8rem' }],
        '2xl':['1.75rem',  { lineHeight: '2.1rem' }],
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '6px',
        lg: '8px',
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(0,0,0,0.3)',
        raised: '0 2px 8px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};
