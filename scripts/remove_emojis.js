const fs = require('fs')
const path = require('path')

const root = process.cwd()
const excludeDirs = new Set(['.git','node_modules','.next','dist','build','out'])
const exts = new Set(['.ts','.tsx','.js','.jsx','.md','.mdx','.txt','.json','.html','.css','.scss','.svg','.yml','.yaml'])
const backupRoot = path.join(root,'.emoji-backups')

if (!fs.existsSync(backupRoot)) fs.mkdirSync(backupRoot, { recursive: true })

const emojiRegex = /[\p{Extended_Pictographic}\uFE0F\u200D\u2600-\u26FF\u2700-\u27BF]/gu

let changed = []

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (excludeDirs.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else {
      const ext = path.extname(entry.name).toLowerCase()
      if (!exts.has(ext)) continue
      try {
        let content = fs.readFileSync(full, 'utf8')
        if (emojiRegex.test(content)) {
          // backup
          const rel = path.relative(root, full)
          const backupPath = path.join(backupRoot, rel)
          const backupDir = path.dirname(backupPath)
          fs.mkdirSync(backupDir, { recursive: true })
          fs.writeFileSync(backupPath, content)

          // replace
          const newContent = content.replace(emojiRegex, '')
          fs.writeFileSync(full, newContent, 'utf8')
          changed.push(rel)
          console.log('Stripped emojis from', rel)
        }
      } catch (err) {
        console.error('Failed to process', full, err.message)
      }
    }
  }
}

console.log('Starting emoji removal...')
walk(root)
console.log('Done. Files changed:', changed.length)
if (changed.length) console.log('Backups stored in .emoji-backups/')
process.exit(0)
