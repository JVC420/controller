export const AMBULANCE_OPERATIONAL_STATUS = {
    AVAILABLE: 'Lista para asignación',
    IN_SERVICE: 'En Servicio',
    OUT_OF_SERVICE: 'Fuera de Servicio',
    INCOMPLETE_CREW: 'Disponible con tripulación incompleta',
};

export const CREW_RULES = {
    'Básica': ['Conductor', 'Paramédico'],
    'Medicalizada': ['Médico', 'Conductor', 'Paramédico'],
};

export const getCrewRulesForAmbulance = (ambulance) => CREW_RULES[ambulance?.tipo] || [];

export const getActiveCrewForAmbulance = (turnosHoy = [], ambulanceId) => {
    return turnosHoy.filter((t) =>
        t.movil === ambulanceId && !t.horaFinReal && !t.cancelado && !t.ausenciaConfirmada
    );
};

export const isAmbulanceCrewComplete = (ambulance, turnosHoy = []) => {
    const rules = getCrewRulesForAmbulance(ambulance);
    if (!rules.length) return false;

    const crew = getActiveCrewForAmbulance(turnosHoy, ambulance.id);
    return rules.every((role) => crew.some((member) => member.cargo === role));
};

export const getAmbulanceOperationalStatus = (ambulance, turnosHoy = []) => {
    if (!ambulance) return AMBULANCE_OPERATIONAL_STATUS.OUT_OF_SERVICE;
    if (ambulance.estado === AMBULANCE_OPERATIONAL_STATUS.OUT_OF_SERVICE) {
        return AMBULANCE_OPERATIONAL_STATUS.OUT_OF_SERVICE;
    }
    if (ambulance.estado === AMBULANCE_OPERATIONAL_STATUS.IN_SERVICE) {
        return AMBULANCE_OPERATIONAL_STATUS.IN_SERVICE;
    }

    if (!isAmbulanceCrewComplete(ambulance, turnosHoy)) {
        return AMBULANCE_OPERATIONAL_STATUS.INCOMPLETE_CREW;
    }
    return AMBULANCE_OPERATIONAL_STATUS.AVAILABLE;
};

export const canAssignRequestToAmbulance = (ambulance, turnosHoy = []) => {
    return getAmbulanceOperationalStatus(ambulance, turnosHoy) === AMBULANCE_OPERATIONAL_STATUS.AVAILABLE;
};
