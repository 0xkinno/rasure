// Deep links into the Arkiv Data Explorer. It prefills the query box from ?q= (press Execute there).
// The point: an independent Arkiv tool shows the same attributes and ciphertext, not our renderer.
export const DATA_EXPLORER = "https://data.arkiv.network";
export const dataExplorerQuery = (predicate: string) => `${DATA_EXPLORER}/?chain=tiramisu&q=${encodeURIComponent(predicate)}`;
export const dataExplorerKey = (entityKey: string) => dataExplorerQuery(`$key = key(${entityKey})`);
