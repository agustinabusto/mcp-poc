// ===== src/client/components/ocr/data-displays/BankStatementDataDisplay.jsx =====
import React, { useState } from 'react';
import { Building, Calendar, CreditCard, TrendingUp, TrendingDown, Eye, EyeOff } from 'lucide-react';

const BankStatementDataDisplay = ({ data }) => {
    const [showAllMovements, setShowAllMovements] = useState(false);

    if (!data) {
        return (
            <div className="text-center py-8 text-gray-500">
                <Building className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No hay datos de extracto bancario disponibles</p>
            </div>
        );
    }

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return 'No especificado';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount);
    };

    const formatCBU = (cbu) => {
        if (!cbu) return 'No especificado';
        // Formatear CBU: XXXX XXXX XXXX XXXX XXXX XX
        const clean = cbu.toString().replace(/\s/g, '');
        if (clean.length === 22) {
            return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)} ${clean.slice(12, 16)} ${clean.slice(16, 20)} ${clean.slice(20)}`;
        }
        return cbu;
    };

    const movementsToShow = showAllMovements
        ? data.movimientos
        : data.movimientos?.slice(0, 5) || [];

    const totalDebitos = data.movimientos?.reduce((sum, mov) => sum + (mov.debito || 0), 0) || 0;
    const totalCreditos = data.movimientos?.reduce((sum, mov) => sum + (mov.credito || 0), 0) || 0;

    return (
        <div className="space-y-6">
            {/* Información de la cuenta */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    Información de la Cuenta
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.banco && (
                        <div>
                            <span className="text-sm text-blue-600">Banco:</span>
                            <p className="font-medium text-blue-900">{data.banco}</p>
                        </div>
                    )}
                    {data.cuenta && (
                        <div>
                            <span className="text-sm text-blue-600">Cuenta:</span>
                            <p className="font-medium text-blue-900">{data.cuenta}</p>
                        </div>
                    )}
                    {data.titular && (
                        <div>
                            <span className="text-sm text-blue-600">Titular:</span>
                            <p className="font-medium text-blue-900">{data.titular}</p>
                        </div>
                    )}
                    {data.cbu && (
                        <div>
                            <span className="text-sm text-blue-600">CBU:</span>
                            <p className="font-medium text-blue-900 text-sm">{formatCBU(data.cbu)}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Período y saldos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Período */}
                {data.periodo && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            Período
                        </h4>
                        <div className="text-sm space-y-1">
                            <p><span className="text-gray-600">Desde:</span> {new Date(data.periodo.desde).toLocaleDateString('es-AR')}</p>
                            <p><span className="text-gray-600">Hasta:</span> {new Date(data.periodo.hasta).toLocaleDateString('es-AR')}</p>
                        </div>
                    </div>
                )}

                {/* Saldo inicial */}
                {data.saldoInicial !== undefined && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-900 mb-2">Saldo Inicial</h4>
                        <p className="text-xl font-bold text-yellow-900">
                            {formatCurrency(data.saldoInicial)}
                        </p>
                    </div>
                )}

                {/* Saldo final */}
                {data.saldoFinal !== undefined && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900 mb-2">Saldo Final</h4>
                        <p className="text-xl font-bold text-green-900">
                            {formatCurrency(data.saldoFinal)}
                        </p>
                    </div>
                )}
            </div>

            {/* Resumen de movimientos */}
            {data.movimientos && data.movimientos.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Resumen de Movimientos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded">
                            <p className="text-sm text-gray-600">Total Movimientos</p>
                            <p className="text-2xl font-bold text-gray-900">{data.movimientos.length}</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded">
                            <p className="text-sm text-red-600">Total Débitos</p>
                            <p className="text-xl font-bold text-red-900">{formatCurrency(totalDebitos)}</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded">
                            <p className="text-sm text-green-600">Total Créditos</p>
                            <p className="text-xl font-bold text-green-900">{formatCurrency(totalCreditos)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Lista de movimientos */}
            {data.movimientos && data.movimientos.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">Movimientos</h4>
                        {data.movimientos.length > 5 && (
                            <button
                                onClick={() => setShowAllMovements(!showAllMovements)}
                                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                            >
                                {showAllMovements ? (
                                    <>
                                        <EyeOff className="w-4 h-4 mr-1" />
                                        Mostrar menos
                                    </>
                                ) : (
                                    <>
                                        <Eye className="w-4 h-4 mr-1" />
                                        Mostrar todos ({data.movimientos.length})
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="space-y-2">
                        {movementsToShow.map((movimiento, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                        {movimiento.credito ? (
                                            <TrendingUp className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <TrendingDown className="w-5 h-5 text-red-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">
                                            {movimiento.descripcion}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(movimiento.fecha).toLocaleDateString('es-AR')}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-medium ${movimiento.credito ? 'text-green-600' : 'text-red-600'}`}>
                                        {movimiento.credito ? '+' : '-'}
                                        {formatCurrency(movimiento.credito || movimiento.debito)}
                                    </p>
                                    {movimiento.saldo !== undefined && (
                                        <p className="text-sm text-gray-500">
                                            Saldo: {formatCurrency(movimiento.saldo)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankStatementDataDisplay;