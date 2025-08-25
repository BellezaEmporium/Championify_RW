import * as R from 'ramda';
const modules = import.meta.glob('./*.js', { eager: true });

const source_names = [];
const sources = {};

Object.entries(modules).forEach(([filePath, mod]) => {
  // skip this index file
  if (filePath.endsWith('/index.js') || filePath.endsWith('\\index.js')) return;

  // sources export named `source_info` and functions; use that if present
  const source = mod.source_info ? mod : mod.default || mod;

  // Temp workaround to avoid broken tests
  if (!source.source_info) source.source_info = {};

  sources[source.source_info.id] = source;
  source_names.push(source.source_info);
});

export default sources;
export const sources_info = R.sortBy(R.prop('name'), source_names);
