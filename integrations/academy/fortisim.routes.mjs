import { builtinDraftSpec, isSimulatorConfiguration } from "./simulator-contract.mjs"
import { LESSONS } from './lesson-manifest.mjs'

// Public metadata only; this fixed operator-configured URL never receives credentials.
async function loadAcademyCatalog(catalogUrl) {
  const registry = Object.fromEntries(Object.entries(LESSONS).map(([vendor, ids]) => [vendor, [...ids]]))
  if (!catalogUrl) return { registry, modules: [] }
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
  return { registry, modules: data.modules }
}

export async function loadLessonRegistry(catalogUrl) { return (await loadAcademyCatalog(catalogUrl)).registry }

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
    try { const catalog = await loadAcademyCatalog(catalogUrl); res.locals.lessons = catalog.registry; res.locals.catalog = catalog.modules; next() }
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
  // FLAMES validates group ownership before proxying this admin-only request.
  // Identity and completion stay in Academy; no account/progress copy is stored in FLAMES.
  router.post('/classroom/progress', async (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Academy administrator access required' })
    const ids = req.body?.userIds
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 500 || ids.some(id => typeof id !== 'string' || !/^[1-9][0-9]{0,9}$/.test(id))) return res.status(400).json({ message: 'Invalid student IDs' })
    try {
      const unique = [...new Set(ids)]
      const [rows] = await pool.query(`SELECT user_id,platform,task_id FROM fortisim_progress WHERE user_id IN (${unique.map(() => '?').join(',')})`, unique)
      const progress = Object.fromEntries(unique.map(id => [id, { fortigate: [], paloalto: [] }]))
      for (const row of rows) if (progress[String(row.user_id)] && res.locals.lessons[row.platform]?.includes(row.task_id)) progress[String(row.user_id)][row.platform].push(row.task_id)
      res.json({ progress, provenance: 'Academy-owned student-reported practice progress' })
    } catch (error) { next(error) }
  })
  function draftSpec(platform, taskId, modules) {
    const builtin = builtinDraftSpec(platform, taskId)
    if (builtin) return builtin
    if (platform !== 'fortigate') return null
    const lesson = modules.filter(module => module.vendor === platform).flatMap(module => module.lessons).find(lesson => lesson.id === taskId && lesson.kind === 'policy' && typeof lesson.scenarioVersion === 'string')
    return lesson ? { kind: 'policy', scenarioVersion: lesson.scenarioVersion } : null
  }
  async function readDraft(userId, platform, taskId) {
    const [rows] = await pool.query('SELECT * FROM fortisim_simulator_drafts WHERE user_id=? AND platform=? AND task_id=?', [userId, platform, taskId])
    const row = rows[0]
    return row && Number(row.revision) > 0 ? { schemaVersion: Number(row.schema_version), scenarioVersion: row.scenario_version, revision: Number(row.revision), updatedAt: Number(row.updated_at), config: typeof row.config_json === 'string' ? JSON.parse(row.config_json) : row.config_json } : null
  }
  router.route('/drafts/:platform/:taskId').all((req, res, next) => {
    const spec = draftSpec(req.params.platform, req.params.taskId, res.locals.catalog)
    if (!spec) return res.status(404).json({ message: 'This lesson does not support simulator drafts' })
    res.locals.draftSpec = spec; next()
  }).get(async (req, res, next) => {
    try { res.json({ draft: await readDraft(req.user.id, req.params.platform, req.params.taskId) }) } catch (error) { next(error) }
  }).post(async (req, res, next) => {
    const data = req.body
    const spec = res.locals.draftSpec
    if (data?.ownerId !== String(req.user.id)) return res.status(403).json({ message: 'Account changed; reload before saving' })
    if (data.schemaVersion !== 1 || !Number.isSafeInteger(data.revision) || data.revision < 0 || data.kind !== spec.kind || data.scenarioVersion !== spec.scenarioVersion || data.config !== null && !isSimulatorConfiguration(spec.kind, data.config)) return res.status(400).json({ message: 'Invalid simulator draft or exercise version' })
    try {
      const key = [req.user.id, req.params.platform, req.params.taskId]
      await pool.query('INSERT IGNORE INTO fortisim_simulator_drafts (user_id,platform,task_id,schema_version,scenario_version,revision,config_json,updated_at) VALUES (?,?,?,1,?,0,NULL,?)', [...key, spec.scenarioVersion, Date.now()])
      const [result] = await pool.query('UPDATE fortisim_simulator_drafts SET revision=revision+1,schema_version=1,scenario_version=?,config_json=?,updated_at=? WHERE user_id=? AND platform=? AND task_id=? AND revision=?', [spec.scenarioVersion, data.config === null ? null : JSON.stringify(data.config), Date.now(), ...key, data.revision])
      if (Number(result.affectedRows) !== 1) return res.status(409).json({ message: 'Another device saved this draft. Reload the saved version.' })
      res.json({ draft: await readDraft(req.user.id, req.params.platform, req.params.taskId) })
    } catch (error) { next(error) }
  })
  return router
}
