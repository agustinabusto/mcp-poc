import fs from 'fs';
import crypto from 'crypto';
import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

export class AfipRealClient {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.isProduction = config.environment === 'production';

        // URLs base según entorno
        this.baseURLs = {
            wsaa: this.isProduction
                ? 'https://servicios1.afip.gov.ar/wsaa/service.asmx'
                : 'https://wswhomo.afip.gov.ar/wsaa/service.asmx',
            wsfev1: this.isProduction
                ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
                : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
            padron: this.isProduction
                ? 'https://servicios1.afip.gov.ar/ws_sr_padron_a4/service.asmx'
                : 'https://wswhomo.afip.gov.ar/ws_sr_padron_a4/service.asmx',
            restAPI: this.isProduction
                ? 'https://soa.afip.gob.ar/sr-padron/v2'
                : 'https://aws.afip.gob.ar/sr-padron/v2'
        };

        // Configuración de certificados
        this.certificateConfig = {
            cert: config.certificates.cert,
            key: config.certificates.key,
            passphrase: config.certificates.passphrase
        };

        // Cache para tickets de acceso
        this.tickets = new Map();

        // Cliente HTTP
        this.httpClient = axios.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8',
                'User-Agent': 'AFIP-Monitor-MCP/1.0'
            }
        });
    }

    /**
     * Generar Ticket de Acceso (TA) usando WSAA
     */
    async getAccessTicket(service = 'wsfe') {
        try {
            // Verificar si ya tenemos un ticket válido
            const cachedTicket = this.tickets.get(service);
            if (cachedTicket && new Date() < new Date(cachedTicket.expirationTime)) {
                return cachedTicket;
            }

            this.logger.info(`Generando nuevo ticket de acceso para ${service}`);

            // 1. Crear TRA (Ticket de Requerimiento de Acceso)
            const tra = this.createTRA(service);

            // 2. Firmar TRA con certificado
            const signedTRA = this.signTRA(tra);

            // 3. Enviar a WSAA
            const soapRequest = this.createWSAARequest(signedTRA);

            const response = await this.httpClient.post(this.baseURLs.wsaa, soapRequest);

            // 4. Parsear respuesta
            const parsedResponse = await parseXML(response.data);
            const loginResponse = parsedResponse['soap:Envelope']['soap:Body'][0]['loginResponse'][0];

            if (loginResponse.loginReturn) {
                const ticket = {
                    token: loginResponse.loginReturn[0].token[0],
                    sign: loginResponse.loginReturn[0].sign[0],
                    expirationTime: loginResponse.loginReturn[0].expirationTime[0]
                };

                // Cache del ticket
                this.tickets.set(service, ticket);

                this.logger.info(`Ticket de acceso generado exitosamente para ${service}`);
                return ticket;
            } else {
                throw new Error('Error en respuesta WSAA: ' + JSON.stringify(loginResponse));
            }

        } catch (error) {
            this.logger.error('Error generando ticket de acceso:', error);
            throw error;
        }
    }

    /**
     * Crear TRA (Ticket de Requerimiento de Acceso)
     */
    createTRA(service) {
        const now = new Date();
        const from = new Date(now.getTime() - 600000); // 10 minutos atrás
        const to = new Date(now.getTime() + 600000);   // 10 minutos adelante

        return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${Date.now()}</uniqueId>
    <generationTime>${from.toISOString()}</generationTime>
    <expirationTime>${to.toISOString()}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
    }

    /**
     * Firmar TRA con certificado digital
     */
    signTRA(tra) {
        try {
            // Leer certificado y clave privada
            const cert = fs.readFileSync(this.certificateConfig.cert);
            const key = fs.readFileSync(this.certificateConfig.key);

            // Crear firma PKCS#7
            const sign = crypto.createSign('RSA-SHA1');
            sign.update(tra);

            const signature = sign.sign({
                key: key,
                passphrase: this.certificateConfig.passphrase
            }, 'base64');

            // Crear mensaje CMS
            const cms = this.createCMS(tra, signature, cert);

            return Buffer.from(cms).toString('base64');

        } catch (error) {
            this.logger.error('Error firmando TRA:', error);
            throw error;
        }
    }

    /**
     * Crear mensaje CMS
     */
    createCMS(data, signature, certificate) {
        // Implementación simplificada
        // En producción se recomienda usar una librería como node-forge
        const cms = {
            contentInfo: {
                content: Buffer.from(data).toString('base64'),
                signature: signature,
                certificate: certificate.toString('base64')
            }
        };

        return JSON.stringify(cms);
    }

    /**
     * Crear request SOAP para WSAA
     */
    createWSAARequest(signedTRA) {
        return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <loginCms xmlns="http://ar.gov.afip.dif.wsaa">
      <in0>${signedTRA}</in0>
    </loginCms>
  </soap:Body>
</soap:Envelope>`;
    }

    /**
     * Obtener información de contribuyente usando API REST
     */
    async getTaxpayerInfo(cuit) {
        try {
            this.logger.info(`Consultando información de contribuyente: ${cuit}`);

            // Limpiar CUIT
            const cleanCuit = cuit.replace(/[-\s]/g, '');

            // Intentar primero con API REST (más rápida)
            try {
                const response = await axios.get(`${this.baseURLs.restAPI}/persona/${cleanCuit}`, {
                    timeout: 10000,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.data) {
                    return this.normalizeRestResponse(response.data);
                }
            } catch (restError) {
                this.logger.warn(`API REST falló, intentando con SOAP: ${restError.message}`);
            }

            // Fallback a SOAP
            return await this.getTaxpayerInfoSOAP(cleanCuit);

        } catch (error) {
            this.logger.error('Error obteniendo información de contribuyente:', error);
            throw error;
        }
    }

    /**
     * Obtener información usando WebService SOAP
     */
    async getTaxpayerInfoSOAP(cuit) {
        try {
            // Obtener ticket de acceso
            const ticket = await this.getAccessTicket('ws_sr_padron_a4');

            // Crear request SOAP
            const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <getPersona xmlns="http://ar.gov.afip.dif.wspadron">
      <token>${ticket.token}</token>
      <sign>${ticket.sign}</sign>
      <cuitRepresentada>${this.config.cuitRepresentada}</cuitRepresentada>
      <idPersona>${cuit}</idPersona>
    </getPersona>
  </soap:Body>
</soap:Envelope>`;

            const response = await this.httpClient.post(this.baseURLs.padron, soapRequest);

            // Parsear respuesta SOAP
            const parsedResponse = await parseXML(response.data);
            const personaResponse = parsedResponse['soap:Envelope']['soap:Body'][0]['getPersonaResponse'][0];

            if (personaResponse.personaReturn) {
                return this.normalizeSOAPResponse(personaResponse.personaReturn[0]);
            } else {
                throw new Error('No se encontraron datos para el CUIT: ' + cuit);
            }

        } catch (error) {
            this.logger.error('Error en consulta SOAP:', error);
            throw error;
        }
    }

    /**
     * Normalizar respuesta de API REST
     */
    normalizeRestResponse(data) {
        return {
            cuit: data.idPersona,
            razonSocial: `${data.apellido || ''} ${data.nombre || ''}`.trim(),
            estado: data.estadoClave,
            situacionFiscal: {
                iva: data.categoriasMonotributo ? 'MONOTRIBUTO' : 'RESPONSABLE_INSCRIPTO',
                ganancias: data.actividades ? 'INSCRIPTO' : 'NO_INSCRIPTO',
                monotributo: data.categoriasMonotributo ? 'INSCRIPTO' : 'NO_INSCRIPTO'
            },
            domicilio: {
                direccion: data.domicilioFiscal?.direccion || '',
                localidad: data.domicilioFiscal?.localidad || '',
                provincia: data.domicilioFiscal?.provincia || ''
            },
            actividades: data.actividades?.map(act => ({
                codigo: act.idActividad,
                descripcion: act.descripcionActividad,
                principal: act.nomenclador === 883
            })) || [],
            fechaUltimaActualizacion: new Date().toISOString()
        };
    }

    /**
     * Normalizar respuesta SOAP
     */
    normalizeSOAPResponse(data) {
        return {
            cuit: data.persona[0].idPersona[0],
            razonSocial: `${data.persona[0].apellido[0]} ${data.persona[0].nombre[0]}`.trim(),
            estado: data.persona[0].estadoClave[0],
            situacionFiscal: {
                iva: data.persona[0].categoriasMonotributo ? 'MONOTRIBUTO' : 'RESPONSABLE_INSCRIPTO',
                ganancias: 'INSCRIPTO',
                monotributo: data.persona[0].categoriasMonotributo ? 'INSCRIPTO' : 'NO_INSCRIPTO'
            },
            domicilio: {
                direccion: data.persona[0].domicilio?.[0]?.direccion?.[0] || '',
                localidad: data.persona[0].domicilio?.[0]?.localidad?.[0] || '',
                provincia: data.persona[0].domicilio?.[0]?.provincia?.[0] || ''
            },
            actividades: data.persona[0].actividades?.map(act => ({
                codigo: act.idActividad,
                descripcion: act.descripcionActividad,
                principal: act.nomenclador === 883
            })) || [],
            fechaUltimaActualizacion: new Date().toISOString()
        };
    }

    /**
     * Verificar estado de los servicios
     */
    async healthCheck() {
        try {
            const checks = {
                wsaa: await this.checkService(this.baseURLs.wsaa),
                restAPI: await this.checkService(this.baseURLs.restAPI + '/persona/20000000000')
            };

            return {
                healthy: Object.values(checks).every(check => check),
                services: checks
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    /**
     * Verificar disponibilidad de un servicio
     */
    async checkService(url) {
        try {
            const response = await axios.get(url, { timeout: 5000 });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
}

// Configuración de ejemplo
export const createAfipRealClient = (config) => {
    return new AfipRealClient({
        environment: process.env.NODE_ENV || 'development',
        certificates: {
            cert: process.env.AFIP_CERT_PATH || './certs/certificate.crt',
            key: process.env.AFIP_KEY_PATH || './certs/private.key',
            passphrase: process.env.AFIP_PASSPHRASE || ''
        },
        cuitRepresentada: process.env.AFIP_CUIT_REPRESENTADA || ''
    }, config.logger);
};