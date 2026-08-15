/** Cover images for module selection (in /public/modules). */
const COVER_VERSION = 'v20';

export const moduleCovers: Record<string, string> = {
  'section-1': '/modules/section-1.jpg',
  'section-2': '/modules/section-2.jpg',
  'section-3': '/modules/section-3.jpg',
  'section-4': '/modules/section-4.jpg',
  'section-5': '/modules/section-5.jpg',
  'section-6': '/modules/section-6.jpg',
  'section-7': '/modules/section-7.jpg',
  'section-8': '/modules/section-8.jpg',
  'section-9': '/modules/section-9.jpg',
  'section-10': '/modules/section-10.jpg',
  'section-11': '/modules/section-11.jpg',
  'section-12': '/modules/section-12.jpg',
  'section-13': '/modules/section-13.jpg',
  'section-14': '/modules/section-14.jpg',
  'section-15': '/modules/section-15.jpg',
};

/** Crop so the still reads as a 48px identity tile, not a poster. */
export const moduleCoverPos: Record<string, string> = {
  'section-1': 'center 32%',
  'section-2': 'center 40%',
  'section-3': 'center 28%',
  'section-4': 'center 35%',
  'section-5': 'center 30%',
  'section-6': 'center 38%',
  'section-7': 'center 42%',
  'section-8': 'center 36%',
  'section-9': 'center 34%',
  'section-10': 'center 30%',
  'section-11': 'center 40%',
  'section-12': 'center 36%',
  'section-13': 'center 32%',
  'section-14': 'center 38%',
  'section-15': 'center 28%',
};

export const MODULE_BINS: { id: string; label: string; sectionIds: string[] }[] = [
  { id: 'foundation', label: 'Foundation', sectionIds: ['section-1', 'section-2', 'section-3'] },
  { id: 'survey', label: 'Survey & placement', sectionIds: ['section-4', 'section-5', 'section-10'] },
  { id: 'hole', label: 'Hole & sensors', sectionIds: ['section-6', 'section-7', 'section-11'] },
  { id: 'field', label: 'Field craft', sectionIds: ['section-8', 'section-9', 'section-13', 'section-14'] },
  { id: 'interp', label: 'Interpretation', sectionIds: ['section-12'] },
  { id: 'assess', label: 'Assessment', sectionIds: ['section-15'] },
];

export function getModuleCover(sectionId: string): string {
  const path = moduleCovers[sectionId] || '/modules/section-1.jpg';
  return `${path}?${COVER_VERSION}`;
}

export function getModuleCoverPos(sectionId: string): string {
  return moduleCoverPos[sectionId] || 'center center';
}
