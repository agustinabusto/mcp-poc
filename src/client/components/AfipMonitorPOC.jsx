import React, { useState, useEffect } from 'react';

export function AfipMonitorPOC({ config }) {
  const [status, setStatus] = useState('disconnected');
  const [taxpayerData, setTaxpayerData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [complianceResult, setComplianceResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cuit, setCuit] = useState('20123456789');
  const [ws, setWs] = useState(null);

  // Conectar WebSocket
  useEffect(() => {
    const websocket = new WebSocket(config.wsUrl);

    websocket.onopen = () => {
      setStatus('connected');
      console.log('✅ WebSocket conectado');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Mensaje recibido:', data);

        if (data.type === 'alert') {
          setAlerts(prev => [data.data, ...prev.slice(0, 9)]);
        }
      } catch (error) {
        console.error('Error procesando mensaje:', error);
      }
    };

    websocket.onclose = () => {
      setStatus('disconnected');
      console.log('❌ WebSocket desconectado');
    };

    websocket.onerror = (error) => {
      console.error('❌ Error WebSocket:', error);
      setStatus('error');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [config.wsUrl]);

  // Cargar alertas iniciales
  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/alerts`);
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error cargando alertas:', error);
    }
  };

  const loadTaxpayerData = async () => {
    if (!cuit) return;

    setLoading(true);
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/afip/taxpayer/${cuit}`);
      const data = await response.json();
      setTaxpayerData(data);
    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error cargando datos del contribuyente');
    } finally {
      setLoading(false);
    }
  };

  const checkCompliance = async () => {
    if (!cuit) return;

    setLoading(true);
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/compliance/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cuit,
          period: {
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1
          }
        })
      });
      const data = await response.json();
      setComplianceResult(data);
    } catch (error) {
      console.error('Error verificando compliance:', error);
      alert('Error verificando compliance');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'disconnected': return 'text-red-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return '🟢';
      case 'disconnected': return '🔴';
      case 'error': return '❌';
      default: return '⚫';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplianceColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AFIP Monitor MCP - POC
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className={`flex items-center gap-2 ${getStatusColor(status)}`}>
              {getStatusIcon(status)} Estado: {status}
            </span>
            <span>Snarx.io - Especialistas en MCP</span>
          </div>
        </header>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Panel de Control</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CUIT del Contribuyente
              </label>
              <input
                type="text"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="20123456789"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadTaxpayerData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Cargando...' : 'Consultar AFIP'}
              </button>
              <button
                onClick={checkCompliance}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Check Compliance'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Datos del Contribuyente */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Datos del Contribuyente</h2>
              {taxpayerData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">CUIT</p>
                      <p className="font-semibold">{taxpayerData.cuit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Razón Social</p>
                      <p className="font-semibold">{taxpayerData.razonSocial}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Estado</p>
                      <p className="font-semibold text-green-600">{taxpayerData.estado}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">IVA</p>
                      <p className="font-semibold">{taxpayerData.situacionFiscal?.iva}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">Domicilio</p>
                    <p className="font-semibold">
                      {taxpayerData.domicilio?.direccion}, {taxpayerData.domicilio?.localidad}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">Actividades</p>
                    {taxpayerData.actividades?.map((actividad, index) => (
                      <p key={index} className="font-semibold">
                        {actividad.codigo} - {actividad.descripcion}
                        {actividad.principal && <span className="text-blue-600"> (Principal)</span>}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Ingrese un CUIT y haga clic en "Consultar AFIP"
                </p>
              )}
            </div>
          </div>

          {/* Alertas */}
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Alertas en Tiempo Real</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {alerts.length > 0 ? (
                  alerts.map((alert, index) => (
                    <div key={alert.id || index} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity || 'low')}`}>
                        {alert.severity || 'info'}
                      </div>
                      <p className="text-sm mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No hay alertas</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Result */}
        {complianceResult && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Resultado de Compliance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-center mb-4">
                  <div className={`text-4xl font-bold ${getComplianceColor(complianceResult.score)}`}>
                    {complianceResult.score}%
                  </div>
                  <div className="text-lg font-medium text-gray-600">
                    Score de Compliance
                  </div>
                </div>

                <div className="space-y-2">
                  {complianceResult.checks?.map((check, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className={check.passed ? 'text-green-600' : 'text-red-600'}>
                        {check.passed ? '✅' : '❌'}
                      </span>
                      <span className="text-sm">{check.message}</span>
                      <span className="text-xs text-gray-500">({check.score}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Recomendaciones</h3>
                <ul className="space-y-1">
                  {complianceResult.recommendations?.map((rec, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>AFIP Monitor MCP - POC desarrollado por Snarx.io</p>
          <p>Demostración de integración con Model Context Protocol</p>
        </footer>
      </div>
    </div>
  );
}