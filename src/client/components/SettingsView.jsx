// src/client/components/SettingsView.jsx
import React from 'react';

export const SettingsView = ({
    settings,
    onSettingsChange,
    connectionStatus,
    systemHealth,
    onTestConnection,
    onClearCache,
    onExportData
}) => {
    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    Configuración del Sistema
                </h2>

                <div className="space-y-6">
                    {/* Configuración general */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                            General
                        </h3>
                        <div className="space-y-4">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={settings.autoRefresh}
                                    onChange={(e) => onSettingsChange({ autoRefresh: e.target.checked })}
                                    className="mr-3"
                                />
                                <span className="text-gray-700 dark:text-gray-300">Auto-refresh</span>
                            </label>

                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={settings.enableNotifications}
                                    onChange={(e) => onSettingsChange({ enableNotifications: e.target.checked })}
                                    className="mr-3"
                                />
                                <span className="text-gray-700 dark:text-gray-300">Notificaciones</span>
                            </label>

                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={settings.darkMode}
                                    onChange={(e) => onSettingsChange({ darkMode: e.target.checked })}
                                    className="mr-3"
                                />
                                <span className="text-gray-700 dark:text-gray-300">Modo oscuro</span>
                            </label>
                        </div>
                    </div>

                    {/* Estado del sistema */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                            Estado del Sistema
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Conexión
                                </p>
                                <p className={`text-lg font-bold ${connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {connectionStatus === 'connected' ? 'Conectado' : 'Desconectado'}
                                </p>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Sistema
                                </p>
                                <p className="text-lg font-bold text-green-600">
                                    {systemHealth?.healthy ? 'Saludable' : 'Con problemas'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Acciones */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                            Acciones
                        </h3>
                        <div className="space-y-3">
                            <button
                                onClick={onTestConnection}
                                className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Probar Conexión
                            </button>
                            <button
                                onClick={onClearCache}
                                className="w-full md:w-auto px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 ml-0 md:ml-3"
                            >
                                Limpiar Cache
                            </button>
                            <button
                                onClick={onExportData}
                                className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ml-0 md:ml-3"
                            >
                                Exportar Datos
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};