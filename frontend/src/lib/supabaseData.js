/**
 * Supabase Postgres data layer — vaults, entries, comments, invites, notifications.
 * Maps UUID `id` columns to the app's `*_id` field names.
 */
import { getSupabase } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";
import { api } from "@/lib/api";

function sb() {
  const client = getSupabase();
  if (!client) throw new Error("Supabase is not configured.");
  return client;
}

function requireUser(user) {
  if (!user?.user_id) throw new Error("You need to be signed in.");
}

function mapVault(row, extras = {}) {
  if (!row) return null;
  return {
    vault_id: row.id,
    name: row.name,
    created_by_user_id: row.created_by_user_id,
    created_at: row.created_at,
    ...extras,
  };
}

function mapEntry(row) {
  if (!row) return null;
  return {
    entry_id: row.id,
    vault_id: row.vault_id,
    entry_type: row.entry_type,
    title: row.title,
    description: row.description || "",
    ingredients: row.ingredients || [],
    steps: row.steps || [],
    prep_time: row.prep_time,
    cook_time: row.cook_time,
    servings: row.servings,
    notes: row.notes || "",
    occasion: row.occasion,
    items_needed: row.items_needed || [],
    participants: row.participants,
    significance: row.significance,
    time_of_year: row.time_of_year,
    language: row.language,
    lyrics_original: row.lyrics_original,
    lyrics_english: row.lyrics_english,
    when_sung: row.when_sung,
    image_url: row.image_url,
    audio_path: row.audio_path,
    has_audio: row.has_audio,
    audio_duration: row.audio_duration,
    original_language: row.original_language,
    created_by_user_id: row.created_by_user_id,
    created_by_name: row.created_by_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapComment(row) {
  return {
    comment_id: row.id,
    entry_id: row.entry_id,
    user_id: row.user_id,
    user_name: row.author_name,
    author_name: row.author_name,
    content: row.content,
    created_at: row.created_at,
  };
}

function mapInvitation(row) {
  return {
    invitation_id: row.id,
    vault_id: row.vault_id,
    email: row.email,
    status: row.status,
    invited_by_user_id: row.invited_by_user_id,
    created_at: row.created_at,
  };
}

function mapNotification(row) {
  return {
    notification_id: row.id,
    user_id: row.user_id,
    type: row.title,
    message: row.body || row.title,
    title: row.title,
    body: row.body,
    link: row.link,
    entry_id: row.entry_id,
    vault_id: row.vault_id,
    read: row.read,
    created_at: row.created_at,
  };
}

function entryPayload(payload, user) {
  return {
    entry_type: payload.entry_type || "recipe",
    title: payload.title || "Untitled",
    description: payload.description || "",
    ingredients: payload.ingredients || [],
    steps: payload.steps || [],
    prep_time: payload.prep_time || null,
    cook_time: payload.cook_time || null,
    servings: payload.servings || null,
    notes: payload.notes || "",
    occasion: payload.occasion || null,
    items_needed: payload.items_needed || [],
    participants: payload.participants || null,
    significance: payload.significance || null,
    time_of_year: payload.time_of_year || null,
    language: payload.language || null,
    lyrics_original: payload.lyrics_original || null,
    lyrics_english: payload.lyrics_english || null,
    when_sung: payload.when_sung || null,
    image_url: payload.image_url || null,
    created_by_user_id: user.user_id,
    created_by_name: user.name,
    updated_at: new Date().toISOString(),
  };
}

async function countEntries(vaultId) {
  const { count, error } = await sb()
    .from("entries")
    .select("*", { count: "exact", head: true })
    .eq("vault_id", vaultId);
  if (error) throw new Error(error.message);
  return count || 0;
}

async function countMembers(vaultId) {
  const { count, error } = await sb()
    .from("vault_members")
    .select("*", { count: "exact", head: true })
    .eq("vault_id", vaultId);
  if (error) throw new Error(error.message);
  return count || 0;
}

/** Auto-accept pending invitations for the signed-in user's email. */
export async function acceptPendingInvitations(user) {
  if (!user?.user_id || !user?.email) return;
  const email = normalizeEmail(user.email);
  const { data: pending, error } = await sb()
    .from("invitations")
    .select("id, vault_id")
    .eq("email", email)
    .eq("status", "pending");
  if (error || !pending?.length) return;

  for (const inv of pending) {
    const { data: existing } = await sb()
      .from("vault_members")
      .select("user_id")
      .eq("vault_id", inv.vault_id)
      .eq("user_id", user.user_id)
      .maybeSingle();
    if (!existing) {
      await sb().from("vault_members").insert({
        vault_id: inv.vault_id,
        user_id: user.user_id,
        role: "member",
      });
    }
    await sb()
      .from("invitations")
      .update({ status: "accepted" })
      .eq("id", inv.id);
  }
}

export async function listVaults(user) {
  requireUser(user);
  const { data: memberships, error } = await sb()
    .from("vault_members")
    .select("role, joined_at, vaults(id, name, created_by_user_id, created_at)")
    .eq("user_id", user.user_id);
  if (error) throw new Error(error.message);
  if (!memberships?.length) return [];

  const out = await Promise.all(
    memberships.map(async (m) => {
      const v = m.vaults;
      if (!v) return null;
      const [recipe_count, member_count] = await Promise.all([
        countEntries(v.id),
        countMembers(v.id),
      ]);
      return mapVault(v, { my_role: m.role, recipe_count, member_count });
    }),
  );
  return out.filter(Boolean).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

export async function createVault(user, name) {
  requireUser(user);
  const trimmed = String(name || "").trim();
  if (!trimmed) throw new Error("Please name your vault.");

  const { data: vault, error: vErr } = await sb()
    .from("vaults")
    .insert({ name: trimmed, created_by_user_id: user.user_id })
    .select("id, name, created_by_user_id, created_at")
    .single();
  if (vErr) throw new Error(vErr.message);

  const { error: mErr } = await sb().from("vault_members").insert({
    vault_id: vault.id,
    user_id: user.user_id,
    role: "owner",
  });
  if (mErr) throw new Error(mErr.message);

  return getVault(user, vault.id);
}

export async function getVault(user, vaultId) {
  requireUser(user);
  const { data: membership, error: mErr } = await sb()
    .from("vault_members")
    .select("role")
    .eq("vault_id", vaultId)
    .eq("user_id", user.user_id)
    .maybeSingle();
  if (mErr) throw new Error(mErr.message);
  if (!membership) throw new Error("You're not a member of this vault.");

  const { data: vault, error: vErr } = await sb()
    .from("vaults")
    .select("id, name, created_by_user_id, created_at")
    .eq("id", vaultId)
    .single();
  if (vErr || !vault) throw new Error("Vault not found.");

  const { data: members, error: memErr } = await sb()
    .from("vault_members")
    .select("user_id, role, joined_at, profiles(name, email)")
    .eq("vault_id", vaultId);
  if (memErr) throw new Error(memErr.message);

  const memberView = (members || []).map((x) => ({
    user_id: x.user_id,
    name: x.profiles?.name || "Member",
    email: x.profiles?.email || "",
    role: x.role,
    joined_at: x.joined_at,
  }));

  let invitations = [];
  if (membership.role === "owner") {
    const { data: invs } = await sb()
      .from("invitations")
      .select("id, vault_id, email, status, invited_by_user_id, created_at")
      .eq("vault_id", vaultId)
      .order("created_at", { ascending: false });
    invitations = (invs || []).map(mapInvitation);
  }

  return {
    ...mapVault(vault, { my_role: membership.role }),
    members: memberView,
    invitations,
  };
}

export async function deleteVault(user, vaultId) {
  requireUser(user);
  const vault = await getVault(user, vaultId);
  if (vault.my_role !== "owner") throw new Error("Only the vault owner can delete it.");
  const { error } = await sb().from("vaults").delete().eq("id", vaultId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function leaveVault(user, vaultId) {
  requireUser(user);
  const vault = await getVault(user, vaultId);
  if (vault.my_role === "owner") {
    throw new Error("Owners can't leave. Delete the vault instead.");
  }
  const { error } = await sb()
    .from("vault_members")
    .delete()
    .eq("vault_id", vaultId)
    .eq("user_id", user.user_id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listVaultEntries(user, vaultId) {
  requireUser(user);
  await getVault(user, vaultId);
  const { data, error } = await sb()
    .from("entries")
    .select("*")
    .eq("vault_id", vaultId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapEntry);
}

export async function getEntry(user, entryId) {
  requireUser(user);
  const { data, error } = await sb()
    .from("entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Entry not found.");
  await getVault(user, data.vault_id);
  return mapEntry(data);
}

export async function createEntry(user, vaultId, payload) {
  requireUser(user);
  await getVault(user, vaultId);
  const row = { vault_id: vaultId, ...entryPayload(payload, user) };
  const { data, error } = await sb()
    .from("entries")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapEntry(data);
}

export async function updateEntry(user, entryId, payload) {
  requireUser(user);
  const existing = await getEntry(user, entryId);
  const updates = { ...payload, updated_at: new Date().toISOString() };
  delete updates.entry_id;
  delete updates.vault_id;
  delete updates.created_by_user_id;
  delete updates.created_by_name;
  delete updates.created_at;

  const { data, error } = await sb()
    .from("entries")
    .update(updates)
    .eq("id", entryId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapEntry(data);
}

export async function deleteEntry(user, entryId) {
  requireUser(user);
  await getEntry(user, entryId);
  const { error } = await sb().from("entries").delete().eq("id", entryId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listEntryComments(user, entryId) {
  await getEntry(user, entryId);
  const { data, error } = await sb()
    .from("comments")
    .select("*")
    .eq("entry_id", entryId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(mapComment);
}

async function notifyUsers(userIds, { title, body, link, entry_id, vault_id }) {
  const rows = userIds.map((uid) => ({
    user_id: uid,
    title,
    body,
    link,
    entry_id: entry_id || null,
    vault_id: vault_id || null,
  }));
  if (!rows.length) return;
  await sb().from("notifications").insert(rows);
}

export async function addEntryComment(user, entryId, content) {
  const entry = await getEntry(user, entryId);
  const { data, error } = await sb()
    .from("comments")
    .insert({
      entry_id: entryId,
      user_id: user.user_id,
      author_name: user.name,
      content: content.trim(),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const { data: members } = await sb()
    .from("vault_members")
    .select("user_id, role")
    .eq("vault_id", entry.vault_id);

  const notifyIds = new Set();
  notifyIds.add(entry.created_by_user_id);
  const owner = (members || []).find((m) => m.role === "owner");
  if (owner) notifyIds.add(owner.user_id);
  notifyIds.delete(user.user_id);

  await notifyUsers([...notifyIds], {
    title: "comment",
    body: `${user.name} commented on "${entry.title}"`,
    link: `/entries/${entryId}`,
    entry_id: entryId,
    vault_id: entry.vault_id,
  });

  return mapComment(data);
}

export async function deleteComment(user, commentId) {
  const { data: c, error } = await sb()
    .from("comments")
    .select("*")
    .eq("id", commentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!c) return { ok: true };
  await getEntry(user, c.entry_id);
  const { error: dErr } = await sb().from("comments").delete().eq("id", commentId);
  if (dErr) throw new Error(dErr.message);
  return { ok: true };
}

function buildAcceptUrl(email) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/register?email=${encodeURIComponent(email)}`;
}

export async function inviteToVault(user, vaultId, emailRaw) {
  requireUser(user);
  const vault = await getVault(user, vaultId);
  if (vault.my_role !== "owner") throw new Error("Only the vault owner can invite.");

  const email = normalizeEmail(emailRaw);
  const accept_url = buildAcceptUrl(email);

  const { data: profile } = await sb()
    .from("profiles")
    .select("id, name, email")
    .ilike("email", email)
    .maybeSingle();

  if (profile) {
    const { data: existing } = await sb()
      .from("vault_members")
      .select("user_id")
      .eq("vault_id", vaultId)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (existing) throw new Error("That person is already in this vault.");

    await sb().from("vault_members").insert({
      vault_id: vaultId,
      user_id: profile.id,
      role: "member",
    });
    await notifyUsers([profile.id], {
      title: "added_to_vault",
      body: `${user.name} added you to "${vault.name}"`,
      link: `/vaults/${vaultId}`,
      vault_id: vaultId,
    });

    let emailResult = { ok: false };
    try {
      const { data } = await api.post("/invites/send-email", {
        email,
        vault_name: vault.name,
        accept_url,
      });
      emailResult = data;
    } catch {}

    return {
      ok: true,
      added: true,
      email_sent: emailResult.ok,
      email_error: emailResult.error,
      accept_url,
    };
  }

  const { data: pending } = await sb()
    .from("invitations")
    .select("id")
    .eq("vault_id", vaultId)
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  const already_pending = Boolean(pending);
  if (!pending) {
    await sb().from("invitations").insert({
      vault_id: vaultId,
      email,
      status: "pending",
      invited_by_user_id: user.user_id,
    });
  }

  let emailResult = { ok: false };
  try {
    const { data } = await api.post("/invites/send-email", {
      email,
      vault_name: vault.name,
      accept_url,
    });
    emailResult = data;
  } catch {}

  return {
    ok: true,
    pending: true,
    already_pending,
    email_sent: emailResult.ok,
    email_error: emailResult.error,
    accept_url,
  };
}

export async function revokeInvitation(user, vaultId, invitationId) {
  requireUser(user);
  await getVault(user, vaultId);
  const { error } = await sb()
    .from("invitations")
    .delete()
    .eq("id", invitationId)
    .eq("vault_id", vaultId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function removeMember(user, vaultId, memberUserId) {
  requireUser(user);
  const vault = await getVault(user, vaultId);
  if (vault.my_role !== "owner") throw new Error("Only the vault owner can do this.");
  if (memberUserId === user.user_id) {
    throw new Error("You can't remove yourself. Delete the vault instead.");
  }
  const { error } = await sb()
    .from("vault_members")
    .delete()
    .eq("vault_id", vaultId)
    .eq("user_id", memberUserId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listNotifications(user) {
  requireUser(user);
  const { data, error } = await sb()
    .from("notifications")
    .select("*")
    .eq("user_id", user.user_id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const items = (data || []).map(mapNotification);
  const unread = items.filter((n) => !n.read).length;
  return { items, unread };
}

export async function markNotificationRead(user, notificationId) {
  requireUser(user);
  const { error } = await sb()
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.user_id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function markAllNotificationsRead(user) {
  requireUser(user);
  const { error } = await sb()
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.user_id)
    .eq("read", false);
  if (error) throw new Error(error.message);
  return { ok: true };
}
