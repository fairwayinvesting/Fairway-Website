import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { checkAdmin, getAdminActor } from './_admin-auth.js';
import { getStaffPayload } from './_staff-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function getActor(req) {
  if (await checkAdmin(req)) {
    const a = await getAdminActor(req);
    return { role: 'admin', userId: 'admin', name: a === 'secondary' ? 'Admin (secondary)' : 'Luke' };
  }
  const staff = await getStaffPayload(req);
  if (staff) {
    const staffStore = getStore({ name: 'fairway-staff', consistency: 'strong' });
    const staffAll = (await staffStore.get('all', { type: 'json' }).catch(() => null)) || [];
    const user = staffAll.find(u => u.id === staff.userId && !u.deletedAt && u.active);
    if (!user) return null;
    return {
      role: 'contractor',
      userId: staff.userId,
      name: staff.name,
      hiddenContacts: new Set(user.directoryAccess?.hiddenContacts || []),
    };
  }
  return null;
}

export default async (req) => {
  const actor = await getActor(req);
  if (!actor) return json({ error: 'Unauthorized' }, 401);

  const dirStore = getStore({ name: 'fairway-referral-partners', consistency: 'strong' });
  const mediaStore = getStore('fairway-dir-files');

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { contactId, dataUrl, fileName, mimeType = 'application/octet-stream' } = body;
    if (!contactId || !dataUrl || !fileName) return json({ error: 'contactId, dataUrl, fileName required' }, 400);

    const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
    if (base64.length > 15_000_000) return json({ error: 'File too large (max 15 MB)' }, 413);
    const buffer = Buffer.from(base64, 'base64');
    const mediaKey = crypto.randomBytes(16).toString('hex');
    await mediaStore.set(mediaKey, buffer, { metadata: { mimeType } });

    const all = (await dirStore.get('all', { type: 'json' }).catch(() => null)) || [];
    const idx = all.findIndex(c => c.id === contactId);
    if (idx === -1) return json({ error: 'Contact not found' }, 404);

    if (actor.role !== 'admin' && actor.hiddenContacts?.has(contactId)) {
      return json({ error: 'Access denied' }, 403);
    }

    const fileRecord = {
      id: crypto.randomUUID(),
      name: fileName.trim(),
      mimeType,
      sizeBytes: buffer.byteLength,
      mediaKey,
      uploadedBy: actor.name,
      uploadedById: actor.userId,
      uploadedByRole: actor.role,
      uploadedAt: new Date().toISOString(),
    };

    if (!Array.isArray(all[idx].files)) all[idx].files = [];
    all[idx].files.push(fileRecord);
    all[idx].updatedAt = new Date().toISOString();
    await dirStore.setJSON('all', all);

    return json({ ok: true, file: fileRecord });
  }

  if (req.method === 'DELETE') {
    const { contactId, fileId } = await req.json().catch(() => ({}));
    if (!contactId || !fileId) return json({ error: 'contactId and fileId required' }, 400);

    const all = (await dirStore.get('all', { type: 'json' }).catch(() => null)) || [];
    const idx = all.findIndex(c => c.id === contactId);
    if (idx === -1) return json({ error: 'Contact not found' }, 404);

    if (actor.role !== 'admin' && actor.hiddenContacts?.has(contactId)) {
      return json({ error: 'Access denied' }, 403);
    }

    const files = all[idx].files || [];
    const fileIdx = files.findIndex(f => f.id === fileId);
    if (fileIdx === -1) return json({ error: 'File not found' }, 404);

    const file = files[fileIdx];
    // Contractor can only delete their own files; admin can delete any
    if (actor.role !== 'admin' && file.uploadedById !== actor.userId) {
      return json({ error: 'You can only delete files you uploaded.' }, 403);
    }

    await mediaStore.delete(file.mediaKey).catch(() => {});
    all[idx].files = files.filter(f => f.id !== fileId);
    all[idx].updatedAt = new Date().toISOString();
    await dirStore.setJSON('all', all);

    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/dir-file', method: ['POST', 'DELETE'] };
