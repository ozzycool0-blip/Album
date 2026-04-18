// app/api/r2/upload-url/route.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextResponse } from 'next/server'

type UploadUrlRequestBody = {
  tenantId: string
  userId: string
  selectionId: string
  fileExt: string
  contentType: string
}

export async function POST(req: Request) {
  try {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
    const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicBaseUrl) {
      return NextResponse.json(
        { error: 'Faltan variables de entorno de Cloudflare R2 en el servidor' },
        { status: 500 }
      )
    }

    const body = (await req.json()) as Partial<UploadUrlRequestBody>

    const tenantId = body.tenantId?.trim()
    const userId = body.userId?.trim()
    const selectionId = body.selectionId?.trim()
    const fileExt = body.fileExt?.trim()
    const contentType = body.contentType?.trim()

    if (!tenantId || !userId || !selectionId || !fileExt || !contentType) {
      return NextResponse.json(
        {
          error: 'Faltan datos para generar la URL firmada',
          debug: {
            tenantId: !!tenantId,
            userId: !!userId,
            selectionId: !!selectionId,
            fileExt: !!fileExt,
            contentType: !!contentType,
          },
        },
        { status: 400 }
      )
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    const safeExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const key = `${tenantId}/${userId}/${selectionId}/foto-${Date.now()}.${safeExt}`

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
    const publicUrl = `${publicBaseUrl}/${key}`

    return NextResponse.json({ uploadUrl, publicUrl })
  } catch (error) {
    console.error('Error generando URL firmada R2:', error)

    return NextResponse.json(
      { error: 'Error generando URL firmada' },
      { status: 500 }
    )
  }
}