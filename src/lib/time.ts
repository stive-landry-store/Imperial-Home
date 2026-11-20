// Small time helpers kept outside components so renders stay pure.
export const now = () => Date.now()
export const isoMinutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()
export const randomId = () => Math.random().toString(36).slice(2)
