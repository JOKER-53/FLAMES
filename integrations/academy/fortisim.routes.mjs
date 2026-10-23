import { LESSONS } from './lesson-manifest.mjs'

// Public metadata only; this fixed operator-configured URL never receives credentials.
export async function loadLessonRegistry(catalogUrl) {
  const registry = Object.fromEntries(Object.entries(LESSONS).map(([vendor, ids]) => [vendor, [...ids]]))
  if (!catalogUrl) return registry
  const url = new URL(catalogUrl)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid FLAMES catalog URL')
  const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'error' })
  if (!response.ok) throw new Error('FLAMES catalog unavailable')
  const data = await response.json()
  if (!Array.isArray(data.modules) || data.modules.length > 100) throw new Error('Invalid FLAMES catalog')
  for (const module of data.modules) {
    if (!module || !Object.hasOwn(registry, module.vendor) || !Array.isArray(module.lessons) || module.lessons.length > 30) throw new Error('Invalid FLAMES module')
    for (const lesson of module.lessons) {
      if (!lesson || !/^custom-[a-f0-9-]{36}$/.test(lesson.id)) throw new Error('Invalid FLAMES lesson')
      if (!registry[module.vendor].includes(lesson.id)) registry[module.vendor].push(lesson.id)
    }
  }
  return registry
}

// Dependency injection keeps this adapter compatible with Academy's existing
// Express router, JWT middleware, and mysql2 pool; it needs no new dependencies.
export function createFortisimRouter({ Router, authenticate, pool, catalogUrl = process.env.FLAMES_CATALOG_URL }) {
  const router = Router()
  router.use(authenticate)
  router.use((req, res, next) => {
    if (!Number.isSafeInteger(Number(req.user?.id)) || Number(req.user.id) <= 0) {
      return res.status(401).json({ message: 'Invalid Academy identity' })
    }
    next()
  })
  router.use(async (_req, res, next) => {
    try { res.locals.lessons = await loadLessonRegistry(catalogUrl); next() }
    catch { res.status(503).json({ message: 'FLAMES lesson library unavailable. Try again later.' }) }
  })
  async function read(userId, platform, registry) {
    const [rows] = await pool.query('SELECT task_id FROM fortisim_progress WHERE user_id = ? AND platform = ? ORDER BY task_id', [userId, platform])
    return rows.map(row => row.task_id).filter(id => registry[platform].includes(id))
  }
  router.get('/summary', async (req, res, next) => {
    try {
      const registry = res.locals.lessons
      const courses = await Promise.all(Object.keys(registry).map(async platform => {
        const completed = await read(req.user.id, platform, registry)
        return { platform, completed, total: registry[platform].length }
      }))
      res.json({ courses, provenance: 'Student-reported practice completion' })
    } catch (error) { next(error) }
  })
  router.route('/progress/:platform').all((req, res, next) => {
    if (!Object.hasOwn(LESSONS, req.params.platform)) return res.status(400).json({ message: 'Unknown platform' })
    next()
  }).get(async (req, res, next) => {
    try { res.json({ completed: await read(req.user.id, req.params.platform, res.locals.lessons) }) }
    catch (error) { next(error) }
  }).post(async (req, res, next) => {
    const platform = req.params.platform
    const registry = res.locals.lessons
    const ids = req.body?.completed
    if (!Array.isArray(ids) || ids.length > 5000 || ids.some(id => typeof id !== 'string' || !registry[platform].includes(id))) {
      return res.status(400).json({ message: 'Invalid completion list' })
    }
    try {
      const unique = [...new Set(ids)]
      if (unique.length) {
        const placeholders = unique.map(() => '(?, ?, ?)').join(', ')
        await pool.query(`INSERT INTO fortisim_progress (user_id, platform, task_id) VALUES ${placeholders} ON DUPLICATE KEY UPDATE task_id = VALUES(task_id)`, unique.flatMap(id => [req.user.id, platform, id]))
      }
      res.json({ completed: await read(req.user.id, platform, registry) })
    } catch (error) { next(error) }
  })
  return router
}
