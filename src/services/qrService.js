import { addDoc, collection, doc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export const QR_TTL_SECONDS = 90;

// Created by leader tablets only. Firestore Rules enforce that:
//   - request.auth.token.role == 'lider_movil'
//   - request.resource.data.leaderUid == request.auth.uid
//   - request.resource.data.mobileId == request.auth.token.mobileId
//   - status == 'active', purpose == 'shift_check_in'
//   - createdAt == request.time, expiresAt is bounded.
export const generateQrToken = async ({ leaderUid, leaderName, mobileId }) => {
  if (!leaderUid || !mobileId) throw new Error('Datos del líder incompletos.');
  const expiresAt = Timestamp.fromMillis(Date.now() + QR_TTL_SECONDS * 1000);
  const ref = await addDoc(collection(db, 'qr_activos'), {
    mobileId,
    leaderUid,
    leaderName: leaderName || null,
    createdAt: serverTimestamp(),
    expiresAt,
    status: 'active',
    purpose: 'shift_check_in',
  });
  return { tokenId: ref.id, expiresAtMs: expiresAt.toMillis() };
};

export const fetchQrToken = async (tokenId) => {
  const snap = await getDoc(doc(db, 'qr_activos', tokenId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    expiresAtMs: data.expiresAt?.toMillis?.() ?? null,
    createdAtMs: data.createdAt?.toMillis?.() ?? null,
  };
};

export const buildQrUrl = (tokenId) => {
  const base = `${window.location.origin}/ingreso`;
  return `${base}?token=${encodeURIComponent(tokenId)}`;
};
