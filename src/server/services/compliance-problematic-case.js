// Agregar casos problemáticos al archivo mock-realistic-data.js

// Casos de compliance problemático
export const PROBLEMATIC_TAXPAYERS = {
    // Caso 1: Contribuyente con múltiples problemas
    '20111222333': {
        cuit: '20111222333',
        razonSocial: 'EMPRESA PROBLEMATICA S.A.',
        estado: 'ACTIVO', // Activo pero con problemas
        situacionFiscal: {
            iva: 'RESPONSABLE_INSCRIPTO',
            ganancias: 'INSCRIPTO',
            monotributo: 'NO_INSCRIPTO'
        },
        domicilio: {
            direccion: 'SIN ACTUALIZAR',
            localidad: 'DESCONOCIDA',
            provincia: 'SIN DATOS'
        },
        actividades: [], // Sin actividades registradas - PROBLEMA
        tipo: 'JURIDICA',
        problemas: {
            sinActividades: true,
            domicilioDesactualizado: true,
            declaracionesVencidas: true,
            deudaVencida: true
        },
        ultimaDeclaracion: '2023-08-15', // Más de 6 meses
        deudaVencida: {
            monto: 150000,
            vencimiento: '2024-01-15'
        }
    },

    // Caso 2: Monotributo con recategorización pendiente
    '27999888777': {
        cuit: '27999888777',
        razonSocial: 'GOMEZ CARLOS ALBERTO',
        estado: 'ACTIVO',
        situacionFiscal: {
            iva: 'MONOTRIBUTO',
            ganancias: 'NO_INSCRIPTO',
            monotributo: 'INSCRIPTO'
        },
        domicilio: {
            direccion: 'MAIPU 1500',
            localidad: 'CIUDAD AUTONOMA BUENOS AIRES',
            provincia: 'CIUDAD AUTONOMA BUENOS AIRES'
        },
        actividades: [
            {
                codigo: 620100,
                descripcion: 'PROGRAMACION INFORMATICA',
                principal: true
            }
        ],
        tipo: 'FISICA',
        monotributo: {
            categoria: 'A', // Categoría muy baja para la actividad
            fechaInscripcion: '2023-01-15',
            recategorizacionPendiente: true
        },
        problemas: {
            recategorizacionVencida: true,
            categoriaInadecuada: true,
            ingresosSuperados: true
        },
        facturacionAnual: 2500000, // Supera límite categoría A
        ultimaRecategorizacion: '2023-01-15' // Nunca se recategorizó
    },

    // Caso 3: Contribuyente inactivo con obligaciones pendientes
    '30555666777': {
        cuit: '30555666777',
        razonSocial: 'SERVICIOS DISCONTINUADOS S.R.L.',
        estado: 'INACTIVO', // PROBLEMA GRAVE
        situacionFiscal: {
            iva: 'RESPONSABLE_INSCRIPTO',
            ganancias: 'INSCRIPTO',
            monotributo: 'NO_INSCRIPTO'
        },
        domicilio: {
            direccion: 'DIRECCION ANTERIOR',
            localidad: 'DESCONOCIDA',
            provincia: 'SIN DATOS'
        },
        actividades: [
            {
                codigo: 620200,
                descripcion: 'CONSULTORIA INFORMATICA',
                principal: true
            }
        ],
        tipo: 'JURIDICA',
        problemas: {
            contribuyenteInactivo: true,
            obligacionesPendientes: true,
            domicilioDesactualizado: true
        },
        fechaInactivacion: '2024-06-15',
        obligacionesPendientes: [
            {
                tipo: 'DDJJ_IVA',
                periodo: '2024-06',
                vencimiento: '2024-07-21'
            },
            {
                tipo: 'DDJJ_GANANCIAS',
                periodo: '2024',
                vencimiento: '2024-05-31'
            }
        ]
    },

    // Caso 4: Responsable inscripto con problemas múltiples
    '30777888999': {
        cuit: '30777888999',
        razonSocial: 'CONSTRUCTORA IRREGULAR S.A.',
        estado: 'ACTIVO',
        situacionFiscal: {
            iva: 'RESPONSABLE_INSCRIPTO',
            ganancias: 'INSCRIPTO',
            monotributo: 'NO_INSCRIPTO'
        },
        domicilio: {
            direccion: 'OBRA EN CONSTRUCCION S/N',
            localidad: 'LOCALIDAD TEMPORAL',
            provincia: 'BUENOS AIRES'
        },
        actividades: [
            {
                codigo: 421000,
                descripcion: 'CONSTRUCCION DE EDIFICIOS RESIDENCIALES',
                principal: true
            }
        ],
        tipo: 'JURIDICA',
        problemas: {
            declaracionesAtrasadas: true,
            multasPendientes: true,
            domicilioTemporal: true,
            empleadosEnNegro: true
        },
        multas: [
            {
                tipo: 'PRESENTACION_TARDIA',
                monto: 25000,
                fecha: '2024-11-15'
            },
            {
                tipo: 'OMISION_DECLARACION',
                monto: 50000,
                fecha: '2024-10-20'
            }
        ],
        empleadosDeclarados: 5,
        empleadosDetectados: 12 // Inconsistencia detectada
    }
};

// Función para calcular compliance score problemático
export function calculateProblematicCompliance(taxpayerData) {
    let score = 100;
    const issues = [];
    const alerts = [];

    // Verificar estado del contribuyente
    if (taxpayerData.estado !== 'ACTIVO') {
        score -= 40;
        issues.push('Contribuyente inactivo');
        alerts.push({
            type: 'CRITICAL',
            code: 'INACTIVE_TAXPAYER',
            message: 'Contribuyente marcado como INACTIVO en AFIP',
            priority: 'ALTA',
            actions: ['Regularizar situación fiscal', 'Contactar AFIP']
        });
    }

    // Verificar actividades registradas
    if (!taxpayerData.actividades || taxpayerData.actividades.length === 0) {
        score -= 25;
        issues.push('Sin actividades registradas');
        alerts.push({
            type: 'HIGH',
            code: 'NO_ACTIVITIES',
            message: 'No hay actividades económicas registradas',
            priority: 'ALTA',
            actions: ['Registrar actividades en F.420', 'Actualizar datos en AFIP']
        });
    }

    // Verificar domicilio
    if (taxpayerData.domicilio.direccion.includes('SIN') ||
        taxpayerData.domicilio.direccion.includes('DESCONOCIDA') ||
        taxpayerData.domicilio.direccion.includes('TEMPORAL')) {
        score -= 15;
        issues.push('Domicilio desactualizado');
        alerts.push({
            type: 'MEDIUM',
            code: 'OUTDATED_ADDRESS',
            message: 'Domicilio fiscal desactualizado o incompleto',
            priority: 'MEDIA',
            actions: ['Actualizar domicilio fiscal', 'Presentar F.460']
        });
    }

    // Verificar problemas específicos
    if (taxpayerData.problemas) {
        const { problemas } = taxpayerData;

        if (problemas.declaracionesVencidas || problemas.declaracionesAtrasadas) {
            score -= 20;
            issues.push('Declaraciones vencidas');
            alerts.push({
                type: 'HIGH',
                code: 'OVERDUE_DECLARATIONS',
                message: 'Declaraciones juradas vencidas o atrasadas',
                priority: 'ALTA',
                actions: ['Presentar DDJJ pendientes', 'Regularizar situación']
            });
        }

        if (problemas.deudaVencida) {
            score -= 15;
            issues.push('Deuda vencida');
            alerts.push({
                type: 'HIGH',
                code: 'OVERDUE_DEBT',
                message: `Deuda vencida por $${taxpayerData.deudaVencida?.monto || 0}`,
                priority: 'ALTA',
                actions: ['Cancelar deuda', 'Solicitar plan de pagos']
            });
        }

        if (problemas.recategorizacionVencida) {
            score -= 10;
            issues.push('Recategorización pendiente');
            alerts.push({
                type: 'MEDIUM',
                code: 'RECATEGORIZATION_PENDING',
                message: 'Recategorización de monotributo vencida',
                priority: 'MEDIA',
                actions: ['Recategorizar monotributo', 'Verificar ingresos']
            });
        }

        if (problemas.multasPendientes) {
            score -= 12;
            issues.push('Multas pendientes');
            alerts.push({
                type: 'HIGH',
                code: 'PENDING_FINES',
                message: 'Multas pendientes de pago',
                priority: 'ALTA',
                actions: ['Revisar multas', 'Gestionar descuentos', 'Efectuar pagos']
            });
        }

        if (problemas.empleadosEnNegro) {
            score -= 30;
            issues.push('Inconsistencia en empleados');
            alerts.push({
                type: 'CRITICAL',
                code: 'EMPLOYEE_DISCREPANCY',
                message: 'Discrepancia entre empleados declarados y detectados',
                priority: 'CRITICA',
                actions: ['Regularizar empleados', 'Blanquear relaciones laborales']
            });
        }
    }

    // Verificar monotributo
    if (taxpayerData.monotributo?.recategorizacionPendiente) {
        score -= 8;
        issues.push('Recategorización monotributo pendiente');
        alerts.push({
            type: 'MEDIUM',
            code: 'MONOTRIBUTO_RECATEGORIZATION',
            message: 'Debe recategorizar monotributo por superar ingresos',
            priority: 'MEDIA',
            actions: ['Recategorizar a categoría superior', 'Evaluar cambio a RI']
        });
    }

    return {
        score: Math.max(score, 0),
        status: score >= 80 ? 'GOOD' : score >= 60 ? 'WARNING' : 'CRITICAL',
        issues,
        alerts,
        riskLevel: score < 50 ? 'ALTO' : score < 75 ? 'MEDIO' : 'BAJO'
    };
}

// Función para generar alertas automáticas
export function generateAutomaticAlerts(taxpayerData) {
    const alerts = [];
    const currentDate = new Date();

    // Alerta por contribuyente inactivo
    if (taxpayerData.estado === 'INACTIVO') {
        alerts.push({
            id: `INACTIVE_${taxpayerData.cuit}`,
            type: 'compliance',
            severity: 'critical',
            title: 'Contribuyente Inactivo',
            message: `${taxpayerData.razonSocial} (${taxpayerData.cuit}) está marcado como INACTIVO`,
            timestamp: currentDate.toISOString(),
            resolved: false,
            actions: ['Regularizar situación', 'Contactar AFIP'],
            affectedEntity: {
                cuit: taxpayerData.cuit,
                razonSocial: taxpayerData.razonSocial
            }
        });
    }

    // Alerta por deuda vencida
    if (taxpayerData.deudaVencida) {
        alerts.push({
            id: `DEBT_${taxpayerData.cuit}`,
            type: 'financial',
            severity: 'high',
            title: 'Deuda Vencida',
            message: `Deuda vencida de $${taxpayerData.deudaVencida.monto} desde ${taxpayerData.deudaVencida.vencimiento}`,
            timestamp: currentDate.toISOString(),
            resolved: false,
            actions: ['Cancelar deuda', 'Solicitar plan de pagos'],
            affectedEntity: {
                cuit: taxpayerData.cuit,
                razonSocial: taxpayerData.razonSocial
            }
        });
    }

    // Alerta por multas pendientes
    if (taxpayerData.multas && taxpayerData.multas.length > 0) {
        const totalMultas = taxpayerData.multas.reduce((sum, multa) => sum + multa.monto, 0);
        alerts.push({
            id: `FINES_${taxpayerData.cuit}`,
            type: 'compliance',
            severity: 'high',
            title: 'Multas Pendientes',
            message: `${taxpayerData.multas.length} multas pendientes por un total de $${totalMultas}`,
            timestamp: currentDate.toISOString(),
            resolved: false,
            actions: ['Revisar multas', 'Gestionar descuentos'],
            affectedEntity: {
                cuit: taxpayerData.cuit,
                razonSocial: taxpayerData.razonSocial
            }
        });
    }

    // Alerta por empleados en negro
    if (taxpayerData.empleadosDetectados > taxpayerData.empleadosDeclarados) {
        alerts.push({
            id: `EMPLOYEES_${taxpayerData.cuit}`,
            type: 'labor',
            severity: 'critical',
            title: 'Discrepancia en Empleados',
            message: `Detectados ${taxpayerData.empleadosDetectados} empleados, declarados ${taxpayerData.empleadosDeclarados}`,
            timestamp: currentDate.toISOString(),
            resolved: false,
            actions: ['Regularizar empleados', 'Blanquear relaciones laborales'],
            affectedEntity: {
                cuit: taxpayerData.cuit,
                razonSocial: taxpayerData.razonSocial
            }
        });
    }

    return alerts;
}

// Actualizar función principal para incluir casos problemáticos
export function getProblematicTaxpayerInfo(cuit) {
    console.log(`🔍 Buscando CUIT problemático: ${cuit}`);

    const taxpayer = PROBLEMATIC_TAXPAYERS[cuit];

    if (taxpayer) {
        console.log(`⚠️ CUIT problemático encontrado: ${taxpayer.razonSocial}`);

        // Generar alertas automáticas
        const alerts = generateAutomaticAlerts(taxpayer);

        return {
            ...taxpayer,
            fechaUltimaActualizacion: new Date().toISOString(),
            fuente: 'MOCK_PROBLEMATIC',
            alertasGeneradas: alerts
        };
    }

    return null;
}

// Lista de CUITs problemáticos para testing
export const PROBLEMATIC_TEST_CUITS = Object.keys(PROBLEMATIC_TAXPAYERS);

// Función para obtener resumen de casos problemáticos
export function getProblematicSummary() {
    const taxpayers = Object.values(PROBLEMATIC_TAXPAYERS);

    return {
        total: taxpayers.length,
        criticos: taxpayers.filter(t => t.estado === 'INACTIVO').length,
        conDeuda: taxpayers.filter(t => t.deudaVencida).length,
        conMultas: taxpayers.filter(t => t.multas).length,
        cuits: PROBLEMATIC_TEST_CUITS,
        ejemplos: [
            {
                cuit: '20111222333',
                descripcion: 'Múltiples problemas - Sin actividades, domicilio desactualizado, deuda vencida'
            },
            {
                cuit: '27999888777',
                descripcion: 'Monotributo con recategorización pendiente'
            },
            {
                cuit: '30555666777',
                descripcion: 'Contribuyente inactivo con obligaciones pendientes'
            },
            {
                cuit: '30777888999',
                descripcion: 'Responsable inscripto con multas y empleados en negro'
            }
        ]
    };
}