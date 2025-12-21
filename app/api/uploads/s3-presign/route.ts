import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileName, contentType } = await req.json()
    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'Missing fileName or contentType' }, { status: 400 })
    }

    // Check if AWS S3 is configured
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    const bucket = process.env.AWS_S3_BUCKET
    const region = process.env.AWS_S3_REGION || 'us-east-1'

    if (!accessKeyId || !secretAccessKey || !bucket) {
      // S3 not configured - return 501 Not Implemented
      return NextResponse.json(
        { error: 'S3 not configured. Use POST /api/uploads for dev mode.' },
        { status: 501 }
      )
    }

    // Create S3 client
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    })

    // Generate safe key: `uploads/{userId}/{timestamp}-{randomId}/{fileName}`
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const key = `uploads/${session.user.id}/${timestamp}-${randomId}/${fileName}`

    // Create PUT command
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType
    })

    // Generate presigned URL (valid for 1 hour)
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return NextResponse.json({
      url,
      key,
      expires: new Date(Date.now() + 3600000).toISOString()
    })
  } catch (error) {
    console.error('S3 presign error:', error)
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 })
  }
}
