// src/client/components/TaxpayerInfo.jsx
import React, { useState } from 'react';
import { User, Building, MapPin, Activity, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

const TaxpayerInfo = ({ data, onComplianceCheck, loading }) => {
    const [checkingCompliance, setCheckingCompliance] = useState(false);

    if (!data) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay información de contribuyente</h3>
                <p className="text-gray-500">Realiza una búsqueda por CUIT para ver la información aquí.</p>
            </div>
        );
    }

    const handleComplianceCheck = async () => {
        setCheckingCompliance(true);
        try {
            await onComplianceCheck(data.cuit, new Date().getFullYear().toString());
        } catch (error) {
            console.error('Error en compliance check:', error);
        } finally {
            setCheckingCompliance(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVO':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'INACTIVO':
                return <AlertTriangle className="h-5 w-5 text-red-600" />;
            default:
                return <Clock className="h-5 w-5 text-gray-600" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVO':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'INACTIVO':
                return 'text-red-600 bg-red-50 border-red-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{data.razonSocial}</h2>
                        <p className="text-gray-600">CUIT: {data.cuit}</p>
                    </div>
                    <button
                        onClick={handleComplianceCheck}
                        disabled={checkingCompliance || loading}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        {checkingCompliance ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Verificando...
                            </>
                        ) : (
                            <>
                                <Activity className="h-4 w-4" />
                                Verificar Compliance
                            </>
                        )}
                    </button>
                </div>

                {/* Estado */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getStatusColor(data.estado)}`}>
                    {getStatusIcon(data.estado)}
                    <span className="font-medium">{data.estado}</span>
                </div>
            </div>

            {/* Información fiscal */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Situación Fiscal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">IVA</h4>
                        <p className="text-gray-700">{data.situacionFiscal?.iva || 'No especificado'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Ganancias</h4>
                        <p className="text-gray-700">{data.situacionFiscal?.ganancias || 'No especificado'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Monotributo</h4>
                        <p className="text-gray-700">{data.situacionFiscal?.monotributo || 'No especificado'}</p>
                    </div>
                </div>
            </div>

            {/* Domicilio */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Domicilio Fiscal
                </h3>
                <div className="space-y-2">
                    <p className="text-gray-700"><strong>Dirección:</strong> {data.domicilio?.direccion || 'No especificado'}</p>
                    <p className="text-gray-700"><strong>Localidad:</strong> {data.domicilio?.localidad || 'No especificado'}</p>
                    <p className="text-gray-700"><strong>Provincia:</strong> {data.domicilio?.provincia || 'No especificado'}</p>
                </div>
            </div>

            {/* Actividades */}
            {data.actividades && data.actividades.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividades Económicas</h3>
                    <div className="space-y-3">
                        {data.actividades.map((actividad, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900">{actividad.descripcion}</p>
                                    <p className="text-sm text-gray-600">Código: {actividad.codigo}</p>
                                </div>
                                {actividad.principal && (
                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                                        Principal
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Metadata */}
            <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500">Fuente:</span>
                        <p className="font-medium">{data.fuente || 'No especificado'}</p>
                    </div>
                    <div>
                        <span className="text-gray-500">Última actualización:</span>
                        <p className="font-medium">
                            {data.fechaUltimaActualizacion
                                ? new Date(data.fechaUltimaActualizacion).toLocaleDateString()
                                : 'No especificado'
                            }
                        </p>
                    </div>
                    <div>
                        <span className="text-gray-500">Consulta:</span>
                        <p className="font-medium">{new Date().toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaxpayerInfo;