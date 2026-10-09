export const isArchetype=s=>s.name.startsWith('АРХЕТИП ');
export const mainCatalog=list=>list.filter(s=>!isArchetype(s));
