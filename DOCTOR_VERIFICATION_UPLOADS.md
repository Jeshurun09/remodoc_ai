# Doctor Verification — File Upload Guidance

This project provides a simple developer-friendly upload endpoint (`POST /api/uploads`) which accepts JSON `{ fileName, contentBase64 }` and stores files under `public/uploads/` in development. For production you should use a secure, signed upload flow (S3, Cloudinary, Google Cloud Storage) instead of sending binary data through your app server.

Recommended production approach (S3 presigned URLs):

1. Backend endpoint `POST /api/uploads/s3-presign` returns a presigned PUT URL for the client.
2. Client uploads file directly to S3 using the presigned URL.
3. Client sends the resulting public URL (or object key) in the verification request to `/api/doctor/verification`.

Security considerations:
- Validate MIME types and file size on upload.
- Scan uploaded files for malware using a scanning service (ClamAV / third-party).
- Store files in a private bucket and serve through signed URLs when necessary.
- Don't accept raw base64 in production — prefer presigned uploads to avoid overloading the app server.

Dev fallback:
- `POST /api/uploads` accepts `fileName` and `contentBase64` and stores file in `public/uploads/`.
- This is useful for local testing only.

Example client flow using presigned URLs:

1. Client requests a presigned URL:

```http
POST /api/uploads/s3-presign
Content-Type: application/json

{ "fileName": "license.pdf", "contentType": "application/pdf" }
```

2. Server returns `{ "url": "https://s3...", "key": "private/.." }`.
3. Client does `PUT` to the returned `url` with file body and `Content-Type` header.
4. Client sends `{ "licenseUrl": "https://cdn.example.com/private/..." }` to `/api/doctor/verification`.

If you want, I can implement a presigned S3 flow next (requires S3 credentials).