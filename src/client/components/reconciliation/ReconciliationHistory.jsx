// ===============================================
// 3. COMPONENTE PRINCIPAL CON AMBAS ACCIONES
// ===============================================

const ReconciliationHistoryRow = ({ reconciliation }) => {
    const [showViewModal, setShowViewModal] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const handleView = () => {
        setShowViewModal(true);
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            await downloadReconciliationExcel(reconciliation.id);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <>
            <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{reconciliation.period}</td>
                <td className="px-4 py-3 text-sm">{reconciliation.executedDate}</td>
                <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        {reconciliation.matchingRate}% precisión
                    </span>
                </td>
                <td className="px-4 py-3 text-sm">
                    {reconciliation.discrepancies} discrepancias
                </td>
                <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                        {/* Botón Ver */}
                        <button
                            onClick={handleView}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                            title="Ver detalles"
                        >
                            <Eye className="h-4 w-4" />
                        </button>

                        {/* Botón Descargar */}
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors disabled:opacity-50"
                            title="Descargar Excel"
                        >
                            {downloading ? (
                                <div className="h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </td>
            </tr>

            {/* Modal de Visualización */}
            <ReconciliationViewModal
                reconciliationId={reconciliation.id}
                isOpen={showViewModal}
                onClose={() => setShowViewModal(false)}
            />
        </>
    );
};

// ===============================================
// 4. EJEMPLO DE USO EN TU COMPONENTE PRINCIPAL
// ===============================================

const ReconciliationHistory = () => {
    // Datos dummy para el historial
    const reconciliations = [
        {
            id: "recon_jan_2025",
            period: "Enero 2025",
            executedDate: "31/01/2025 18:45",
            matchingRate: "96.7%",
            discrepancies: 9
        },
        {
            id: "recon_dec_2024",
            period: "Diciembre 2024",
            executedDate: "31/12/2024 19:20",
            matchingRate: "98.2%",
            discrepancies: 4
        },
        {
            id: "recon_nov_2024",
            period: "Noviembre 2024",
            executedDate: "30/11/2024 17:30",
            matchingRate: "94.5%",
            discrepancies: 12
        }
    ];

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Historial de Conciliaciones</h3>

            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Período</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Fecha</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Precisión</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Discrepancias</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reconciliations.map((reconciliation) => (
                            <ReconciliationHistoryRow
                                key={reconciliation.id}
                                reconciliation={reconciliation}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ReconciliationHistory;