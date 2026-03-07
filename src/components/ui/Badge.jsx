import React from 'react';
import { clsx } from 'clsx';

export const Badge = ({ children, colorScheme = 'slate', className, dot = false }) => {
    const colors = {
        emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        red: "bg-red-500/10 text-red-400 border-red-500/20",
        orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        slate: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };

    return (
        <span className={clsx(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border",
            colors[colorScheme] || colors.slate,
            className
        )}>
            {dot && (
                <span className={clsx(
                    "w-1.5 h-1.5 rounded-full",
                    colorScheme === 'emerald' ? 'bg-emerald-400' :
                        colorScheme === 'red' ? 'bg-red-400' :
                            colorScheme === 'orange' ? 'bg-orange-400' :
                                colorScheme === 'blue' ? 'bg-blue-400' :
                                    'bg-slate-400'
                )} />
            )}
            {children}
        </span>
    );
};

export const EmpEstadoBadge = ({ estado }) => {
    const map = {
        Activo: 'emerald',
        Retirado: 'red',
        Renuncia: 'orange',
        Licencia: 'blue',
    };
    return <Badge colorScheme={map[estado] || 'slate'}>{estado}</Badge>;
};
