const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary from environment
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

/**
 * Validates the file buffer header against known image magic bytes.
 * Blocks malicious disguised scripts or executables.
 */
function validateMagicBytes(buffer) {
  if (!buffer || buffer.length < 8) return false;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  // GIF: GIF87a or GIF89a
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'gif';
  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return 'webp';

  return null;
}

/**
 * Generates an ultra-compact Low-Quality Image Placeholder (LQIP) Base64 data URI (~80 bytes).
 */
async function generateLQIP(buffer) {
  try {
    const lqipBuffer = await sharp(buffer)
      .resize(16, 16, { fit: 'cover' })
      .webp({ quality: 20 })
      .toBuffer();
    return `data:image/webp;base64,${lqipBuffer.toString('base64')}`;
  } catch (err) {
    console.warn('[imageProcessor] LQIP generation warning:', err.message);
    return null;
  }
}

/**
 * Full Pipeline:
 * 1. Validate magic bytes.
 * 2. Generate micro-LQIP.
 * 3. Process high-res WebP with Sharp.
 * 4. Stream to Cloudinary (with fallback to local storage).
 */
async function processAndUploadLogo(buffer, deptId, oldLogoUrl = null) {
  const fileType = validateMagicBytes(buffer);
  if (!fileType) {
    throw new Error('Invalid image file format. Supported: PNG, JPEG, WEBP, GIF.');
  }

  // Parallelize LQIP and webp optimization
  const [lqip, optimizedBuffer] = await Promise.all([
    generateLQIP(buffer),
    sharp(buffer)
      .resize(300, 300, { fit: 'cover', position: 'center' })
      .webp({ quality: 90 })
      .toBuffer()
  ]);

  let logoUrl = null;

  // Attempt Cloudinary Upload if configured
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
    try {
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'department_logos',
            public_id: `dept_${deptId.toLowerCase()}_${Date.now()}`,
            format: 'webp',
            transformation: [
              { width: 240, height: 240, crop: 'fill', gravity: 'center' },
              { fetch_format: 'auto', quality: 'auto:good' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(optimizedBuffer);
      });

      logoUrl = uploadResult.secure_url;

      // Clean up previous Cloudinary logo if applicable
      if (oldLogoUrl && oldLogoUrl.includes('cloudinary.com')) {
        const match = oldLogoUrl.match(/department_logos\/([^/?.]+)/);
        if (match) {
          cloudinary.uploader.destroy(`department_logos/${match[1]}`).catch(() => {});
        }
      }
    } catch (cErr) {
      console.warn('[imageProcessor] Cloudinary upload failed, falling back to local storage:', cErr.message);
    }
  }

  // Fallback to local static storage if Cloudinary upload didn't produce a URL
  if (!logoUrl) {
    const uploadDir = path.join(__dirname, '../public/uploads/logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filename = `dept_${deptId.toLowerCase()}_${Date.now()}.webp`;
    const localFilePath = path.join(uploadDir, filename);
    await fs.promises.writeFile(localFilePath, optimizedBuffer);
    logoUrl = `/uploads/logos/${filename}`;
  }

  return {
    logo_url: logoUrl,
    logo_lqip: lqip
  };
}

module.exports = {
  validateMagicBytes,
  generateLQIP,
  processAndUploadLogo
};

