async function run() {
  console.log('Running payout tests (integration-light)')
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  try {
    // Use createRequire to load the TS module under ts-node
    const { createRequire } = await import('module')
    const require = createRequire(import.meta.url)
    const mod = require('../calc_payouts')
    const created = await mod.calculatePayoutsForPeriod(start, end)
    console.log('calculatePayoutsForPeriod returned:', created)
    console.log('Test finished')
  } catch (err) {
    console.error('Test failed:', err)
    process.exit(1)
  }
}

run()
