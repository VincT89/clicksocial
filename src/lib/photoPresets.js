export const DEFAULT_FILTERS = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  warmth: 0,
  blur: 0,
  vignette: 0,
};

export const PRESETS = [
  { name: "Originale", f: { ...DEFAULT_FILTERS } },
  { name: "Vivace", f: { brightness: 105, contrast: 112, saturate: 145, warmth: 8, blur: 0, vignette: 0 } },
  { name: "Caldo", f: { brightness: 104, contrast: 104, saturate: 118, warmth: 38, blur: 0, vignette: 12 } },
  { name: "Freddo", f: { brightness: 102, contrast: 110, saturate: 108, warmth: -28, blur: 0, vignette: 0 } },
  { name: "BN", f: { brightness: 102, contrast: 112, saturate: 0, warmth: 0, blur: 0, vignette: 0 } },
  { name: "Vintage", f: { brightness: 106, contrast: 92, saturate: 80, warmth: 30, blur: 0, vignette: 28 } },
  { name: "Drammatico", f: { brightness: 96, contrast: 140, saturate: 120, warmth: 0, blur: 0, vignette: 35 } },
  { name: "Soft", f: { brightness: 108, contrast: 94, saturate: 96, warmth: 12, blur: 0, vignette: 0 } },
];

