export const hasAnyRole = (roles = [], allowed = []) =>
  allowed.some((role) => roles.includes(role));

export function buildWorkspaces(user) {
  const workspaces = [];
  if (user.platformRoles.includes('PLATFORM_ADMIN')) {
    workspaces.push({ id: 'admin', kind: 'ADMIN', label: 'Platform Administration' });
    workspaces.push({ id: 'dairy', kind: 'DAIRY_OWNER', label: 'Dairy Management & Inventory' });
  }
  if (user.platformRoles.includes('DAIRY_OWNER') || user.dairyOwnerProfile?.exists) {
    if (!workspaces.some((w) => w.id === 'dairy')) {
      workspaces.push({
        id: 'dairy',
        kind: 'DAIRY_OWNER',
        label: user.dairyOwnerProfile?.dairyName
          ? `${user.dairyOwnerProfile.dairyName} (Dairy)`
          : 'Dairy Owner Workspace',
        dairyStatus: user.dairyOwnerProfile?.status || 'VERIFIED',
      });
    }
  }
  if (user.veterinarian?.exists || user.platformRoles.includes('VETERINARIAN'))
    workspaces.push({
      id: 'veterinarian',
      kind: 'VETERINARIAN',
      label: 'Veterinarian Workspace',
      veterinarianStatus: user.veterinarian?.status || null,
    });
  for (const membership of user.farmMemberships || [])
    workspaces.push({
      id: `farm:${membership.farmId}`,
      kind: 'FARM',
      label: membership.farmName,
      ...membership,
    });
  if (!user.platformRoles.includes('PLATFORM_ADMIN') && !user.platformRoles.includes('DAIRY_OWNER'))
    workspaces.push({ id: 'account', kind: 'ACCOUNT', label: 'Account & Onboarding' });
  return workspaces;
}

export function farmCapabilities(roles = []) {
  const manages = hasAnyRole(roles, ['FARM_OWNER', 'FARM_MANAGER']);
  return {
    manages,
    owns: roles.includes('FARM_OWNER'),
    canEditAnimals: manages,
    canRequestTreatment: manages,
    canCancelRequests: manages,
    canRecordAdministration: hasAnyRole(roles, ['FARM_OWNER', 'FARM_MANAGER', 'FARM_WORKER']),
    canViewManagementAnalytics: manages,
    canIssueCertificate: manages,
    canAnchorCertificate: manages,
  };
}

export function navigationFor(workspace) {
  if (workspace.kind === 'ADMIN')
    return [
      ['dashboard', 'Platform Dashboard'],
      ['dairy-dashboard', 'Dairy Operations'],
      ['admin', 'User Verifications'],
      ['core-engine', 'Organization Analytics'],
      ['certificates', 'Certificates'],
      ['notifications', 'Notifications'],
      ['ai', 'AI Advisor'],
    ];
  if (workspace.kind === 'DAIRY_OWNER')
    return [
      ['dairy-dashboard', 'Dairy Overview & Analytics'],
      ['dairy-farmers', 'Farmer Directory & Requests'],
      ['dairy-inventory', 'Milk Inventory & Sales'],
      ['core-engine', 'Procurement & AMU Analysis'],
      ['notifications', 'Notifications'],
      ['ai', 'AI Advisor'],
    ];
  if (workspace.kind === 'VETERINARIAN')
    return workspace.veterinarianStatus === 'VERIFIED'
      ? [
          ['dashboard', 'Veterinarian Dashboard'],
          ['veterinary-care', 'Assigned Care'],
          ['core-engine', 'Relevant AMU & Eligibility'],
          ['certificates', 'Relevant Certificates'],
          ['notifications', 'Notifications'],
          ['ai', 'AI Advisor'],
        ]
      : [['vet', 'Verification Status']];
  if (workspace.kind === 'FARM') {
    const capabilities = farmCapabilities(workspace.roles);
    return [
      ['farm', 'Farm & Animals'],
      ['veterinary-care', 'Veterinary Operations'],
      ...(capabilities.canViewManagementAnalytics
        ? [
            ['dashboard', 'Farm Dashboard'],
            ['core-engine', 'AMU & Milk Eligibility'],
            ['daily-clearance', "Today's Milk Eligibility"],
            ['certificates', 'Certificates'],
            ['notifications', 'Notifications'],
            ['ai', 'AI Advisor'],
          ]
        : []),
      ...(capabilities.owns ? [['members', 'Farm Members']] : []),
      ...(!capabilities.canViewManagementAnalytics
        ? [['daily-clearance', "Today's Milk Eligibility"]]
        : []),
    ];
  }
  return [
    ['create', 'Create Farm'],
    ['vet', 'Veterinarian Onboarding'],
  ];
}

export function normalizeOptionalFields(values, optionalNames) {
  const normalized = { ...values };
  for (const name of optionalNames) {
    if (typeof normalized[name] === 'string' && normalized[name].trim() === '')
      delete normalized[name];
  }
  return normalized;
}
