const MAX_IDS = 200
export function addNotifiedId(ids: string[], id: string) { return ids.includes(id) ? ids : [...ids, id].slice(-MAX_IDS) }
export function shouldNotify(ids: string[], id: string, source: string) { return source === 'backend-authoritative' && !ids.includes(id) }
