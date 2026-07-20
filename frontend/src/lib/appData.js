/**
 * Data access layer: Supabase Postgres (vaults, entries, comments, notifications).
 * FastAPI backend handles media (audio AI, image gen, PDF) and invite emails.
 */
import * as sb from "@/lib/supabaseData";
import { uploadEntryImage } from "@/lib/supabaseStorage";
import { api } from "@/lib/api";

export async function listVaults(user) {
  return sb.listVaults(user);
}

export async function createVault(user, name) {
  return sb.createVault(user, name);
}

export async function getVault(user, vaultId) {
  return sb.getVault(user, vaultId);
}

export async function deleteVault(user, vaultId) {
  return sb.deleteVault(user, vaultId);
}

export async function leaveVault(user, vaultId) {
  return sb.leaveVault(user, vaultId);
}

export async function listVaultEntries(user, vaultId) {
  return sb.listVaultEntries(user, vaultId);
}

export async function getEntry(user, entryId) {
  return sb.getEntry(user, entryId);
}

export async function createEntry(user, vaultId, payload) {
  return sb.createEntry(user, vaultId, payload);
}

export async function updateEntry(user, entryId, payload) {
  return sb.updateEntry(user, entryId, payload);
}

export async function deleteEntry(user, entryId) {
  return sb.deleteEntry(user, entryId);
}

export async function listEntryComments(user, entryId) {
  return sb.listEntryComments(user, entryId);
}

export async function addEntryComment(user, entryId, content) {
  return sb.addEntryComment(user, entryId, content);
}

export async function deleteComment(user, commentId) {
  return sb.deleteComment(user, commentId);
}

export async function inviteToVault(user, vaultId, email) {
  return sb.inviteToVault(user, vaultId, email);
}

export async function revokeInvitation(user, vaultId, invitationId) {
  return sb.revokeInvitation(user, vaultId, invitationId);
}

export async function removeMember(user, vaultId, memberUserId) {
  return sb.removeMember(user, vaultId, memberUserId);
}

export async function listNotifications(user) {
  return sb.listNotifications(user);
}

export async function markNotificationRead(user, notificationId) {
  return sb.markNotificationRead(user, notificationId);
}

export async function markAllNotificationsRead(user) {
  return sb.markAllNotificationsRead(user);
}

/** Upload dish photo — Supabase storage. */
export async function uploadEntryImageFile(user, entryId, file) {
  const image_url = await uploadEntryImage(entryId, file);
  return updateEntry(user, entryId, { image_url });
}

export async function regenerateEntryImage(user, entryId) {
  const { data } = await api.post(`/entries/${entryId}/image/generate`, {}, { timeout: 90000 });
  if (data.image_url) {
    await updateEntry(user, entryId, { image_url: data.image_url });
  }
  return data;
}
