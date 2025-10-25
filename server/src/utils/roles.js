export function normalizeRoles(rawRoles, fallbackRole) {
  const roles = Array.isArray(rawRoles) ? rawRoles.filter(Boolean) : [];
  const activeRole = fallbackRole || (roles.length ? roles[0] : "goal_setter");

  if (activeRole && !roles.includes(activeRole)) {
    roles.push(activeRole);
  }

  if (!roles.length) {
    roles.push("goal_setter");
  }

  return Array.from(new Set(roles));
}

export function deriveRoleMetadata(source) {
  const role = source?.role || null;
  const roles = normalizeRoles(source?.roles, role);
  const activeRole = role || roles[0] || "goal_setter";

  return {
    role: activeRole,
    roles,
    isGoalSetter: roles.includes("goal_setter"),
    isBuyer: roles.includes("buyer"),
    isAdmin: roles.includes("admin"),
  };
}

export function buildUserResponse(user) {
  const { role, roles, isGoalSetter, isBuyer, isAdmin } = deriveRoleMetadata(user);

  return {
    id: user._id ? user._id : user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    isVerified: user.isVerified,
    role,
    roles,
    isGoalSetter,
    isBuyer,
    isAdmin,
  };
}

export function buildAuthPayload(user) {
  const { role, roles, isGoalSetter, isBuyer, isAdmin } = deriveRoleMetadata(user);

  return {
    id: user._id ? String(user._id) : user.id,
    role,
    roles,
    isGoalSetter,
    isBuyer,
    isAdmin,
  };
}

export async function ensureUserRoleArray(user) {
  if (!user) return [];

  const normalized = normalizeRoles(user.roles, user.role);
  const rolesChanged = !arraysAreEqual(normalized, Array.isArray(user.roles) ? user.roles : []);

  if (rolesChanged) {
    user.roles = normalized;
    await user.save();
  }

  return normalized;
}

function arraysAreEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}