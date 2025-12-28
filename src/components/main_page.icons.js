const sourceIcons = import.meta.glob('../img/sources/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

export function getSourceIcon(sourceId) {
  return sourceIcons[`../img/sources/${sourceId}.png`] || '';
}
