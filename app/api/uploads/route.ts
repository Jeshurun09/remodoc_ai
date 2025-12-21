import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fileName, contentBase64 } = body

    if (!fileName || !contentBase64) {
      return NextResponse.json({ error: 'Missing fileName or contentBase64' }, { status: 400 })
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
    const filePath = path.join(uploadsDir, safeName)

    const buffer = Buffer.from(contentBase64, 'base64')
    fs.writeFileSync(filePath, buffer)

    const url = `/uploads/${safeName}`
    return NextResponse.json({ url }, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
