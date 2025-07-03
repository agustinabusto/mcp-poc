// Mock con datos reales de AFIP para testing y POC
export const REALISTIC_TAXPAYERS = {
    // AFIP - Organismo público
    '30500010912': {
        cuit: '30500010912',
        razonSocial: 'AFIP - ADMINISTRACION FEDERAL DE INGRESOS PUBLICOS',
        estado: 'ACTIVO',
        situacionFiscal: {
            iva: 'EXENTO',
            ganancias: 'EXENTO',
            monotributo: 'NO_INSCRIPTO'
        },
        domicilio: {
            direccion: 'HIPOLITO YRIGOYEN 370',
            localidad: 'CIUDAD AUTONOMA BUENOS AIRES',
            provincia: 'CIUDAD AUTONOMA BUENOS AIRES'
        },
        actividades: [
            {
                codigo: 751110,
                descripcion: 'ADMINISTRACION PUBLICA EN GENERAL',
                principal: true
            }
        ],
        tipo: 'JURIDICA'
    },

    // Persona física - Monotributo
    '27230938607': {
        cuit: '27230938607',
        razonSocial: 'GARCIA MARIA ELENA',
        estado: 'ACTIVO',
        situacionFiscal: {
            iva: 'MONOTRIBUTO',
            ganancias: 'NO_INSCRIPTO',
            monotributo: 'INSCRIPTO'
        },
        domicilio: {
            direccion: 'AV CORRIENTES 1234',
            localidad: 'CIUDAD AUTONOMA BUENOS AIRES',
            provincia: 'CIUDAD AUTONOMA BUENOS AIRES'
        },
        actividades: [
            {
                codigo: 479999,
                descripcion: 'VENTA AL POR MENOR N.C.P.',
                principal: true
            }
        ],
        tipo: 'FISICA'
    },

    // Empresa - Responsable Inscripto
    '20123456789': {
        cuit: '20123456789',
        razonSocial: 'RODRIGUEZ JUAN CARLOS',
        estado: 'ACTIVO',
        situacionFiscal: {
            iva: 'RESPONSABLE_INSCRIPTO',
            ganancias: 'INSCRIPTO',
            monotributo: 'NO_INSCRIPTO'
        },
        domicilio: {
            direccion: 'AV SANTA FE 2450',
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
        tipo: 'FISICA'
    },

    // Empresa tecnológica
    '30123456789': {
        cuit: '30123456789',
        razonSocial: 'SNARX TECNOLOGIA S.A.',
        estado: 'ACTIVO',
        situacionFiscal: {
            iva: 'RESPONSABLE_INSCRIPTO',
            ganancias: 'INSCRIPTO',
            monotributo: 'NO_INSCRIPTO'
        },
        domicilio: {
            direccion: 'AV CORRIENTES 5000',
            localidad: 'CIUDAD AUTONOMA BUENOS AIRES',
            provincia: 'CIUDAD AUTONOMA BUENOS AIRES'
        },
        actividades: [
            {
                codigo: 620100,
                descripcion: 'PROGRAMACION INFORMATICA',
                principal: true
            },
            {
                codigo: 620200,
                descripcion: 'CONSULTORIA INFORMATICA',
                principal: false
            }
        ],
        tipo: 'JURIDICA'
    }
};

// Función para obtener datos mock realistas
export function getRealisticTaxpayerInfo(cuit) {
    console.log(`🔍 Buscando CUIT: ${cuit} en datos mock realistas`);

    const taxpayer = REALISTIC_TAXPAYERS[cuit];

    if (taxpayer) {
        console.log(`✅ CUIT encontrado: ${taxpayer.razonSocial}`);
        return {
            ...taxpayer,
            fechaUltimaActualizacion: new Date().toISOString(),
            fuente: 'MOCK_REALISTIC'
        };
    }

    console.log(`⚠️ CUIT no encontrado en datos mock, generando fallback`);
    // Fallback para CUITs no conocidos
    return generateFallbackTaxpayer(cuit);
}

// Generar datos fallback para CUITs no conocidos
function generateFallbackTaxpayer(cuit) {
    // Determinar tipo por prefijo CUIT
    const prefix = cuit.substring(0, 2);
    let tipo = 'FISICA';
    let situacion = 'MONOTRIBUTO';

    if (prefix === '30' || prefix === '33') {
        tipo = 'JURIDICA';
        situacion = 'RESPONSABLE_INSCRIPTO';
    }

    return {
        cuit,
        razonSocial: tipo === 'JURIDICA'
            ? `EMPRESA ${cuit.substring(2, 8)} S.A.`
            : `CONTRIBUYENTE ${cuit.substring(2, 8)}`,
        estado: 'ACTIVO',
        situacionFiscal: {
            iva: situacion,
            ganancias: situacion === 'RESPONSABLE_INSCRIPTO' ? 'INSCRIPTO' : 'NO_INSCRIPTO',
            monotributo: situacion === 'MONOTRIBUTO' ? 'INSCRIPTO' : 'NO_INSCRIPTO'
        },
        domicilio: {
            direccion: 'AV CORRIENTES 1234',
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
        tipo,
        fechaUltimaActualizacion: new Date().toISOString(),
        fuente: 'MOCK_GENERATED'
    };
}

// Lista de CUITs disponibles para testing
export const AVAILABLE_TEST_CUITS = Object.keys(REALISTIC_TAXPAYERS);

// Función para obtener estadísticas
export function getMockStats() {
    const taxpayers = Object.values(REALISTIC_TAXPAYERS);

    return {
        total: taxpayers.length,
        activos: taxpayers.filter(t => t.estado === 'ACTIVO').length,
        disponibles: AVAILABLE_TEST_CUITS
    };
}