// ==============================================
// 4. src/client/components/ocr/OCRProcessingView.jsx
import React from 'react';
import { Camera, TrendingUp } from 'lucide-react';

const OCRProcessingView = () => {
    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="text-center py-12">
                <Camera className="mx-auto h-16 w-16 text-purple-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Procesamiento OCR</h3>
                <p className="text-gray-600">Vista detallada de procesamiento OCR en desarrollo.</p>
                <div className="mt-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        ✓ Motor OCR Activo
                    </span>
                </div>
            </div>
        </div>
    );
};

export default OCRProcessingView;