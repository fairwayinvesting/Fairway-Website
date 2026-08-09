import crypto from 'crypto';

const ALLOWED_EXTS = new Set(['.mp4','.mov','.avi','.mkv','.wmv','.webm','.m4v','.mts','.mxf','.hevc','.mp2']);
const MIME = {
  '.mp4':'video/mp4','.mov':'video/quicktime','.avi':'video/x-msvideo',
  '.mkv':'video/x-matroska','.wmv':'video/x-ms-wmv','.webm':'video/webm',
  '.m4v':'video/x-m4v','.mts':'video/mp2t','.mxf':'application/mxf',
  '.hevc':'video/hevc','.mp2':'video/mpeg',
};

export function validateVideoFilename(filename) {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) return null;
  return { ext, contentType: MIME[ext] || 'video/mp4' };
}

export function r2Configured() {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID &&
            process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);
}

function enc(s) {
  return encodeURIComponent(String(s)).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}
function hmac(key, data, out) { return crypto.createHmac('sha256', key).update(data).digest(out); }
function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }

function sigKey(secret, date) {
  return hmac(hmac(hmac(hmac('AWS4' + secret, date), 'auto'), 's3'), 'aws4_request');
}

function amzNow() {
  return new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ''); // "20230101T120000Z"
}

function buildPresignedUrl(method, key, signedHeaders, canonicalHeaders, extraParams, expiresIn) {
  const host = `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const bucket = process.env.R2_BUCKET_NAME;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY;

  const amzDate = amzNow();
  const dateStamp = amzDate.slice(0, 8);
  const credScope = `${dateStamp}/auto/s3/aws4_request`;
  const credential = `${accessKeyId}/${credScope}`;

  const params = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresIn)],
    ['X-Amz-SignedHeaders', signedHeaders],
    ...extraParams,
  ].sort(([a], [b]) => a.localeCompare(b));

  const canonicalQS = params.map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&');
  const canonicalUri = '/' + [bucket, ...key.split('/')].map(enc).join('/');
  const canonicalReq = [method, canonicalUri, canonicalQS, canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n');
  const sts = ['AWS4-HMAC-SHA256', amzDate, credScope, sha256(canonicalReq)].join('\n');
  const sig = hmac(sigKey(secretKey, dateStamp), sts, 'hex');

  const allParams = [...params, ['X-Amz-Signature', sig]];
  const qs = allParams.map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&');

  return `https://${host}/${bucket}/${key}?${qs}`;
}

export function presignPut(key, contentType, expiresIn = 1800) {
  const host = `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const signedHeaders = 'content-type;host';
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const url = buildPresignedUrl('PUT', key, signedHeaders, canonicalHeaders, [], expiresIn);
  return { url, contentType };
}

export function presignGet(key, filename, expiresIn = 3600) {
  const host = `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const signedHeaders = 'host';
  const canonicalHeaders = `host:${host}\n`;
  const disp = filename ? `attachment; filename="${filename.replace(/"/g, '')}"` : 'attachment';
  return buildPresignedUrl('GET', key, signedHeaders, canonicalHeaders, [['response-content-disposition', disp]], expiresIn);
}

export function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
