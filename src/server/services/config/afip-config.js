// src/server/config/afip-config.js
export const afipConfig = {
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    certificates: {
        cert: process.env.AFIP_CERT_PATH,
        key: process.env.AFIP_KEY_PATH,
        passphrase: process.env.AFIP_PASSPHRASE
    },
    cuitRepresentada: process.env.AFIP_CUIT_REPRESENTADA,
    services: {
        wsaa: process.env.NODE_ENV === 'production'
            ? 'https://servicios1.afip.gov.ar/wsaa/service.asmx'
            : 'https://wswhomo.afip.gov.ar/wsaa/service.asmx',
        padron: process.env.NODE_ENV === 'production'
            ? 'https://servicios1.afip.gov.ar/ws_sr_padron_a4/service.asmx'
            : 'https://wswhomo.afip.gov.ar/ws_sr_padron_a4/service.asmx'
    }
};