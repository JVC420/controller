const ROLE_DISPLAY_LABELS = {
    'Paramédico': 'Aux. Enfermeria',
};

export const getRoleDisplayName = (role) => ROLE_DISPLAY_LABELS[role] || role;

export const getRoleListDisplay = (roles = []) => roles.map(getRoleDisplayName).join(', ');
