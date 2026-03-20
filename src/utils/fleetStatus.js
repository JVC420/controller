import {
    detectAmbulanceOperationalIncidents,
    getActiveCrewNow,
} from './shiftOperations';

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

export const getActiveCrewForAmbulance = (turnosHoy = [], ambulanceId, atMs = Date.now()) =>
    getActiveCrewNow(turnosHoy, ambulanceId, atMs);

export const getAmbulanceOperationalSnapshot = (ambulance, turnosHoy = [], atMs = Date.now()) => {
    const rules = getCrewRulesForAmbulance(ambulance);
    const activeCrew = getActiveCrewForAmbulance(turnosHoy, ambulance?.id, atMs);
    const missingRoles = rules.filter((role) => !activeCrew.some((member) => member.cargo === role));
    const incidentFlags = detectAmbulanceOperationalIncidents(turnosHoy, ambulance?.id, rules, atMs);

    if (!ambulance) {
        return {
            status: AMBULANCE_OPERATIONAL_STATUS.OUT_OF_SERVICE,
            activeCrew,
            missingRoles,
            incidentFlags,
        };
    }

    if (ambulance.estado === AMBULANCE_OPERATIONAL_STATUS.OUT_OF_SERVICE || ambulance.estado === 'Fuera de Servicio') {
        return {
            status: AMBULANCE_OPERATIONAL_STATUS.OUT_OF_SERVICE,
            activeCrew,
            missingRoles,
            incidentFlags,
        };
    }

    if (ambulance.estado === AMBULANCE_OPERATIONAL_STATUS.IN_SERVICE || ambulance.estado === 'En Servicio') {
        return {
            status: AMBULANCE_OPERATIONAL_STATUS.IN_SERVICE,
            activeCrew,
            missingRoles,
            incidentFlags,
        };
    }

    return {
        status: missingRoles.length > 0
            ? AMBULANCE_OPERATIONAL_STATUS.INCOMPLETE_CREW
            : AMBULANCE_OPERATIONAL_STATUS.AVAILABLE,
        activeCrew,
        missingRoles,
        incidentFlags,
    };
};

export const isAmbulanceCrewComplete = (ambulance, turnosHoy = [], atMs = Date.now()) =>
    getAmbulanceOperationalSnapshot(ambulance, turnosHoy, atMs).missingRoles.length === 0;

export const getAmbulanceOperationalStatus = (ambulance, turnosHoy = [], atMs = Date.now()) =>
    getAmbulanceOperationalSnapshot(ambulance, turnosHoy, atMs).status;

export const canAssignRequestToAmbulance = (ambulance, turnosHoy = [], atMs = Date.now()) =>
    getAmbulanceOperationalStatus(ambulance, turnosHoy, atMs) === AMBULANCE_OPERATIONAL_STATUS.AVAILABLE;
