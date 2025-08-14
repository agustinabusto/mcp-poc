import React, { useState, useEffect } from 'react';

export const NotificationSettings = ({ cuit, onClose, onSave }) => {
    const [config, setConfig] = useState({
        email_enabled: false,
        websocket_enabled: true,
        sms_enabled: false,
        critical_alerts: true,
        high_alerts: true,
        medium_alerts: false,
        low_alerts: false,
        escalation_enabled: true,
        escalation_delay_minutes: 60,
        escalation_levels: 3,
        primary_email: '',
        secondary_email: '',
        primary_phone: '',
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        weekend_notifications: true,
        daily_summary: true,
        weekly_report: true
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [testResults, setTestResults] = useState(null);

    // Cargar configuración existente
    useEffect(() => {
        if (cuit) {
            loadCurrentConfig();
        }
    }, [cuit]);

    const loadCurrentConfig = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/notifications/config/${cuit}`);
            const data = await response.json();
            
            if (data.success && data.data) {
                setConfig(prev => ({ ...prev, ...data.data }));
            }
        } catch (err) {
            console.error('Error cargando configuración:', err);
            setError('Error cargando configuración existente');
        } finally {
            setLoading(false);
        }
    };

    // Manejar cambios en la configuración
    const handleConfigChange = (field, value) => {
        setConfig(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Limpiar errores cuando se modifica la configuración
        if (error) setError(null);
    };

    // Validar configuración
    const validateConfig = () => {
        const errors = [];

        if (config.email_enabled && !config.primary_email) {
            errors.push('Email principal es requerido si las notificaciones por email están habilitadas');
        }

        if (config.email_enabled && config.primary_email && !isValidEmail(config.primary_email)) {
            errors.push('Email principal no es válido');
        }

        if (config.secondary_email && !isValidEmail(config.secondary_email)) {
            errors.push('Email secundario no es válido');
        }

        if (config.sms_enabled && !config.primary_phone) {
            errors.push('Teléfono principal es requerido si las notificaciones por SMS están habilitadas');
        }

        if (config.escalation_delay_minutes < 5 || config.escalation_delay_minutes > 1440) {
            errors.push('Tiempo de escalación debe estar entre 5 y 1440 minutos');
        }

        if (config.escalation_levels < 1 || config.escalation_levels > 5) {
            errors.push('Niveles de escalación deben estar entre 1 y 5');
        }

        return errors;
    };

    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Guardar configuración
    const handleSave = async () => {
        const validationErrors = validateConfig();
        if (validationErrors.length > 0) {
            setError(validationErrors.join('. '));
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/notifications/config/${cuit}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            const data = await response.json();

            if (data.success) {
                if (onSave) onSave(config);
                if (onClose) onClose();
            } else {
                setError(data.error || 'Error guardando configuración');
            }
        } catch (err) {
            console.error('Error guardando configuración:', err);
            setError('Error guardando configuración');
        } finally {
            setLoading(false);
        }
    };

    // Probar configuración
    const handleTest = async () => {
        try {
            setLoading(true);
            setTestResults(null);

            const response = await fetch(`/api/notifications/test/${cuit}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            setTestResults(data.data || data);
        } catch (err) {
            console.error('Error probando configuración:', err);
            setTestResults({
                success: false,
                error: 'Error ejecutando prueba'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Configuración de Notificaciones
                    </h3>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    )}
                </div>

                {/* Contenido */}
                <div className="mt-4 max-h-96 overflow-y-auto">
                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {!loading && (
                        <div className="space-y-6">
                            {/* Información del CUIT */}
                            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">CUIT:</span> {cuit}
                                </p>
                            </div>

                            {/* Canales de notificación */}
                            <div>
                                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                                    Canales de Notificación
                                </h4>
                                <div className="space-y-3">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={config.email_enabled}
                                            onChange={(e) => handleConfigChange('email_enabled', e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            Notificaciones por Email
                                        </span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={config.websocket_enabled}
                                            onChange={(e) => handleConfigChange('websocket_enabled', e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            Notificaciones en Tiempo Real (WebSocket)
                                        </span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={config.sms_enabled}
                                            onChange={(e) => handleConfigChange('sms_enabled', e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            Notificaciones por SMS
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Configuración de emails */}
                            {config.email_enabled && (
                                <div>
                                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                                        Configuración de Email
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Email Principal *
                                            </label>
                                            <input
                                                type="email"
                                                value={config.primary_email}
                                                onChange={(e) => handleConfigChange('primary_email', e.target.value)}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                placeholder="correo@empresa.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Email Secundario (Opcional)
                                            </label>
                                            <input
                                                type="email"
                                                value={config.secondary_email}
                                                onChange={(e) => handleConfigChange('secondary_email', e.target.value)}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                placeholder="backup@empresa.com"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Configuración de SMS */}
                            {config.sms_enabled && (
                                <div>
                                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                                        Configuración de SMS
                                    </h4>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Teléfono Principal *
                                        </label>
                                        <input
                                            type="tel"
                                            value={config.primary_phone}
                                            onChange={(e) => handleConfigChange('primary_phone', e.target.value)}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            placeholder="+54 11 1234-5678"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Niveles de alerta */}
                            <div>
                                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                                    Niveles de Alerta
                                </h4>
                                <div className="space-y-3">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={config.critical_alerts}
                                            onChange={(e) => handleConfigChange('critical_alerts', e.target.checked)}
                                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            Alertas Críticas
                                        </span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={config.high_alerts}
                                            onChange={(e) => handleConfigChange('high_alerts', e.target.checked)}
                                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            Alertas Altas
                                        </span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={config.medium_alerts}
                                            onChange={(e) => handleConfigChange('medium_alerts', e.target.checked)}
                                            className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            Alertas Medias
                                        </span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={config.low_alerts}
                                            onChange={(e) => handleConfigChange('low_alerts', e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            Alertas Bajas
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Configuración de escalación */}
                            <div>
                                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                                    Escalación de Alertas
                                </h4>
                                <div className="space-y-3">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={config.escalation_enabled}
                                            onChange={(e) => handleConfigChange('escalation_enabled', e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            Habilitar escalación automática
                                        </span>
                                    </label>

                                    {config.escalation_enabled && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Tiempo entre escalaciones (minutos)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="5"
                                                    max="1440"
                                                    value={config.escalation_delay_minutes}
                                                    onChange={(e) => handleConfigChange('escalation_delay_minutes', parseInt(e.target.value))}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Niveles máximos de escalación
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    value={config.escalation_levels}
                                                    onChange={(e) => handleConfigChange('escalation_levels', parseInt(e.target.value))}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Horarios y programación */}
                            <div>
                                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                                    Horarios y Programación
                                </h4>
                                <div className="space-y-3">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={config.quiet_hours_enabled}
                                            onChange={(e) => handleConfigChange('quiet_hours_enabled', e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            Habilitar horario silencioso
                                        </span>
                                    </label>

                                    {config.quiet_hours_enabled && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Desde
                                                </label>
                                                <input
                                                    type="time"
                                                    value={config.quiet_hours_start}
                                                    onChange={(e) => handleConfigChange('quiet_hours_start', e.target.value)}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Hasta
                                                </label>
                                                <input
                                                    type="time"
                                                    value={config.quiet_hours_end}
                                                    onChange={(e) => handleConfigChange('quiet_hours_end', e.target.value)}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={config.weekend_notifications}
                                            onChange={(e) => handleConfigChange('weekend_notifications', e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            Notificaciones los fines de semana
                                        </span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={config.daily_summary}
                                            onChange={(e) => handleConfigChange('daily_summary', e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            Resumen diario por email
                                        </span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={config.weekly_report}
                                            onChange={(e) => handleConfigChange('weekly_report', e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            Reporte semanal por email
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Resultados de prueba */}
                            {testResults && (
                                <div className={`p-3 rounded-md border ${
                                    testResults.success 
                                        ? 'bg-green-50 border-green-200' 
                                        : 'bg-red-50 border-red-200'
                                }`}>
                                    <h5 className={`text-sm font-medium ${
                                        testResults.success ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                        Resultado de la Prueba
                                    </h5>
                                    <div className={`mt-1 text-sm ${
                                        testResults.success ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                        {testResults.success ? (
                                            <div>
                                                <p>✓ Configuración validada correctamente</p>
                                                {testResults.details && (
                                                    <ul className="mt-1 list-disc list-inside text-xs">
                                                        {Object.entries(testResults.details).map(([key, value]) => (
                                                            <li key={key}>
                                                                {key}: {value ? '✓' : '✗'}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ) : (
                                            <p>✗ {testResults.error || 'Error en la prueba'}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                    <button
                        onClick={handleTest}
                        disabled={loading}
                        className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                        Probar Configuración
                    </button>
                    
                    <div className="flex space-x-3">
                        {onClose && (
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Guardando...' : 'Guardar Configuración'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};