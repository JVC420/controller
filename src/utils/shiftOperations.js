const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const INCIDENT_FLAG_LABELS = {
    late_start: 'Inicio tardío',
    extended_shift: 'Extensión de turno',
    no_real_start_during_planned_window: 'Turno programado en curso sin inicio real registrado',
    real_overlap_same_role: 'Solape real de personal en el mismo cargo',
};

const toMs = (value, fallbackDate) => {
    if (!value) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value?.toDate === 'function') {
        const ms = value.toDate().getTime();
        return Number.isFinite(ms) ? ms : null;
    }
    if (typeof value === 'string') {
        if (value.includes('T')) {
            const ms = new Date(value).getTime();
            return Number.isFinite(ms) ? ms : null;
        }
        if (fallbackDate) {
            const ms = new Date(`${fallbackDate}T${value}:00`).getTime();
            return Number.isFinite(ms) ? ms : null;
        }
    }
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
};

const ensureIntervalOrder = (startMs, endMs) => {
    if (startMs == null || endMs == null) return { startMs, endMs };
    if (endMs > startMs) return { startMs, endMs };
    return { startMs, endMs: endMs + ONE_DAY_MS };
};

export const intervalsOverlap = (startA, endA, startB, endB) => {
    if ([startA, endA, startB, endB].some((v) => v == null)) return false;
    return startA < endB && endA > startB;
};

export const isShiftCanceledOrAbsent = (shift) => Boolean(shift?.cancelado || shift?.ausenciaConfirmada);

export const getShiftPlannedInterval = (shift) => {
    const startMs = toMs(shift?.inicioProgramado, shift?.fecha);
    const endRaw = shift?.finProgramado || shift?.horaFin;
    const endMs = toMs(endRaw, shift?.fecha);
    return ensureIntervalOrder(startMs, endMs);
};

export const getShiftExecutionInterval = (shift) => {
    const startRaw = shift?.inicioReal || shift?.inicioProgramado;
    const endRaw = shift?.finReal || shift?.horaFinReal || shift?.finProgramado || shift?.horaFin;
    const startMs = toMs(startRaw, shift?.fecha);
    const endMs = toMs(endRaw, shift?.fecha);
    return ensureIntervalOrder(startMs, endMs);
};

export const getShiftTimeSemantics = (shift, nowMs = Date.now()) => {
    const planned = getShiftPlannedInterval(shift);
    const execution = getShiftExecutionInterval(shift);

    const planningStatus = isShiftCanceledOrAbsent(shift)
        ? 'cancelled'
        : planned.startMs == null || planned.endMs == null
            ? 'invalid'
            : nowMs < planned.startMs
                ? 'scheduled'
                : nowMs >= planned.endMs
                    ? 'planned_elapsed'
                    : 'planned_in_window';

    let executionStatus = 'not_started';
    if (isShiftCanceledOrAbsent(shift)) {
        executionStatus = 'cancelled';
    } else if (shift?.horaFinReal || shift?.finReal) {
        executionStatus = 'finished';
    } else if (execution.startMs != null && nowMs >= execution.startMs) {
        executionStatus = 'active';
    }

    const incidentFlags = [];
    if (!isShiftCanceledOrAbsent(shift)) {
        if (shift?.inicioReal && planned.startMs != null) {
            const startRealMs = toMs(shift.inicioReal, shift.fecha);
            if (startRealMs != null && startRealMs > planned.startMs + 15 * 60 * 1000) {
                incidentFlags.push('late_start');
            }
        }

        const realEndMs = toMs(shift?.finReal || shift?.horaFinReal, shift?.fecha);
        if (realEndMs != null && planned.endMs != null && realEndMs > planned.endMs + 30 * 60 * 1000) {
            incidentFlags.push('extended_shift');
        }

        if (!shift?.inicioReal && planningStatus === 'planned_in_window') {
            incidentFlags.push('no_real_start_during_planned_window');
        }
    }

    return {
        planningStatus,
        executionStatus,
        incidentFlags,
        planned,
        execution,
    };
};

export const isShiftActiveAt = (shift, nowMs = Date.now()) => {
    if (isShiftCanceledOrAbsent(shift)) return false;
    const { execution } = getShiftTimeSemantics(shift, nowMs);
    if (execution.startMs == null) return false;
    if (execution.endMs != null) return nowMs >= execution.startMs && nowMs < execution.endMs;
    return nowMs >= execution.startMs;
};

export const getActiveCrewNow = (turnos = [], movilId, nowMs = Date.now(), excludeShiftId = null) => {
    return turnos.filter((shift) => (
        shift?.movil === movilId
        && shift?.movil !== 'Sin Asignar'
        && shift?.id !== excludeShiftId
        && isShiftActiveAt(shift, nowMs)
    ));
};

export const getCrewScheduledInRange = (turnos = [], movilId, rangeStart, rangeEnd, excludeShiftId = null) => {
    if (rangeStart == null || rangeEnd == null) return [];

    return turnos.filter((shift) => {
        if (shift?.movil !== movilId || shift?.movil === 'Sin Asignar' || shift?.id === excludeShiftId) return false;
        if (isShiftCanceledOrAbsent(shift)) return false;
        const planned = getShiftPlannedInterval(shift);
        return intervalsOverlap(rangeStart, rangeEnd, planned.startMs, planned.endMs);
    });
};

export const detectAmbulanceOperationalIncidents = (turnos = [], movilId, requiredRoles = [], nowMs = Date.now()) => {
    const shifts = turnos
        .filter((shift) => shift?.movil === movilId && shift?.movil !== 'Sin Asignar' && !isShiftCanceledOrAbsent(shift))
        .map((shift) => ({ shift, semantics: getShiftTimeSemantics(shift, nowMs) }));

    const incidents = new Set();

    shifts.forEach(({ semantics }) => {
        semantics.incidentFlags.forEach((flag) => incidents.add(flag));
    });

    const activeNow = shifts
        .filter(({ shift }) => isShiftActiveAt(shift, nowMs))
        .map(({ shift }) => shift);

    const duplicatedRoles = new Set();
    activeNow.forEach((shift) => {
        if (!shift?.cargo) return;
        const duplicates = activeNow.filter((s) => s.cargo === shift.cargo).length;
        if (duplicates > 1) duplicatedRoles.add(shift.cargo);
    });
    if (duplicatedRoles.size > 0) incidents.add('real_overlap_same_role');

    requiredRoles.forEach((role) => {
        const hasActiveRole = activeNow.some((s) => s.cargo === role);
        if (hasActiveRole) return;

        const waitingRelief = shifts.some(({ shift, semantics }) => (
            shift?.cargo === role
            && semantics.planned.startMs != null
            && semantics.planned.startMs <= nowMs
            && !shift?.inicioReal
            && !shift?.horaFinReal
        ));

        if (waitingRelief) incidents.add(`missing_relief_${role}`);
    });

    return Array.from(incidents);
};

export const validatePlannedShiftAssignment = ({
    candidateShift,
    allShifts = [],
    requiredRoles = [],
    vehicleType = '',
    excludeShiftId = null,
}) => {
    const errors = [];

    const candidateStart = toMs(candidateShift?.inicioProgramado, candidateShift?.fecha);
    const candidateEnd = toMs(candidateShift?.finProgramado || candidateShift?.horaFin, candidateShift?.fecha);
    const { startMs, endMs } = ensureIntervalOrder(candidateStart, candidateEnd);

    if (startMs == null || endMs == null) {
        errors.push('Shift planned interval is invalid.');
        return { valid: false, errors };
    }

    const employeeConflicts = allShifts.filter((shift) => {
        if (shift?.id === excludeShiftId) return false;
        if (shift?.id_empleado !== candidateShift?.id_empleado) return false;
        if (isShiftCanceledOrAbsent(shift)) return false;

        const planned = getShiftPlannedInterval(shift);
        return intervalsOverlap(startMs, endMs, planned.startMs, planned.endMs);
    });

    if (employeeConflicts.length > 0) {
        errors.push('Employee has overlapping planned shifts.');
    }

    const needsVehicleValidation = candidateShift?.movil && candidateShift?.movil !== 'Sin Asignar';

    if (needsVehicleValidation) {
        if (!requiredRoles.includes(candidateShift?.cargo)) {
            errors.push(`Role ${candidateShift?.cargo || 'unknown'} is not allowed for vehicle type ${vehicleType || 'unknown'}.`);
        }

        const plannedCrew = getCrewScheduledInRange(allShifts, candidateShift.movil, startMs, endMs, excludeShiftId);
        const sameRoleCount = plannedCrew.filter((s) => s.cargo === candidateShift?.cargo).length;
        const maxRoleSlots = requiredRoles.filter((role) => role === candidateShift?.cargo).length;

        if (maxRoleSlots === 0 || sameRoleCount >= maxRoleSlots) {
            errors.push(`Vehicle ${candidateShift.movil} has no available slot for role ${candidateShift?.cargo || 'unknown'} in planned range.`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        plannedRange: { startMs, endMs },
    };
};

export const toShiftMs = toMs;

export const translateIncidentFlag = (flag) => {
    if (!flag) return '';
    if (INCIDENT_FLAG_LABELS[flag]) return INCIDENT_FLAG_LABELS[flag];
    if (flag.startsWith('missing_relief_')) {
        const role = flag.replace('missing_relief_', '');
        return `Falta relevo para ${role}`;
    }
    return flag;
};

export const translateIncidentFlags = (flags = []) =>
    (Array.isArray(flags) ? flags : [flags]).filter(Boolean).map(translateIncidentFlag);
