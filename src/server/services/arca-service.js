/**
 * ARCA Service - Servicio principal para integración con ARCA/AFIP
 * Maneja autenticación WSAA, WSFEV1, WSMTXCA
 */

import axios from 'axios';
import { parseString, Builder } from 'xml2js';
import { readFile } from 'fs/promises';
import crypto from 'crypto';
import { Logger } from '../../../../utils/logger.js';

const logger = new Logger('ARCAService');

export class ARCAService {
    constructor(config, cacheService) {
        this.config = config;
        this.cacheService = cacheService;

        // Service URLs based on environment
        this.urls = this.getServiceUrls();

        // HTTP clients
        this.clients = this.initializeClients();

        // XML Builder for SOAP requests
        this.xmlBuilder = new Builder({
            rootName: 'soapenv:Envelope',
            xmldec: { version: '1.0', encoding: 'utf-8' },
            renderOpts: { pretty: false }
        });

        // Certificate and key content
        this.certificateContent = null;
        this.privateKeyContent = null;

        logger.info('ARCAService initialized', {
            environment: config.ARCA_ENVIRONMENT,
            cuit: config.ARCA_CUIT
        });
    }

    /**
     * Get service URLs based on environment
     */
    getServiceUrls() {
        const isProduction = this.config.ARCA_ENVIRONMENT === 'produccion';

        return {
            wsaa: isProduction
                ? 'https://wsaa.afip.gov.ar/ws/services/LoginService'
                : 'https://wsaahomo.afip.gov.ar/ws/services/LoginService',
            wsfev1: isProduction
                ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
                : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
            wsmtxca: isProduction
                ? 'https://serviciosjava.afip.gob.ar/wsmtxca/services/MTXCAService'
                : 'https://fwshomo.afip.gov.ar/wsmtxca/services/MTXCAService'
        };
    }

    /**
     * Initialize HTTP clients
     */
    initializeClients() {
        const commonConfig = {
            timeout: this.config.REQUEST_TIMEOUT_MS || 30000,
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'User-Agent': 'afip-monitor-mcp/1.0.0',
                'SOAPAction': ''
            }
        };

        const clients = {
            wsaa: axios.create({ ...commonConfig, baseURL: this.urls.wsaa }),
            wsfev1: axios.create({ ...commonConfig, baseURL: this.urls.wsfev1 }),
            wsmtxca: axios.create({ ...commonConfig, baseURL: this.urls.wsmtxca })
        };

        // Add interceptors for logging and retry logic
        Object.entries(clients).forEach(([name, client]) => {
            this.setupClientInterceptors(client, name);
        });

        return clients;
    }

    /**
     * Setup interceptors for HTTP clients
     */
    setupClientInterceptors(client, serviceName) {
        // Request interceptor
        client.interceptors.request.use(
            (config) => {
                logger.debug(`${serviceName.toUpperCase()} Request`, {
                    method: config.method?.toUpperCase(),
                    url: config.url,
                    headers: config.headers
                });
                return config;
            },
            (error) => {
                logger.error(`${serviceName.toUpperCase()} Request Error`, { error: error.message });
                return Promise.reject(error);
            }
        );

        // Response interceptor
        client.interceptors.response.use(
            (response) => {
                logger.debug(`${serviceName.toUpperCase()} Response`, {
                    status: response.status,
                    statusText: response.statusText
                });
                return response;
            },
            (error) => {
                logger.error(`${serviceName.toUpperCase()} Response Error`, {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    message: error.message
                });
                return Promise.reject(error);
            }
        );
    }

    /**
     * Initialize service - load certificates
     */
    async initialize() {
        try {
            await this.loadCertificates();
            logger.info('ARCAService initialized successfully');
        } catch (error) {
            logger.error('ARCAService initialization failed', { error });
            throw error;
        }
    }

    /**
     * Load certificates from file or environment
     */
    async loadCertificates() {
        try {
            if (this.config.ARCA_CERT_CONTENT && this.config.ARCA_KEY_CONTENT) {
                this.certificateContent = this.config.ARCA_CERT_CONTENT;
                this.privateKeyContent = this.config.ARCA_KEY_CONTENT;
                logger.info('Certificates loaded from environment variables');
            } else if (this.config.ARCA_CERT_PATH && this.config.ARCA_KEY_PATH) {
                this.certificateContent = await readFile(this.config.ARCA_CERT_PATH, 'utf8');
                this.privateKeyContent = await readFile(this.config.ARCA_KEY_PATH, 'utf8');
                logger.info('Certificates loaded from files');
            } else {
                throw new Error('No certificate configuration found');
            }
        } catch (error) {
            logger.error('Failed to load certificates', { error });
            throw new Error(`Certificate loading failed: ${error.message}`);
        }
    }

    /**
     * WSAA Authentication - Get token for service
     */
    async authenticateWSAA(service = 'wsfe') {
        const cacheKey = `wsaa_token_${service}`;
        const cachedToken = this.cacheService.get(cacheKey);

        if (cachedToken && !this.isTokenExpired(cachedToken)) {
            logger.debug('Using cached WSAA token', { service });
            return cachedToken;
        }

        try {
            logger.info('Requesting new WSAA token', { service });

            // Create Login Ticket Request
            const loginTicketRequest = this.createLoginTicketRequest(service);

            // Sign the request (simplified - in production use proper CMS signing)
            const cms = await this.signLoginTicketRequest(loginTicketRequest);

            // Build SOAP request
            const soapRequest = this.buildWSAALoginRequest(cms);

            // Make request
            const response = await this.clients.wsaa.post('/LoginCms', soapRequest);

            // Parse response
            const token = await this.parseWSAAResponse(response.data);

            // Cache token with buffer for expiry
            const expiryTime = new Date(token.expirationTime);
            const bufferHours = this.config.TOKEN_EXPIRY_BUFFER_HOURS || 1;
            const cacheExpiryTime = new Date(expiryTime.getTime() - (bufferHours * 60 * 60 * 1000));
            const ttl = Math.max(0, Math.floor((cacheExpiryTime.getTime() - Date.now()) / 1000));

            this.cacheService.set(cacheKey, token, ttl);

            logger.info('WSAA token obtained successfully', {
                service,
                expiresAt: token.expirationTime
            });

            return token;
        } catch (error) {
            logger.error('WSAA authentication failed', { service, error });
            throw error;
        }
    }

    /**
     * Create Login Ticket Request XML
     */
    createLoginTicketRequest(service) {
        const now = new Date();
        const expiry = new Date(now.getTime() + (12 * 60 * 60 * 1000)); // 12 hours

        const formatDate = (date) => {
            return date.toISOString().replace('Z', '-03:00');
        };

        return `<?xml version="1.0" encoding="UTF-8"?>
      <loginTicketRequest version="1.0">
        <header>
          <uniqueId>${Date.now()}</uniqueId>
          <generationTime>${formatDate(now)}</generationTime>
          <expirationTime>${formatDate(expiry)}</expirationTime>
        </header>
        <service>${service}</service>
      </loginTicketRequest>`;
    }

    /**
     * Sign Login Ticket Request (simplified implementation)
     */
    async signLoginTicketRequest(loginTicketRequest) {
        try {
            // Create a hash of the login ticket request
            const hash = crypto.createHash('sha256');
            hash.update(loginTicketRequest);
            const hashedRequest = hash.digest('base64');

            // In a real implementation, you would use proper CMS signing
            // For now, we'll return a base64 encoded version
            return Buffer.from(loginTicketRequest).toString('base64');
        } catch (error) {
            logger.error('Failed to sign login ticket request', { error });
            throw error;
        }
    }

    /**
     * Build WSAA Login SOAP Request
     */
    buildWSAALoginRequest(cms) {
        return `<?xml version="1.0" encoding="utf-8"?>
      <soapenv:Envelope 
        xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
        xmlns:ser="http://ar.gov.afip.dif.FEV1/">
        <soapenv:Header/>
        <soapenv:Body>
          <ser:loginCms>
            <ser:in0>${cms}</ser:in0>
          </ser:loginCms>
        </soapenv:Body>
      </soapenv:Envelope>`;
    }

    /**
     * Parse WSAA Response
     */
    async parseWSAAResponse(xmlData) {
        return new Promise((resolve, reject) => {
            parseString(xmlData, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }

                try {
                    const body = result['soapenv:Envelope']['soapenv:Body'][0];
                    const loginResponse = body['ns1:loginCmsResponse'][0];
                    const loginReturn = loginResponse['ns1:loginCmsReturn'][0];

                    // Parse the inner XML response
                    parseString(loginReturn, (innerErr, innerResult) => {
                        if (innerErr) {
                            reject(innerErr);
                            return;
                        }

                        const credentials = innerResult.loginTicketResponse.credentials[0];
                        const token = {
                            token: credentials.token[0],
                            sign: credentials.sign[0],
                            expirationTime: credentials.expirationTime[0]
                        };

                        resolve(token);
                    });
                } catch (parseError) {
                    reject(parseError);
                }
            });
        });
    }

    /**
     * Check if token is expired
     */
    isTokenExpired(token) {
        const expiryTime = new Date(token.expirationTime);
        const bufferTime = new Date(expiryTime.getTime() - (60 * 60 * 1000)); // 1 hour buffer
        return bufferTime <= new Date();
    }

    /**
     * WSFEV1 - Solicitar CAE
     */
    async solicitarCAE(request) {
        const token = await this.authenticateWSAA('wsfe');

        try {
            const soapRequest = this.buildFECAESolicitarRequest(token, request);
            const response = await this.clients.wsfev1.post('?op=FECAESolicitar', soapRequest);

            return await this.parseFECAEResponse(response.data);
        } catch (error) {
            logger.error('FECAESolicitar failed', { error, request });
            throw error;
        }
    }

    /**
     * Build FECAE Solicitar SOAP Request
     */
    buildFECAESolicitarRequest(token, request) {
        const { FeCabReq, FeDetReq } = request.FeCAEReq;

        return `<?xml version="1.0" encoding="utf-8"?>
      <soapenv:Envelope 
        xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
        xmlns:ar="http://ar.gov.afip.dif.FEV1/">
        <soapenv:Header/>
        <soapenv:Body>
          <ar:FECAESolicitar>
            <ar:Auth>
              <ar:Token>${token.token}</ar:Token>
              <ar:Sign>${token.sign}</ar:Sign>
              <ar:Cuit>${this.config.ARCA_CUIT}</ar:Cuit>
            </ar:Auth>
            <ar:FeCAEReq>
              <ar:FeCabReq>
                <ar:CantReg>${FeCabReq.CantReg}</ar:CantReg>
                <ar:PtoVta>${FeCabReq.PtoVta}</ar:PtoVta>
                <ar:CbteTipo>${FeCabReq.CbteTipo}</ar:CbteTipo>
              </ar:FeCabReq>
              <ar:FeDetReq>
                ${FeDetReq.map(detalle => this.buildFECAEDetalle(detalle)).join('')}
              </ar:FeDetReq>
            </ar:FeCAEReq>
          </ar:FECAESolicitar>
        </soapenv:Body>
      </soapenv:Envelope>`;
    }

    /**
     * Build FECAE Detalle XML
     */
    buildFECAEDetalle(detalle) {
        return `
      <ar:FECAEDetRequest>
        <ar:Concepto>${detalle.Concepto}</ar:Concepto>
        <ar:DocTipo>${detalle.DocTipo}</ar:DocTipo>
        <ar:DocNro>${detalle.DocNro}</ar:DocNro>
        <ar:CbteDesde>${detalle.CbteDesde}</ar:CbteDesde>
        <ar:CbteHasta>${detalle.CbteHasta}</ar:CbteHasta>
        <ar:CbteFch>${detalle.CbteFch}</ar:CbteFch>
        <ar:ImpTotal>${detalle.ImpTotal}</ar:ImpTotal>
        <ar:ImpTotConc>${detalle.ImpTotConc}</ar:ImpTotConc>
        <ar:ImpNeto>${detalle.ImpNeto}</ar:ImpNeto>
        <ar:ImpOpEx>${detalle.ImpOpEx}</ar:ImpOpEx>
        <ar:ImpTrib>${detalle.ImpTrib}</ar:ImpTrib>
        <ar:ImpIVA>${detalle.ImpIVA}</ar:ImpIVA>
        <ar:MonId>${detalle.MonId}</ar:MonId>
        <ar:MonCotiz>${detalle.MonCotiz}</ar:MonCotiz>
        ${detalle.Iva ? this.buildIvaArray(detalle.Iva) : ''}
        ${detalle.Tributos ? this.buildTributosArray(detalle.Tributos) : ''}
      </ar:FECAEDetRequest>`;
    }

    /**
     * Build IVA Array XML
     */
    buildIvaArray(ivaArray) {
        return `
      <ar:Iva>
        ${ivaArray.map(iva => `
          <ar:AlicIva>
            <ar:Id>${iva.Id}</ar:Id>
            <ar:BaseImp>${iva.BaseImp}</ar:BaseImp>
            <ar:Importe>${iva.Importe}</ar:Importe>
          </ar:AlicIva>
        `).join('')}
      </ar:Iva>`;
    }

    /**
     * Build Tributos Array XML
     */
    buildTributosArray(tributosArray) {
        return `
      <ar:Tributos>
        ${tributosArray.map(tributo => `
          <ar:Tributo>
            <ar:Id>${tributo.Id}</ar:Id>
            <ar:Desc>${tributo.Desc}</ar:Desc>
            <ar:BaseImp>${tributo.BaseImp}</ar:BaseImp>
            <ar:Alic>${tributo.Alic}</ar:Alic>
            <ar:Importe>${tributo.Importe}</ar:Importe>
          </ar:Tributo>
        `).join('')}
      </ar:Tributos>`;
    }

    /**
     * Parse FECAE Response
     */
    async parseFECAEResponse(xmlData) {
        return new Promise((resolve, reject) => {
            parseString(xmlData, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }

                try {
                    const body = result['soap:Envelope']['soap:Body'][0];
                    const response = body['FECAESolicitarResponse'][0];
                    const fecaeResult = response['FECAESolicitarResult'][0];

                    const parsedResponse = {
                        FeCabResp: {
                            Cuit: fecaeResult.FeCabResp[0].Cuit[0],
                            PtoVta: parseInt(fecaeResult.FeCabResp[0].PtoVta[0]),
                            CbteTipo: parseInt(fecaeResult.FeCabResp[0].CbteTipo[0]),
                            FchProceso: fecaeResult.FeCabResp[0].FchProceso[0],
                            CantReg: parseInt(fecaeResult.FeCabResp[0].CantReg[0]),
                            Resultado: fecaeResult.FeCabResp[0].Resultado[0]
                        },
                        FeDetResp: fecaeResult.FeDetResp[0].FECAEDetResponse?.map(det => ({
                            Concepto: parseInt(det.Concepto[0]),
                            DocTipo: parseInt(det.DocTipo[0]),
                            DocNro: det.DocNro[0],
                            CbteDesde: parseInt(det.CbteDesde[0]),
                            CbteHasta: parseInt(det.CbteHasta[0]),
                            CbteFch: det.CbteFch[0],
                            Resultado: det.Resultado[0],
                            CAE: det.CAE?.[0],
                            CAEFchVto: det.CAEFchVto?.[0],
                            Observaciones: det.Observaciones?.[0]?.Obs?.map(obs => ({
                                Code: parseInt(obs.Code[0]),
                                Msg: obs.Msg[0]
                            })) || []
                        })) || [],
                        Errors: fecaeResult.Errors?.[0]?.Err?.map(err => ({
                            Code: parseInt(err.Code[0]),
                            Msg: err.Msg[0]
                        })) || []
                    };

                    resolve(parsedResponse);
                } catch (parseError) {
                    reject(parseError);
                }
            });
        });
    }

    /**
     * WSFEV1 - Consultar Comprobante
     */
    async consultarComprobante(request) {
        const token = await this.authenticateWSAA('wsfe');

        try {
            const soapRequest = this.buildFECompConsultarRequest(token, request);
            const response = await this.clients.wsfev1.post('?op=FECompConsultar', soapRequest);

            return await this.parseFECompConsultarResponse(response.data);
        } catch (error) {
            logger.error('FECompConsultar failed', { error, request });
            throw error;
        }
    }

    /**
     * Build FECompConsultar SOAP Request
     */
    buildFECompConsultarRequest(token, request) {
        return `<?xml version="1.0" encoding="utf-8"?>
      <soapenv:Envelope 
        xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
        xmlns:ar="http://ar.gov.afip.dif.FEV1/">
        <soapenv:Header/>
        <soapenv:Body>
          <ar:FECompConsultar>
            <ar:Auth>
              <ar:Token>${token.token}</ar:Token>
              <ar:Sign>${token.sign}</ar:Sign>
              <ar:Cuit>${this.config.ARCA_CUIT}</ar:Cuit>
            </ar:Auth>
            <ar:FeCompConsReq>
              <ar:CbteTipo>${request.CbteTipo}</ar:CbteTipo>
              <ar:PtoVta>${request.PtoVta}</ar:PtoVta>
              <ar:CbteNro>${request.CbteNro}</ar:CbteNro>
            </ar:FeCompConsReq>
          </ar:FECompConsultar>
        </soapenv:Body>
      </soapenv:Envelope>`;
    }

    /**
     * Parse FECompConsultar Response
     */
    async parseFECompConsultarResponse(xmlData) {
        return new Promise((resolve, reject) => {
            parseString(xmlData, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }

                try {
                    const body = result['soap:Envelope']['soap:Body'][0];
                    const response = body['FECompConsultarResponse'][0];
                    const compConsResult = response['FECompConsultarResult'][0];

                    const parsedResponse = {
                        ResultGet: compConsResult.ResultGet?.[0] ? {
                            Concepto: parseInt(compConsResult.ResultGet[0].Concepto[0]),
                            DocTipo: parseInt(compConsResult.ResultGet[0].DocTipo[0]),
                            DocNro: compConsResult.ResultGet[0].DocNro[0],
                            CbteDesde: parseInt(compConsResult.ResultGet[0].CbteDesde[0]),
                            CbteHasta: parseInt(compConsResult.ResultGet[0].CbteHasta[0]),
                            CbteFch: compConsResult.ResultGet[0].CbteFch[0],
                            ImpTotal: parseFloat(compConsResult.ResultGet[0].ImpTotal[0]),
                            CAE: compConsResult.ResultGet[0].CAE[0],
                            CAEFchVto: compConsResult.ResultGet[0].CAEFchVto[0],
                            EmisionTipo: compConsResult.ResultGet[0].EmisionTipo[0]
                        } : undefined,
                        Errors: compConsResult.Errors?.[0]?.Err?.map(err => ({
                            Code: parseInt(err.Code[0]),
                            Msg: err.Msg[0]
                        })) || []
                    };

                    resolve(parsedResponse);
                } catch (parseError) {
                    reject(parseError);
                }
            });
        });
    }

    /**
     * WSFEV1 - Get Parameters
     */
    async getParametros(method, params = {}) {
        const token = await this.authenticateWSAA('wsfe');

        const cacheKey = `fe_param_${method}_${JSON.stringify(params)}`;
        const cached = this.cacheService.get(cacheKey);

        if (cached) {
            logger.debug('Using cached parameter data', { method });
            return cached;
        }

        try {
            const soapRequest = this.buildFEParamRequest(token, method, params);
            const response = await this.clients.wsfev1.post(`?op=${method}`, soapRequest);

            const result = await this.parseFEParamResponse(response.data);

            // Cache parameters for configured time
            const ttl = this.config.CACHE_TTL_SECONDS || 3600;
            this.cacheService.set(cacheKey, result, ttl);

            return result;
        } catch (error) {
            logger.error(`${method} failed`, { error, params });
            throw error;
        }
    }

    /**
     * Build FEParam SOAP Request
     */
    buildFEParamRequest(token, method, params) {
        const paramFields = Object.entries(params)
            .map(([key, value]) => `<ar:${key}>${value}</ar:${key}>`)
            .join('');

        return `<?xml version="1.0" encoding="utf-8"?>
      <soapenv:Envelope 
        xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
        xmlns:ar="http://ar.gov.afip.dif.FEV1/">
        <soapenv:Header/>
        <soapenv:Body>
          <ar:${method}>
            <ar:Auth>
              <ar:Token>${token.token}</ar:Token>
              <ar:Sign>${token.sign}</ar:Sign>
              <ar:Cuit>${this.config.ARCA_CUIT}</ar:Cuit>
            </ar:Auth>
            ${paramFields}
          </ar:${method}>
        </soapenv:Body>
      </soapenv:Envelope>`;
    }

    /**
     * Parse FEParam Response
     */
    async parseFEParamResponse(xmlData) {
        return new Promise((resolve, reject) => {
            parseString(xmlData, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }

                try {
                    const body = result['soap:Envelope']['soap:Body'][0];
                    const responseKey = Object.keys(body)[0];
                    const response = body[responseKey][0];
                    const resultKey = Object.keys(response)[0];
                    const paramResult = response[resultKey][0];

                    const parsedResponse = {
                        ResultGet: paramResult.ResultGet?.[0] || [],
                        Errors: paramResult.Errors?.[0]?.Err?.map(err => ({
                            Code: parseInt(err.Code[0]),
                            Msg: err.Msg[0]
                        })) || []
                    };

                    resolve(parsedResponse);
                } catch (parseError) {
                    reject(parseError);
                }
            });
        });
    }

    /**
     * WSMTXCA - Autorizar Comprobante Complejo
     */
    async autorizarComprobanteComplejo(request) {
        const token = await this.authenticateWSAA('wsmtxca');

        try {
            const soapRequest = this.buildWSMTXCARequest(token, request);
            const response = await this.clients.wsmtxca.post('/autorizarComprobante', soapRequest);

            return await this.parseWSMTXCAResponse(response.data);
        } catch (error) {
            logger.error('WSMTXCA autorizarComprobante failed', { error, request });
            throw error;
        }
    }

    /**
     * Build WSMTXCA SOAP Request
     */
    buildWSMTXCARequest(token, request) {
        return `<?xml version="1.0" encoding="utf-8"?>
      <soapenv:Envelope 
        xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
        xmlns:ser="http://impl.service.wsmtxca.afip.gob.ar/service/">
        <soapenv:Header/>
        <soapenv:Body>
          <ser:autorizarComprobanteRequest>
            <authRequest>
              <token>${token.token}</token>
              <sign>${token.sign}</sign>
              <cuitRepresentada>${this.config.ARCA_CUIT}</cuitRepresentada>
            </authRequest>
            <comprobanteCAERequest>
              <codigoTipoComprobante>${request.codigoTipoComprobante}</codigoTipoComprobante>
              <numeroPuntoVenta>${request.numeroPuntoVenta}</numeroPuntoVenta>
              <numeroComprobante>${request.numeroComprobante}</numeroComprobante>
              <fechaEmision>${request.fechaEmision}</fechaEmision>
              <codigoTipoDocumento>${request.codigoTipoDocumento}</codigoTipoDocumento>
              <numeroDocumento>${request.numeroDocumento}</numeroDocumento>
              <importeTotal>${request.importeTotal}</importeTotal>
              <importeNoGravado>${request.importeNoGravado || 0}</importeNoGravado>
              <importeGravado>${request.importeGravado}</importeGravado>
              <importeExento>${request.importeExento || 0}</importeExento>
              <codigoMoneda>${request.codigoMoneda}</codigoMoneda>
              <cotizacionMoneda>${request.cotizacionMoneda}</cotizacionMoneda>
              ${request.arraySubtotalesIVA ? this.buildSubtotalesIVA(request.arraySubtotalesIVA) : ''}
            </comprobanteCAERequest>
          </ser:autorizarComprobanteRequest>
        </soapenv:Body>
      </soapenv:Envelope>`;
    }

    /**
     * Build Subtotales IVA XML
     */
    buildSubtotalesIVA(subtotales) {
        return `
      <arraySubtotalesIVA>
        ${subtotales.map(subtotal => `
          <subtotalIVA>
            <codigo>${subtotal.codigo}</codigo>
            <importe>${subtotal.importe}</importe>
          </subtotalIVA>
        `).join('')}
      </arraySubtotalesIVA>`;
    }

    /**
     * Parse WSMTXCA Response
     */
    async parseWSMTXCAResponse(xmlData) {
        return new Promise((resolve, reject) => {
            parseString(xmlData, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }

                try {
                    const body = result['soapenv:Envelope']['soapenv:Body'][0];
                    const response = body['ns1:autorizarComprobanteResponse'][0];
                    const comprobante = response['comprobante'][0];

                    const parsedResponse = {
                        codigoAutorizacion: comprobante.codigoAutorizacion?.[0],
                        fechaVencimiento: comprobante.fechaVencimiento?.[0],
                        resultado: comprobante.resultado[0],
                        arrayErrores: comprobante.arrayErrores?.[0]?.codigoDescripcion?.map(err => ({
                            codigo: parseInt(err.codigo[0]),
                            descripcion: err.descripcion[0]
                        })) || [],
                        arrayObservaciones: comprobante.arrayObservaciones?.[0]?.codigoDescripcion?.map(obs => ({
                            codigo: parseInt(obs.codigo[0]),
                            descripcion: obs.descripcion[0]
                        })) || []
                    };

                    resolve(parsedResponse);
                } catch (parseError) {
                    reject(parseError);
                }
            });
        });
    }

    /**
     * Health check - verify service connectivity
     */
    async healthCheck() {
        try {
            // Try to get a token to verify connectivity
            const token = await this.authenticateWSAA('wsfe');
            return {
                status: 'healthy',
                wsaa: 'connected',
                tokenExpiry: token.expirationTime,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Health check failed', { error });
            throw new Error(`ARCA service unhealthy: ${error.message}`);
        }
    }

    /**
     * Check authentication status
     */
    async checkAuthStatus() {
        try {
            const cacheKey = 'wsaa_token_wsfe';
            const cachedToken = this.cacheService.get(cacheKey);

            if (!cachedToken) {
                return { valid: false, reason: 'No token cached' };
            }

            if (this.isTokenExpired(cachedToken)) {
                return { valid: false, reason: 'Token expired' };
            }

            return {
                valid: true,
                expiresAt: cachedToken.expirationTime,
                timeLeft: Math.floor((new Date(cachedToken.expirationTime) - new Date()) / 1000)
            };
        } catch (error) {
            return { valid: false, reason: error.message };
        }
    }

    /**
     * Shutdown service gracefully
     */
    async shutdown() {
        logger.info('Shutting down ARCA service...');
        // Close any persistent connections if needed
        // Clear sensitive data from memory
        this.certificateContent = null;
        this.privateKeyContent = null;
    }
}