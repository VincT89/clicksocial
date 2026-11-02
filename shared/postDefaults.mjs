export const DEFAULT_MODE = 'graphic';
export const POST_TONES = { amichevole: 'Amichevole', professionale: 'Professionale', ispirazionale: 'Ispirazionale', divertente: 'Divertente', elegante: 'Elegante' };

export function defaultTone(profile) {
  const tone = String(profile?.tone_of_voice || '').toLocaleLowerCase('it').trim();
  return tone === 'ironico' ? 'divertente' : Object.hasOwn(POST_TONES, tone) ? tone : 'amichevole';
}
