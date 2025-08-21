# User Story 4.5: Mobile-First OCR Experience

**Epic:** 4 - OCR Intelligence & Automation  
**Fecha:** 2025-08-19  
**Versión:** 1.0  
**Estado:** Ready for Development  
**Asignado a:** Development Team  
**Estimación:** 3 semanas (Semanas 11-13 de Epic 4)  
**Dependencias:** User Stories 4.1-4.4 (Complete OCR Intelligence Pipeline)

---

## 📋 User Story

**Como usuario móvil,**  
**Quiero capturar y procesar facturas directamente desde mi teléfono,**  
**Para agilizar la carga de documentos en campo.**

---

## 🎯 Business Value

- **Field Efficiency:** 60% reducción en tiempo entre recepción y procesamiento de facturas
- **User Adoption:** 40%+ de uploads realizados desde mobile devices
- **Real-time Processing:** Procesamiento inmediato con feedback instantáneo
- **Competitive Advantage:** Primera solución AFIP móvil con ML intelligence

---

## ✅ Acceptance Criteria

### AC1: Mobile Web App Enhancement
**DADO** que un usuario accede desde dispositivo móvil
**CUANDO** quiere capturar una factura con la cámara
**ENTONCES** debe tener una experiencia optimizada y intuitiva

#### Criterios específicos:
- [ ] Camera capture con pre-processing automático de calidad
- [ ] Upload progresivo con preview y edición básica antes de envío
- [ ] Offline capability con sync automático cuando hay conexión
- [ ] Touch-friendly interface optimizada para mobile (tablets y phones)
- [ ] Responsive design que funciona en todas las screen sizes

### AC2: Real-time Processing & Feedback
**DADO** que el usuario sube una imagen desde móvil
**CUANDO** el sistema procesa la imagen con ML y AFIP validation
**ENTONCES** debe proporcionar feedback inmediato y actionable

#### Criterios específicos:
- [ ] Processing status en tiempo real con progress indicators
- [ ] Push notifications para resultados de procesamiento
- [ ] Quick corrections interface para ajustes rápidos en móvil
- [ ] Batch upload con queue management para múltiples documentos
- [ ] Instant preview de extracted data con confidence indicators

### AC3: PWA Capabilities
**DADO** que el sistema funciona como Progressive Web App
**CUANDO** usuarios móviles lo instalan en sus dispositivos
**ENTONCES** debe proporcionar experiencia nativa completa

#### Criterios específicos:
- [ ] Service Worker para offline functionality completa
- [ ] App-like experience con install prompts y home screen icon
- [ ] Background sync para uploads pendientes cuando se restaura conexión
- [ ] Optimización de bandwidth para conexiones móviles lentas
- [ ] Native mobile features access (camera, files, notifications)

### AC4: Performance & Optimization
**DADO** que usuarios móviles tienen limitations de CPU/RAM/bandwidth
**CUANDO** procesan documentos en dispositivos con recursos limitados
**ENTONCES** el sistema debe optimizar automáticamente para el device

#### Criterios específicos:
- [ ] Device capability detection y adaptive processing
- [ ] Image compression y optimization antes de upload
- [ ] Progressive loading de UI components
- [ ] Memory management para evitar crashes en dispositivos low-end
- [ ] Network-aware processing (3G/4G/5G/WiFi adaptation)

---

## 🏗️ Technical Specifications

### Core Components to Develop

#### 1. MobileOCRCapture Component
**Ubicación:** `src/client/components/mobile/MobileOCRCapture.jsx`

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RotateCcw, Crop, Check, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { Alert, AlertDescription } from '../ui/Alert';

const MobileOCRCapture = ({ onUploadComplete, onError }) => {
    const [cameraActive, setCameraActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [processingStep, setProcessingStep] = useState('idle'); // 'idle', 'capturing', 'processing', 'uploading'
    const [uploadProgress, setUploadProgress] = useState(0);
    const [deviceCapabilities, setDeviceCapabilities] = useState(null);
    const [connectionType, setConnectionType] = useState('unknown');
    
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    
    useEffect(() => {
        detectDeviceCapabilities();
        detectConnectionType();
    }, []);
    
    /**
     * Detecta capabilities del dispositivo para adaptive processing
     */
    const detectDeviceCapabilities = async () => {
        const capabilities = {
            // CPU performance estimation
            cpuClass: navigator.hardwareConcurrency || 2,
            // Memory estimation (when available)
            memory: navigator.deviceMemory || 2,
            // Screen characteristics
            screenSize: {
                width: window.screen.width,
                height: window.screen.height,
                pixelRatio: window.devicePixelRatio || 1
            },
            // Camera capabilities
            hasCamera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            // Touch capabilities
            hasTouch: 'ontouchstart' in window,
            // Platform detection
            platform: /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : 
                     /Android/.test(navigator.userAgent) ? 'android' : 'desktop'
        };
        
        setDeviceCapabilities(capabilities);
        
        // Ajustar configuración basada en capabilities
        if (capabilities.memory < 2 || capabilities.cpuClass < 4) {
            // Low-end device optimizations
            console.log('Low-end device detected - enabling optimizations');
        }
    };
    
    /**
     * Detecta tipo de conexión para adaptive bandwidth
     */
    const detectConnectionType = () => {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            setConnectionType(connection.effectiveType || 'unknown');
            
            // Listen for connection changes
            connection.addEventListener('change', () => {
                setConnectionType(connection.effectiveType);
            });
        }
    };
    
    /**
     * Inicia captura con cámara optimizada para móvil
     */
    const startCameraCapture = async () => {
        try {
            setProcessingStep('capturing');
            
            // Configuración optimizada por device capability
            const constraints = {
                video: {
                    facingMode: 'environment', // Rear camera
                    width: { ideal: deviceCapabilities?.memory >= 4 ? 1920 : 1280 },
                    height: { ideal: deviceCapabilities?.memory >= 4 ? 1080 : 720 },
                    aspectRatio: { ideal: 4/3 }
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setCameraActive(true);
            }
        } catch (error) {
            console.error('Camera access error:', error);
            onError('No se pudo acceder a la cámara. Verifique permisos.');
            setProcessingStep('idle');
        }
    };
    
    /**
     * Captura imagen con pre-processing automático
     */
    const captureImage = async () => {
        try {
            if (!videoRef.current || !canvasRef.current) return;
            
            const canvas = canvasRef.current;
            const video = videoRef.current;
            
            // Set canvas size optimized for processing
            const targetWidth = 1024; // Optimal for OCR processing
            const targetHeight = (video.videoHeight / video.videoWidth) * targetWidth;
            
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            
            // Pre-processing para mejorar OCR accuracy
            const processedImageData = await preprocessImageForOCR(ctx, targetWidth, targetHeight);
            
            // Convert to optimized blob
            const blob = await canvasToOptimizedBlob(canvas, connectionType);
            
            setCapturedImage({
                blob,
                dataUrl: canvas.toDataURL('image/jpeg', 0.8),
                processedData: processedImageData
            });
            
            stopCamera();
            setProcessingStep('processing');
        } catch (error) {
            console.error('Image capture error:', error);
            onError('Error al capturar imagen');
        }
    };
    
    /**
     * Pre-processing específico para OCR móvil
     */
    const preprocessImageForOCR = async (ctx, width, height) => {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Apply contrast enhancement
        const contrast = 1.2;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, contrast * (data[i] - 128) + 128)); // R
            data[i + 1] = Math.min(255, Math.max(0, contrast * (data[i + 1] - 128) + 128)); // G
            data[i + 2] = Math.min(255, Math.max(0, contrast * (data[i + 2] - 128) + 128)); // B
        }
        
        // Apply sharpening if high-end device
        if (deviceCapabilities?.cpuClass >= 6) {
            applySharpeningFilter(data, width, height);
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        return {
            enhancementApplied: true,
            contrast: contrast,
            sharpening: deviceCapabilities?.cpuClass >= 6
        };
    };
    
    /**
     * Optimiza blob para upload basado en conexión
     */
    const canvasToOptimizedBlob = async (canvas, connectionType) => {
        let quality = 0.8; // Default quality
        
        // Adjust quality based on connection
        switch (connectionType) {
            case 'slow-2g':
            case '2g':
                quality = 0.4;
                break;
            case '3g':
                quality = 0.6;
                break;
            case '4g':
            case '5g':
                quality = 0.8;
                break;
        }
        
        return new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', quality);
        });
    };
    
    /**
     * Upload con progress tracking optimizado para móvil
     */
    const uploadImage = async () => {
        if (!capturedImage) return;
        
        try {
            setProcessingStep('uploading');
            
            const formData = new FormData();
            formData.append('document', capturedImage.blob);
            formData.append('source', 'mobile_camera');
            formData.append('deviceInfo', JSON.stringify(deviceCapabilities));
            formData.append('connectionType', connectionType);
            
            // Create XMLHttpRequest for progress tracking
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = (event.loaded / event.total) * 100;
                    setUploadProgress(progress);
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    onUploadComplete(response);
                    resetCapture();
                } else {
                    onError('Error en el upload');
                    setProcessingStep('processing');
                }
            });
            
            xhr.addEventListener('error', () => {
                onError('Error de conexión durante upload');
                setProcessingStep('processing');
            });
            
            xhr.open('POST', '/api/ocr/upload-mobile');
            xhr.send(formData);
            
        } catch (error) {
            console.error('Upload error:', error);
            onError('Error durante el upload');
            setProcessingStep('processing');
        }
    };
    
    /**
     * Detiene cámara y libera recursos
     */
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };
    
    /**
     * Reset completo del componente
     */
    const resetCapture = () => {
        stopCamera();
        setCapturedImage(null);
        setUploadProgress(0);
        setProcessingStep('idle');
    };
    
    // Touch gestures para zoom y pan (para preview de imagen)
    const handleTouchGestures = (event) => {
        // Implement pinch-to-zoom and pan functionality
        // This would be implemented using touch event handlers
    };
    
    return (
        <div className="mobile-ocr-capture h-screen flex flex-col bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black text-white">
                <h2 className="text-lg font-semibold">Capturar Factura</h2>
                <Button variant="ghost" onClick={resetCapture} className="text-white">
                    <X className="h-5 w-5" />
                </Button>
            </div>
            
            {/* Main capture area */}
            <div className="flex-1 relative">
                {processingStep === 'idle' && (
                    <div className="h-full flex flex-col items-center justify-center p-8">
                        <Camera className="h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-xl font-medium text-white mb-2">
                            Capturar Factura
                        </h3>
                        <p className="text-gray-400 text-center mb-8">
                            Usa la cámara para capturar facturas y procesarlas automáticamente
                        </p>
                        <Button 
                            onClick={startCameraCapture}
                            className="bg-blue-600 hover:bg-blue-700 px-8 py-3"
                            disabled={!deviceCapabilities?.hasCamera}
                        >
                            <Camera className="h-5 w-5 mr-2" />
                            Iniciar Cámara
                        </Button>
                        
                        {/* Alternative upload button */}
                        <Button 
                            variant="outline" 
                            className="mt-4 border-gray-600 text-gray-300"
                            onClick={() => document.getElementById('file-input').click()}
                        >
                            <Upload className="h-5 w-5 mr-2" />
                            Subir desde Galería
                        </Button>
                        <input 
                            id="file-input" 
                            type="file" 
                            accept="image/*" 
                            hidden 
                            onChange={handleFileSelect}
                        />
                    </div>
                )}
                
                {processingStep === 'capturing' && cameraActive && (
                    <div className="h-full relative">
                        <video 
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            autoPlay
                            playsInline
                            muted
                        />
                        
                        {/* Camera overlay with guidelines */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="border-2 border-white border-dashed w-80 h-48 rounded-lg">
                                <div className="bg-black bg-opacity-50 text-white text-sm p-2 rounded-t-lg">
                                    Posiciona la factura dentro del marco
                                </div>
                            </div>
                        </div>
                        
                        {/* Capture button */}
                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                            <Button 
                                onClick={captureImage}
                                className="bg-white text-black rounded-full p-4 w-16 h-16 shadow-lg"
                            >
                                <Camera className="h-8 w-8" />
                            </Button>
                        </div>
                    </div>
                )}
                
                {processingStep === 'processing' && capturedImage && (
                    <div className="h-full flex flex-col">
                        <div className="flex-1 relative">
                            <img 
                                src={capturedImage.dataUrl}
                                alt="Captured document"
                                className="w-full h-full object-contain"
                                onTouchStart={handleTouchGestures}
                            />
                            
                            {/* Preview overlay */}
                            <div className="absolute top-4 left-4 right-4">
                                <Alert className="bg-green-900 border-green-700">
                                    <Check className="h-4 w-4" />
                                    <AlertDescription className="text-green-100">
                                        Imagen capturada exitosamente. Revisa y confirma.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="p-4 bg-black flex space-x-4">
                            <Button 
                                variant="outline" 
                                onClick={resetCapture}
                                className="flex-1 border-gray-600 text-gray-300"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Volver a Capturar
                            </Button>
                            <Button 
                                onClick={uploadImage}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                                <Check className="h-4 w-4 mr-2" />
                                Procesar Factura
                            </Button>
                        </div>
                    </div>
                )}
                
                {processingStep === 'uploading' && (
                    <div className="h-full flex flex-col items-center justify-center p-8">
                        <div className="bg-black bg-opacity-80 rounded-lg p-6 w-full max-w-sm">
                            <h3 className="text-white text-lg font-medium mb-4 text-center">
                                Procesando Factura
                            </h3>
                            <Progress value={uploadProgress} className="mb-4" />
                            <p className="text-gray-300 text-sm text-center">
                                {uploadProgress < 50 ? 'Subiendo imagen...' : 
                                 uploadProgress < 90 ? 'Procesando con OCR...' : 
                                 'Validando con AFIP...'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Hidden canvas for image processing */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
};

export default MobileOCRCapture;
```

#### 2. Progressive Web App Configuration
**Ubicación:** `src/client/public/manifest.json`

```json
{
    "name": "AFIP Monitor MCP",
    "short_name": "AFIP Monitor",
    "description": "Sistema inteligente de procesamiento OCR para documentos fiscales argentinos",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#1f2937",
    "theme_color": "#3b82f6",
    "orientation": "portrait-primary",
    "categories": ["business", "finance", "productivity"],
    "lang": "es",
    "dir": "ltr",
    
    "icons": [
        {
            "src": "/icons/icon-72x72.png",
            "sizes": "72x72",
            "type": "image/png",
            "purpose": "maskable any"
        },
        {
            "src": "/icons/icon-96x96.png",
            "sizes": "96x96",
            "type": "image/png",
            "purpose": "maskable any"
        },
        {
            "src": "/icons/icon-128x128.png",
            "sizes": "128x128",
            "type": "image/png",
            "purpose": "maskable any"
        },
        {
            "src": "/icons/icon-144x144.png",
            "sizes": "144x144",
            "type": "image/png",
            "purpose": "maskable any"
        },
        {
            "src": "/icons/icon-152x152.png",
            "sizes": "152x152",
            "type": "image/png",
            "purpose": "maskable any"
        },
        {
            "src": "/icons/icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "maskable any"
        },
        {
            "src": "/icons/icon-384x384.png",
            "sizes": "384x384",
            "type": "image/png",
            "purpose": "maskable any"
        },
        {
            "src": "/icons/icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable any"
        }
    ],
    
    "screenshots": [
        {
            "src": "/screenshots/mobile-capture.png",
            "sizes": "390x844",
            "type": "image/png",
            "form_factor": "narrow",
            "label": "Captura móvil de facturas con cámara"
        },
        {
            "src": "/screenshots/mobile-dashboard.png", 
            "sizes": "390x844",
            "type": "image/png",
            "form_factor": "narrow",
            "label": "Dashboard móvil con analytics en tiempo real"
        },
        {
            "src": "/screenshots/tablet-workflow.png",
            "sizes": "1024x768",
            "type": "image/png", 
            "form_factor": "wide",
            "label": "Interfaz de workflow optimizada para tablets"
        }
    ],
    
    "shortcuts": [
        {
            "name": "Capturar Factura",
            "short_name": "Capturar",
            "description": "Capturar nueva factura con cámara",
            "url": "/mobile/capture",
            "icons": [
                {
                    "src": "/icons/capture-shortcut.png",
                    "sizes": "192x192",
                    "type": "image/png"
                }
            ]
        },
        {
            "name": "Ver Documentos",
            "short_name": "Documentos",
            "description": "Ver documentos procesados",
            "url": "/documents",
            "icons": [
                {
                    "src": "/icons/documents-shortcut.png",
                    "sizes": "192x192", 
                    "type": "image/png"
                }
            ]
        }
    ],
    
    "related_applications": [],
    "prefer_related_applications": false,
    
    "scope": "/",
    "id": "afip-monitor-mcp",
    
    "edge_side_panel": {
        "preferred_width": 400
    },
    
    "handle_links": "preferred",
    
    "launch_handler": {
        "client_mode": "navigate-existing"
    }
}
```

#### 3. Service Worker for Offline Capabilities
**Ubicación:** `src/client/public/sw.js`

```javascript
const CACHE_NAME = 'afip-monitor-v1.0.0';
const STATIC_CACHE_NAME = 'afip-monitor-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'afip-monitor-dynamic-v1.0.0';
const OFFLINE_QUEUE_NAME = 'afip-monitor-offline-queue';

// Files to cache for offline functionality
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/mobile/capture',
    '/static/js/main.js',
    '/static/css/main.css',
    '/icons/icon-192x192.png',
    '/offline.html'
];

// API endpoints that should work offline
const API_CACHE_PATTERNS = [
    '/api/user/profile',
    '/api/documents/recent',
    '/api/analytics/summary'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(STATIC_CACHE_NAME).then(cache => {
                return cache.addAll(STATIC_ASSETS);
            }),
            // Initialize offline queue
            initializeOfflineQueue()
        ])
    );
    
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE_NAME && 
                        cacheName !== DYNAMIC_CACHE_NAME &&
                        cacheName.startsWith('afip-monitor-')) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Handle different types of requests
    if (request.method === 'GET') {
        if (isStaticAsset(request)) {
            event.respondWith(cacheFirst(request));
        } else if (isAPIRequest(request)) {
            event.respondWith(networkFirst(request));
        } else if (isDocumentRequest(request)) {
            event.respondWith(staleWhileRevalidate(request));
        } else {
            event.respondWith(fetch(request));
        }
    } else if (request.method === 'POST' && isOCRUpload(request)) {
        event.respondWith(handleOCRUpload(request));
    } else {
        // For non-GET requests, try network first, queue if offline
        event.respondWith(networkWithOfflineQueue(request));
    }
});

// Background sync event - process offline queue
self.addEventListener('sync', event => {
    console.log('Background sync triggered:', event.tag);
    
    if (event.tag === 'offline-uploads') {
        event.waitUntil(processOfflineQueue());
    } else if (event.tag === 'periodic-sync') {
        event.waitUntil(syncPeriodicData());
    }
});

// Push notification event
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            data: data.data,
            actions: data.actions || [],
            requireInteraction: data.priority === 'high',
            tag: data.tag || 'default'
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Notification click event
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    const data = event.notification.data;
    const action = event.action;
    
    if (action === 'view' || !action) {
        event.waitUntil(
            clients.openWindow(data.url || '/')
        );
    } else if (action === 'approve' && data.documentId) {
        event.waitUntil(
            handleQuickAction('approve', data.documentId)
        );
    }
});

// Caching Strategies Implementation

/**
 * Cache First - for static assets
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // If static asset and offline, return offline page
        if (request.destination === 'document') {
            return caches.match('/offline.html');
        }
        throw error;
    }
}

/**
 * Network First - for API requests
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            // Cache successful API responses
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // If no cache available, return offline response
        return new Response(JSON.stringify({
            error: 'Offline',
            message: 'No hay conexión disponible'
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Stale While Revalidate - for documents
 */
async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);
    const networkPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            const cache = caches.open(DYNAMIC_CACHE_NAME);
            cache.then(c => c.put(request, networkResponse.clone()));
        }
        return networkResponse;
    }).catch(() => cachedResponse);
    
    return cachedResponse || networkPromise;
}

/**
 * Handle OCR uploads with offline queuing
 */
async function handleOCRUpload(request) {
    try {
        const response = await fetch(request);
        return response;
    } catch (error) {
        // Queue upload for when online
        await queueOfflineUpload(request);
        
        return new Response(JSON.stringify({
            success: true,
            queued: true,
            message: 'Upload guardado. Se procesará cuando esté online.'
        }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Network with offline queue fallback
 */
async function networkWithOfflineQueue(request) {
    try {
        const response = await fetch(request);
        return response;
    } catch (error) {
        // Queue request for later
        await queueOfflineRequest(request);
        
        return new Response(JSON.stringify({
            error: 'Queued',
            message: 'Acción guardada. Se ejecutará cuando esté online.'
        }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Utility Functions

function isStaticAsset(request) {
    return request.destination === 'script' ||
           request.destination === 'style' ||
           request.destination === 'image' ||
           request.destination === 'font';
}

function isAPIRequest(request) {
    return request.url.includes('/api/');
}

function isDocumentRequest(request) {
    return request.destination === 'document';
}

function isOCRUpload(request) {
    return request.url.includes('/api/ocr/upload');
}

async function initializeOfflineQueue() {
    const db = await openDB('OfflineQueue', 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('uploads')) {
                db.createObjectStore('uploads', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('requests')) {
                db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
            }
        }
    });
    return db;
}

async function queueOfflineUpload(request) {
    const db = await initializeOfflineQueue();
    const formData = await request.formData();
    
    // Convert FormData to storable format
    const uploadData = {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        files: [],
        fields: {}
    };
    
    for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
            uploadData.files.push({
                fieldName: key,
                fileName: value.name,
                type: value.type,
                data: await value.arrayBuffer()
            });
        } else {
            uploadData.fields[key] = value;
        }
    }
    
    uploadData.timestamp = Date.now();
    
    const tx = db.transaction('uploads', 'readwrite');
    await tx.store.add(uploadData);
    
    // Register for background sync
    self.registration.sync.register('offline-uploads');
}

async function processOfflineQueue() {
    const db = await initializeOfflineQueue();
    const tx = db.transaction(['uploads', 'requests'], 'readonly');
    const uploads = await tx.objectStore('uploads').getAll();
    const requests = await tx.objectStore('requests').getAll();
    
    // Process uploads
    for (const upload of uploads) {
        try {
            const formData = new FormData();
            
            // Add files
            for (const file of upload.files) {
                const blob = new Blob([file.data], { type: file.type });
                formData.append(file.fieldName, blob, file.fileName);
            }
            
            // Add fields
            for (const [key, value] of Object.entries(upload.fields)) {
                formData.append(key, value);
            }
            
            const response = await fetch(upload.url, {
                method: upload.method,
                body: formData
            });
            
            if (response.ok) {
                // Remove from queue
                const deleteTx = db.transaction('uploads', 'readwrite');
                await deleteTx.store.delete(upload.id);
                
                // Notify user
                self.registration.showNotification('Upload Completado', {
                    body: 'Tu documento ha sido procesado exitosamente',
                    icon: '/icons/icon-192x192.png'
                });
            }
        } catch (error) {
            console.error('Failed to process queued upload:', error);
        }
    }
    
    // Process other requests
    for (const req of requests) {
        try {
            const response = await fetch(req.url, {
                method: req.method,
                headers: req.headers,
                body: req.body
            });
            
            if (response.ok) {
                const deleteTx = db.transaction('requests', 'readwrite');
                await deleteTx.store.delete(req.id);
            }
        } catch (error) {
            console.error('Failed to process queued request:', error);
        }
    }
}

// IndexedDB helper
function openDB(name, version, upgrade) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, version);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => upgrade(request.result);
    });
}
```

#### 4. Mobile API Optimizations
**Extensión de:** `src/server/routes/ocr-routes.js`

```javascript
// Mobile-specific OCR upload endpoint
router.post('/upload-mobile', authenticateToken, async (req, res) => {
    try {
        const upload = multer({
            storage: multer.memoryStorage(),
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB max for mobile
                files: 1
            },
            fileFilter: (req, file, cb) => {
                if (file.mimetype.startsWith('image/')) {
                    cb(null, true);
                } else {
                    cb(new Error('Only image files allowed'), false);
                }
            }
        }).single('document');
        
        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            
            const { deviceInfo, connectionType, source } = req.body;
            const file = req.file;
            
            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
            
            // Mobile-optimized processing
            const processingOptions = {
                source: 'mobile',
                deviceInfo: JSON.parse(deviceInfo || '{}'),
                connectionType: connectionType || 'unknown',
                optimizeForMobile: true
            };
            
            // Add to processing queue with mobile priority
            const queueItem = await ocrQueue.add('mobile-ocr-processing', {
                buffer: file.buffer,
                filename: file.originalname,
                mimetype: file.mimetype,
                userId: req.user.id,
                clientId: req.user.clientId,
                processingOptions
            }, {
                priority: 10, // High priority for mobile uploads
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                }
            });
            
            res.json({
                success: true,
                queueId: queueItem.id,
                estimatedProcessingTime: calculateMobileProcessingTime(processingOptions),
                message: 'Imagen recibida y en procesamiento'
            });
        });
        
    } catch (error) {
        console.error('Mobile upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mobile processing status endpoint
router.get('/mobile/status/:queueId', authenticateToken, async (req, res) => {
    try {
        const { queueId } = req.params;
        const job = await ocrQueue.getJob(queueId);
        
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        const status = {
            id: job.id,
            status: await job.getState(),
            progress: job.progress(),
            result: job.returnvalue,
            error: job.failedReason,
            createdAt: job.timestamp,
            processedAt: job.processedOn,
            finishedAt: job.finishedOn
        };
        
        res.json(status);
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: error.message });
    }
});

function calculateMobileProcessingTime(options) {
    let baseTime = 15; // seconds
    
    // Adjust based on device capabilities
    if (options.deviceInfo.memory < 2) {
        baseTime += 10;
    }
    if (options.deviceInfo.cpuClass < 4) {
        baseTime += 5;
    }
    
    // Adjust based on connection
    switch (options.connectionType) {
        case 'slow-2g':
        case '2g':
            baseTime += 20;
            break;
        case '3g':
            baseTime += 10;
            break;
    }
    
    return baseTime;
}
```

#### 5. Database Schema Extensions
**Extensión de:** `src/database/schemas/ocr-tables.sql`

```sql
-- Tabla para tracking de uploads móviles
CREATE TABLE IF NOT EXISTS mobile_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    client_id INTEGER,
    device_info JSON,
    connection_type TEXT,
    upload_source TEXT DEFAULT 'mobile_camera', -- 'mobile_camera', 'mobile_gallery'
    file_size INTEGER,
    processing_time_ms INTEGER,
    queue_wait_time_ms INTEGER,
    success BOOLEAN DEFAULT 0,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla para offline queue tracking
CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action_type TEXT NOT NULL, -- 'upload', 'approval', 'correction'
    action_data JSON NOT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    next_retry_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla para PWA installation tracking
CREATE TABLE IF NOT EXISTS pwa_installations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL, -- 'android', 'ios', 'desktop'
    user_agent TEXT,
    installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    push_enabled BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla para mobile performance metrics
CREATE TABLE IF NOT EXISTS mobile_performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    device_type TEXT, -- 'phone', 'tablet'
    platform TEXT, -- 'android', 'ios'
    connection_type TEXT,
    page_load_time_ms INTEGER,
    camera_init_time_ms INTEGER,
    upload_speed_kbps REAL,
    battery_level INTEGER, -- when available
    memory_usage_mb INTEGER, -- when available
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mobile_uploads_user_created ON mobile_uploads(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mobile_uploads_success ON mobile_uploads(success);
CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_sync_queue(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_offline_queue_user ON offline_sync_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pwa_installations_user ON pwa_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_performance_user_recorded ON mobile_performance_metrics(user_id, recorded_at);
```

---

## 🔗 Integration Requirements

### IR1: Full System Integration
- Seamless integration con ML pipeline (4.1)
- AFIP validation integration en mobile uploads (4.2) 
- Workflow routing para mobile-captured documents (4.3)
- Mobile analytics tracking integration (4.4)
- Complete feature parity con desktop experience

### IR2: Performance Optimization
- Adaptive processing basado en device capabilities
- Network-aware optimization para different connection types
- Progressive image loading y compression
- Memory management para low-end devices
- Battery optimization para extended usage

### IR3: Offline Capabilities
- Offline-first architecture con background sync
- IndexedDB storage para queued uploads y actions
- Service Worker caching strategies
- Network detection y automatic sync when online
- Offline analytics tracking

### IR4: Native Mobile Features
- Camera API integration con quality optimization
- Push notifications para processing status
- PWA installation prompts y shortcuts
- Touch gestures y mobile UX patterns
- Device orientation y screen size adaptation

---

## 🧪 Testing Requirements

### Mobile Device Testing
- [ ] iOS Safari (iPhone 12+, iPad)
- [ ] Android Chrome (Samsung, Pixel, low-end devices)
- [ ] Different screen sizes (320px - 1024px+)
- [ ] Various network conditions (3G, 4G, 5G, WiFi)
- [ ] Battery saver mode compatibility

### Functionality Testing
- [ ] Camera capture en different lighting conditions
- [ ] Image quality optimization validation
- [ ] Offline functionality complete workflow
- [ ] Background sync reliability
- [ ] PWA installation y shortcuts

### Performance Testing
- [ ] Page load times on mobile networks
- [ ] Camera initialization speed
- [ ] Upload performance con different file sizes
- [ ] Memory usage monitoring
- [ ] Battery drain analysis

### User Experience Testing
- [ ] Touch interface usability
- [ ] Gesture recognition accuracy
- [ ] Loading states y progress indicators
- [ ] Error handling y user feedback
- [ ] Accessibility compliance (mobile)

---

## 📊 Success Metrics

### Quantitative Metrics
1. **Mobile Adoption**
   - Target: 40%+ uploads desde mobile devices
   - Target: 95%+ mobile processing success rate
   - Measurement: Mobile vs desktop usage ratio

2. **Performance Benchmarks**
   - Target: <3s camera initialization time
   - Target: <15s total processing time (capture → result)
   - Target: 99%+ offline sync success rate
   - Target: <2MB data usage per upload average

3. **User Engagement**
   - Target: 80%+ users install PWA after 3 mobile sessions
   - Target: 60%+ daily active mobile users
   - Target: <5% mobile abandonment rate during capture

### Qualitative Metrics
1. **User Experience**
   - Intuitive camera interface feedback
   - Seamless offline-to-online transition
   - Native app-like performance feel
   - Positive reviews en mobile usability

2. **Business Impact**
   - Faster document turnaround time
   - Increased field productivity
   - Reduced manual data entry errors
   - Competitive differentiation

---

## 🚀 Implementation Plan

### Week 11: Mobile Foundation & PWA Setup
**Days 1-2: PWA Infrastructure**
- [ ] Setup PWA manifest y service worker
- [ ] Implement offline caching strategies
- [ ] Create mobile-optimized build configuration
- [ ] Setup mobile-specific routes y layouts

**Days 3-5: Mobile Camera Integration**
- [ ] Implement MobileOCRCapture component
- [ ] Camera API integration con optimizations
- [ ] Device capability detection
- [ ] Image pre-processing para mobile

### Week 12: Offline Capabilities & Upload Optimization
**Days 1-3: Offline Functionality**
- [ ] IndexedDB offline queue implementation
- [ ] Background sync service worker integration
- [ ] Offline UI states y messaging
- [ ] Network detection y auto-sync logic

**Days 4-5: Upload Optimization**
- [ ] Mobile-specific API endpoints
- [ ] Adaptive compression basado en connection type
- [ ] Progress tracking y user feedback
- [ ] Error handling y retry mechanisms

### Week 13: Testing, Polish & Deployment
**Days 1-3: Comprehensive Testing**
- [ ] Cross-device compatibility testing
- [ ] Network condition simulation testing
- [ ] Performance benchmarking
- [ ] User acceptance testing en different devices

**Days 4-5: Polish & Production**
- [ ] UI/UX refinements basado en testing feedback
- [ ] Performance optimizations
- [ ] PWA store submission preparation
- [ ] Documentation y user guides

---

## ⚠️ Risk Mitigation

### Technical Risks
1. **Device Compatibility**
   - *Risk:* Camera API compatibility issues en older devices
   - *Mitigation:* Progressive enhancement, fallback mechanisms, thorough testing

2. **Performance on Low-end Devices**
   - *Risk:* App crashes o poor performance en dispositivos con recursos limitados
   - *Mitigation:* Adaptive processing, memory management, performance monitoring

3. **Network Reliability**
   - *Risk:* Upload failures en poor network conditions
   - *Mitigation:* Robust retry logic, offline queuing, adaptive compression

### Business Risks
1. **User Adoption**
   - *Risk:* Users prefer desktop interface over mobile
   - *Mitigation:* Intuitive UX design, progressive disclosure, user training

2. **Data Usage Concerns**
   - *Risk:* Users avoid mobile uploads due to data costs
   - *Mitigation:* Compression optimization, data usage transparency, WiFi prompts

---

## 📋 Definition of Done

### Technical DoD
- [ ] PWA fully functional con offline capabilities
- [ ] Camera capture working en all supported devices
- [ ] Service worker implementing all caching strategies
- [ ] Mobile API endpoints optimized para performance
- [ ] Offline sync queue functioning reliably
- [ ] Cross-device testing completed successfully

### Quality DoD
- [ ] Unit test coverage >80% para mobile-specific components
- [ ] Integration tests passing para offline functionality
- [ ] Performance benchmarks meeting mobile targets
- [ ] Accessibility testing passing en mobile screens
- [ ] Security audit passed para mobile data handling

### Business DoD
- [ ] Product Owner acceptance de all AC
- [ ] User testing con positive feedback from mobile users
- [ ] PWA installation rate meets targets
- [ ] Mobile processing success rate >95%
- [ ] Ready for App Store submission (if applicable)
- [ ] Mobile user training materials complete

---

## 📞 Contact & Support

**Product Owner:** Sarah  
**Mobile Developer:** [To be assigned]  
**Technical Architect:** Winston  
**UX Designer:** [To be assigned]  

**Questions/Clarifications:** Contact Product Owner para business requirements o Technical Architect para implementation details.

---

*Documento creado el 2025-08-19 como parte del Epic 4: OCR Intelligence & Automation - Fase 4 (Mobile)*