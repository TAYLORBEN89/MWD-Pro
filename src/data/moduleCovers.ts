/** Cover images for module selection cards (in /public/modules). */
const COVER_VERSION = 'v16'; // bump when replacing assets to bust CDN/browser cache

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

export function getModuleCover(sectionId: string): string {
  const path = moduleCovers[sectionId] || '/modules/section-1.jpg';
  return `${path}?${COVER_VERSION}`;
}
