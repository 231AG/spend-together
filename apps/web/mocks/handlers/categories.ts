import { db, type CategoryRecord } from '../db';
import { ApiFailure, notFound } from '../errors';
import { route } from '../http';
import { category } from '../serialize';

// Categories (§9.3, BR-17): defaults are system-owned and locked; custom ones can be
// renamed, re-iconed and archived (hidden from pickers, kept for history), never deleted.

function visible(userId: string): CategoryRecord[] {
  return db.categories.filter((c) => c.ownerId === null || c.ownerId === userId);
}

function assertUniqueName(userId: string, name: string, type: string, except?: string) {
  const clash = visible(userId).find(
    (c) =>
      c.id !== except &&
      c.type === type &&
      c.archivedAt === null &&
      c.name.toLowerCase() === name.toLowerCase(),
  );
  if (clash) throw new ApiFailure('CONFLICT', 'You already have a category with that name.');
}

export const categoryHandlers = [
  route('listCategories', ({ user, query }) => ({
    data: visible(user.id)
      .filter((c) => (query.type ? c.type === query.type : true))
      .filter((c) => query.include === 'archived' || c.archivedAt === null)
      .map(category),
  })),

  route('createCategory', ({ user, body }) => {
    assertUniqueName(user.id, body.name, body.type);
    const record: CategoryRecord = {
      id: db.newId('category'),
      ownerId: user.id,
      name: body.name,
      type: body.type,
      icon: body.icon,
      color: body.color,
      isDefault: false,
      archivedAt: null,
    };
    db.categories.push(record);
    return category(record);
  }),

  route('patchCategory', ({ user, params, body }) => {
    const c = visible(user.id).find((x) => x.id === params.id);
    if (!c) throw notFound('That category');
    if (c.isDefault) throw new ApiFailure('CONFLICT', "Default categories can't be changed.");
    if (body.name !== undefined) {
      assertUniqueName(user.id, body.name, c.type, c.id);
      c.name = body.name;
    }
    if (body.icon !== undefined) c.icon = body.icon;
    if (body.color !== undefined) c.color = body.color;
    if (body.archived === false && c.archivedAt !== null) {
      // Restoring brings the name back into use, so it must still be unique.
      assertUniqueName(user.id, body.name ?? c.name, c.type, c.id);
    }
    if (body.archived !== undefined)
      c.archivedAt = body.archived ? (c.archivedAt ?? db.nowIso()) : null;
    return category(c);
  }),
];
