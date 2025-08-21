# User Story 4.3: Automated Workflow & Smart Routing

**Epic:** 4 - OCR Intelligence & Automation  
**Fecha:** 2025-08-19  
**Versión:** 1.0  
**Estado:** Ready for Development  
**Asignado a:** Development Team  
**Estimación:** 4 semanas (Semanas 7-10 de Epic 4)  
**Dependencias:** User Story 4.1 (ML Foundation), User Story 4.2 (AFIP Validation)

---

## 📋 User Story

**Como administrador,**  
**Quiero flujos de trabajo automatizados según el tipo y confianza del documento,**  
**Para optimizar el proceso de revisión y aprobación.**

---

## 🎯 Business Value

- **Efficiency Gain:** 70% reducción en intervención manual para documentos de alta confianza
- **SLA Compliance:** <4h average resolution time para exceptions
- **Scalability:** Sistema que escala automáticamente con volumen de documentos
- **Cost Reduction:** 50% reducción en tiempo administrativo de approvals

---

## ✅ Acceptance Criteria

### AC1: Smart Workflow Engine
**DADO** que el sistema OCR completa procesamiento y validaciones
**CUANDO** se determina el confidence score y tipo de documento
**ENTONCES** debe enrutar automáticamente según reglas configurables

#### Criterios específicos:
- [ ] Auto-routing basado en confidence threshold configurable por cliente
- [ ] Workflow diferenciado por tipo de documento (factura/extracto/recibo)
- [ ] Escalación automática para casos complejos o de baja confianza
- [ ] Queue management inteligente con priorización automática
- [ ] SLA tracking con alertas automáticas por vencimiento

### AC2: Approval Process Integration
**DADO** que un documento requiere approval manual
**CUANDO** se asigna a un usuario según su rol
**ENTONCES** debe notificar automáticamente y trackear el proceso

#### Criterios específicos:
- [ ] Integración seamless con sistema de roles existente (Admin/Contador/Cliente)
- [ ] Auto-approval para documentos de alta confianza (>95%) y proveedores conocidos
- [ ] Notificaciones automáticas por WebSocket para pending approvals
- [ ] Dashboard de pending approvals con filtros avanzados y bulk actions
- [ ] Audit trail completo de todas las decisiones tomadas

### AC3: Business Rules Engine
**DADO** que se configura un cliente en el sistema
**CUANDO** el administrador define reglas específicas de workflow
**ENTONCES** el sistema debe aplicar estas reglas automáticamente

#### Criterios específicos:
- [ ] Reglas configurables por cliente para auto-processing
- [ ] Exception handling automático con escalación definida
- [ ] Configuración de thresholds por proveedor/tipo documento
- [ ] Templates de workflow pre-configurados por industria
- [ ] Versionado de reglas con rollback capability

### AC4: Performance Monitoring & Optimization
**DADO** que el workflow engine está procesando documentos
**CUANDO** se monitorizan métricas de performance
**ENTONCES** debe optimizar automáticamente rutas y prioridades

#### Criterios específicos:
- [ ] Metrics collection en tiempo real de workflow performance
- [ ] Auto-optimization de routing basado en success patterns
- [ ] Bottleneck detection con sugerencias automáticas
- [ ] Load balancing entre reviewers disponibles
- [ ] Predictive queuing basado en patrones históricos

---

## 🏗️ Technical Specifications

### Core Components to Develop

#### 1. WorkflowEngine
**Ubicación:** `src/server/services/workflow-engine-service.js`

```javascript
class WorkflowEngine {
    constructor() {
        this.ruleEngine = require('./business-rules-engine');
        this.notificationService = require('./notification-service');
        this.userService = require('./user-service');
        this.metricsCollector = require('./workflow-metrics-collector');
    }
    
    /**
     * Procesa documento y determina routing automático
     * @param {Object} ocrResult - Resultado del OCR con ML y validaciones AFIP
     * @param {Object} clientConfig - Configuración específica del cliente
     * @returns {Object} Workflow decision y routing
     */
    async routeDocument(ocrResult, clientConfig) {
        try {
            // 1. Evaluar confidence score y validaciones
            const confidence = this.calculateOverallConfidence(ocrResult);
            const validationStatus = this.evaluateValidationStatus(ocrResult.afipValidations);
            
            // 2. Aplicar reglas de negocio
            const routingDecision = await this.ruleEngine.evaluate({
                confidence,
                validationStatus,
                documentType: ocrResult.documentType,
                providerCuit: ocrResult.providerCuit,
                amount: ocrResult.totalAmount,
                clientId: clientConfig.clientId
            });
            
            // 3. Determinar acción automática
            const workflowAction = await this.determineWorkflowAction(routingDecision);
            
            // 4. Ejecutar routing
            const routingResult = await this.executeRouting(workflowAction, ocrResult);
            
            // 5. Crear audit trail
            await this.createWorkflowAuditEntry({
                documentId: ocrResult.documentId,
                routingDecision,
                workflowAction,
                routingResult,
                executedAt: new Date()
            });
            
            return routingResult;
        } catch (error) {
            console.error('Workflow routing error:', error);
            // Fallback a manual review en caso de error
            return this.fallbackToManualReview(ocrResult, error);
        }
    }
    
    /**
     * Procesamiento de auto-approval para documentos de alta confianza
     * @param {string} documentId - ID del documento
     * @param {Object} workflowRules - Reglas aplicables
     * @returns {Object} Resultado de auto-approval
     */
    async processAutoApproval(documentId, workflowRules) {
        try {
            const document = await this.getDocumentDetails(documentId);
            
            // Verificar que cumple criterios de auto-approval
            const eligibleForAutoApproval = await this.checkAutoApprovalEligibility(
                document, 
                workflowRules
            );
            
            if (!eligibleForAutoApproval.eligible) {
                return {
                    approved: false,
                    reason: eligibleForAutoApproval.reason,
                    requiresManualReview: true
                };
            }
            
            // Ejecutar auto-approval
            const approvalResult = await this.executeAutoApproval(document, workflowRules);
            
            // Notificaciones automáticas
            await this.sendAutoApprovalNotifications(document, approvalResult);
            
            // Métricas
            await this.metricsCollector.recordAutoApproval({
                documentId,
                confidence: document.confidence,
                executionTime: Date.now() - document.processedAt,
                success: approvalResult.success
            });
            
            return approvalResult;
        } catch (error) {
            console.error('Auto-approval error:', error);
            return this.escalateToHuman(documentId, 'auto_approval_error', error);
        }
    }
    
    /**
     * Escalación automática a revisión humana
     * @param {string} documentId - ID del documento
     * @param {string} reason - Razón de escalación
     * @param {Object} context - Contexto adicional
     * @returns {Object} Resultado de escalación
     */
    async escalateToHuman(documentId, reason, context = {}) {
        try {
            const document = await this.getDocumentDetails(documentId);
            
            // Determinar reviewer apropiado basado en carga de trabajo y expertise
            const assignedReviewer = await this.findBestReviewer({
                documentType: document.documentType,
                complexity: this.calculateComplexity(document),
                priority: this.calculatePriority(document, reason),
                clientId: document.clientId
            });
            
            // Crear task de revisión manual
            const reviewTask = await this.createReviewTask({
                documentId,
                assignedTo: assignedReviewer.userId,
                reason,
                priority: this.calculatePriority(document, reason),
                context,
                dueDate: this.calculateSLADueDate(reason, document.clientSLA),
                createdAt: new Date()
            });
            
            // Notificación inmediata al reviewer
            await this.notificationService.sendUrgentNotification({
                userId: assignedReviewer.userId,
                type: 'document_review_required',
                documentId,
                reason,
                priority: reviewTask.priority,
                estimatedEffort: this.estimateReviewEffort(document)
            });
            
            // WebSocket real-time update
            this.broadcastWorkflowUpdate({
                type: 'escalation_created',
                documentId,
                assignedTo: assignedReviewer.userId,
                reason,
                reviewTask
            });
            
            return {
                escalated: true,
                assignedTo: assignedReviewer,
                reviewTask,
                estimatedResolutionTime: reviewTask.dueDate
            };
        } catch (error) {
            console.error('Escalation error:', error);
            throw error;
        }
    }
    
    /**
     * Optimización automática de workflows basada en metrics
     */
    async optimizeWorkflows() {
        try {
            const metrics = await this.metricsCollector.getWorkflowMetrics({
                period: '30d'
            });
            
            // Identificar bottlenecks
            const bottlenecks = this.identifyBottlenecks(metrics);
            
            // Sugerir optimizaciones
            const optimizations = await this.generateOptimizations(bottlenecks);
            
            // Auto-aplicar optimizaciones seguras
            const safeOptimizations = optimizations.filter(opt => opt.risk === 'low');
            for (const optimization of safeOptimizations) {
                await this.applyOptimization(optimization);
            }
            
            // Notificar admin sobre optimizaciones aplicadas y sugerencias
            await this.notificationService.sendAdminReport({
                type: 'workflow_optimization_report',
                appliedOptimizations: safeOptimizations,
                suggestedOptimizations: optimizations.filter(opt => opt.risk !== 'low'),
                bottlenecks,
                metrics
            });
            
            return {
                bottlenecksFound: bottlenecks.length,
                optimizationsApplied: safeOptimizations.length,
                suggestionsGenerated: optimizations.length - safeOptimizations.length
            };
        } catch (error) {
            console.error('Workflow optimization error:', error);
            throw error;
        }
    }
}

module.exports = WorkflowEngine;
```

#### 2. Business Rules Engine
**Ubicación:** `src/server/services/business-rules-engine.js`

```javascript
class BusinessRulesEngine {
    constructor() {
        this.rulesCache = new Map();
        this.ruleTemplates = require('../config/workflow-rule-templates');
    }
    
    /**
     * Evalúa documento contra reglas de negocio configuradas
     * @param {Object} documentContext - Contexto completo del documento
     * @returns {Object} Decisión de routing
     */
    async evaluate(documentContext) {
        try {
            const clientRules = await this.getClientRules(documentContext.clientId);
            const applicableRules = this.filterApplicableRules(clientRules, documentContext);
            
            let finalDecision = {
                action: 'manual_review', // default fallback
                priority: 'medium',
                assignTo: null,
                autoApprove: false,
                escalate: false,
                reasoning: []
            };
            
            // Evaluar reglas en orden de prioridad
            for (const rule of this.sortRulesByPriority(applicableRules)) {
                const ruleResult = await this.evaluateRule(rule, documentContext);
                
                if (ruleResult.matches) {
                    finalDecision = this.mergeDecisions(finalDecision, ruleResult.decision);
                    finalDecision.reasoning.push({
                        ruleId: rule.id,
                        ruleName: rule.name,
                        matched: true,
                        contribution: ruleResult.decision
                    });
                    
                    // Si la regla es definitiva, parar evaluación
                    if (rule.isDefinitive) {
                        break;
                    }
                }
            }
            
            return finalDecision;
        } catch (error) {
            console.error('Rules evaluation error:', error);
            return {
                action: 'manual_review',
                priority: 'high',
                error: error.message,
                reasoning: ['Error in rules evaluation - fallback to manual review']
            };
        }
    }
    
    /**
     * Crea reglas de workflow por cliente
     */
    async createClientWorkflowRules(clientId, ruleSet) {
        try {
            const validatedRules = await this.validateRuleSet(ruleSet);
            
            const clientRules = {
                clientId,
                version: this.generateRuleVersion(),
                rules: validatedRules,
                createdAt: new Date(),
                isActive: true
            };
            
            await this.saveClientRules(clientRules);
            this.invalidateRulesCache(clientId);
            
            return clientRules;
        } catch (error) {
            console.error('Error creating client workflow rules:', error);
            throw error;
        }
    }
    
    /**
     * Evalúa regla individual
     */
    async evaluateRule(rule, context) {
        const conditions = rule.conditions;
        let allConditionsMet = true;
        
        for (const condition of conditions) {
            const conditionResult = await this.evaluateCondition(condition, context);
            if (!conditionResult) {
                allConditionsMet = false;
                break;
            }
        }
        
        return {
            matches: allConditionsMet,
            decision: allConditionsMet ? rule.action : null
        };
    }
    
    /**
     * Evalúa condición específica
     */
    async evaluateCondition(condition, context) {
        switch (condition.type) {
            case 'confidence_threshold':
                return context.confidence >= condition.threshold;
            
            case 'document_type':
                return condition.allowedTypes.includes(context.documentType);
            
            case 'amount_range':
                return context.amount >= condition.min && context.amount <= condition.max;
            
            case 'provider_whitelist':
                const knownProviders = await this.getKnownProviders(context.clientId);
                return knownProviders.includes(context.providerCuit);
            
            case 'validation_status':
                return this.checkValidationStatus(context.validationStatus, condition.required);
            
            case 'time_of_day':
                const currentHour = new Date().getHours();
                return currentHour >= condition.startHour && currentHour <= condition.endHour;
            
            case 'custom_javascript':
                return this.evaluateCustomCondition(condition.code, context);
            
            default:
                console.warn(`Unknown condition type: ${condition.type}`);
                return false;
        }
    }
}

module.exports = BusinessRulesEngine;
```

#### 3. Workflow Dashboard Component
**Ubicación:** `src/client/components/ocr/WorkflowDashboard.jsx`

```jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Alert, AlertDescription } from '../ui/Alert';
import { 
    CheckCircle, Clock, AlertTriangle, Users, 
    Filter, Search, MoreHorizontal, Eye,
    TrendingUp, BarChart3
} from 'lucide-react';

const WorkflowDashboard = () => {
    const [workflowItems, setWorkflowItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'all',
        priority: 'all',
        assignedTo: 'all',
        documentType: 'all'
    });
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [metrics, setMetrics] = useState(null);
    
    useEffect(() => {
        fetchWorkflowData();
        fetchWorkflowMetrics();
        
        // Setup WebSocket para updates en tiempo real
        const ws = new WebSocket(process.env.REACT_APP_WS_URL);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type.startsWith('workflow_')) {
                handleWorkflowUpdate(data);
            }
        };
        
        return () => ws.close();
    }, []);
    
    const fetchWorkflowData = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/workflow/pending');
            const data = await response.json();
            setWorkflowItems(data.items);
        } catch (error) {
            console.error('Error fetching workflow data:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const fetchWorkflowMetrics = async () => {
        try {
            const response = await fetch('/api/workflow/metrics');
            const data = await response.json();
            setMetrics(data);
        } catch (error) {
            console.error('Error fetching workflow metrics:', error);
        }
    };
    
    const handleWorkflowUpdate = (data) => {
        switch (data.type) {
            case 'workflow_item_created':
                setWorkflowItems(prev => [data.item, ...prev]);
                break;
            case 'workflow_item_updated':
                setWorkflowItems(prev => prev.map(item => 
                    item.id === data.item.id ? data.item : item
                ));
                break;
            case 'workflow_item_completed':
                setWorkflowItems(prev => prev.filter(item => item.id !== data.itemId));
                break;
        }
    };
    
    const filteredItems = useMemo(() => {
        return workflowItems.filter(item => {
            if (filters.status !== 'all' && item.status !== filters.status) return false;
            if (filters.priority !== 'all' && item.priority !== filters.priority) return false;
            if (filters.assignedTo !== 'all' && item.assignedTo !== filters.assignedTo) return false;
            if (filters.documentType !== 'all' && item.documentType !== filters.documentType) return false;
            return true;
        });
    }, [workflowItems, filters]);
    
    const handleBulkAction = async (action) => {
        if (selectedItems.size === 0) return;
        
        try {
            const response = await fetch('/api/workflow/bulk-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    itemIds: Array.from(selectedItems)
                })
            });
            
            if (response.ok) {
                setSelectedItems(new Set());
                fetchWorkflowData(); // Refresh data
            }
        } catch (error) {
            console.error('Bulk action error:', error);
        }
    };
    
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critical': return 'destructive';
            case 'high': return 'destructive';
            case 'medium': return 'warning';
            case 'low': return 'secondary';
            default: return 'default';
        }
    };
    
    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
            case 'in_review': return <Eye className="h-4 w-4 text-blue-500" />;
            case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'escalated': return <AlertTriangle className="h-4 w-4 text-red-500" />;
            default: return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };
    
    return (
        <div className="space-y-6">
            {/* Metrics Cards */}
            {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <Clock className="h-5 w-5 text-blue-500" />
                                <div>
                                    <p className="text-2xl font-bold">{metrics.pendingItems}</p>
                                    <p className="text-sm text-gray-600">Pending Review</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <TrendingUp className="h-5 w-5 text-green-500" />
                                <div>
                                    <p className="text-2xl font-bold">{metrics.autoApprovalRate}%</p>
                                    <p className="text-sm text-gray-600">Auto-approved</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <BarChart3 className="h-5 w-5 text-purple-500" />
                                <div>
                                    <p className="text-2xl font-bold">{metrics.averageResolutionTime}h</p>
                                    <p className="text-sm text-gray-600">Avg Resolution</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <Users className="h-5 w-5 text-orange-500" />
                                <div>
                                    <p className="text-2xl font-bold">{metrics.activeReviewers}</p>
                                    <p className="text-sm text-gray-600">Active Reviewers</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            
            {/* Filters and Actions */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Workflow Queue</h2>
                        <div className="flex items-center space-x-2">
                            <select 
                                value={filters.priority} 
                                onChange={(e) => setFilters(prev => ({...prev, priority: e.target.value}))}
                                className="px-3 py-1 border rounded-md"
                            >
                                <option value="all">All Priorities</option>
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                            
                            <select 
                                value={filters.status} 
                                onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))}
                                className="px-3 py-1 border rounded-md"
                            >
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="in_review">In Review</option>
                                <option value="escalated">Escalated</option>
                            </select>
                            
                            {selectedItems.size > 0 && (
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">
                                        {selectedItems.size} selected
                                    </span>
                                    <Button 
                                        size="sm" 
                                        onClick={() => handleBulkAction('approve')}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        Bulk Approve
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleBulkAction('assign_to_me')}
                                    >
                                        Assign to Me
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Clock className="h-6 w-6 animate-spin" />
                            <span className="ml-2">Loading workflow items...</span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredItems.map((item) => (
                                <div 
                                    key={item.id}
                                    className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.has(item.id)}
                                        onChange={(e) => {
                                            const newSelected = new Set(selectedItems);
                                            if (e.target.checked) {
                                                newSelected.add(item.id);
                                            } else {
                                                newSelected.delete(item.id);
                                            }
                                            setSelectedItems(newSelected);
                                        }}
                                        className="rounded"
                                    />
                                    
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            {getStatusIcon(item.status)}
                                            <span className="font-medium">{item.documentType}</span>
                                            <Badge variant={getPriorityColor(item.priority)}>
                                                {item.priority}
                                            </Badge>
                                            <span className="text-sm text-gray-600">
                                                {item.providerName || item.providerCuit}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                            <span>Amount: ${item.totalAmount?.toLocaleString()}</span>
                                            <span>Confidence: {item.confidence}%</span>
                                            <span>Created: {new Date(item.createdAt).toLocaleString()}</span>
                                            {item.dueDate && (
                                                <span className={
                                                    new Date(item.dueDate) < new Date() ? 'text-red-600' : ''
                                                }>
                                                    Due: {new Date(item.dueDate).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => window.open(`/documents/${item.documentId}`, '_blank')}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            size="sm"
                                            onClick={() => handleItemAction(item.id, 'approve')}
                                        >
                                            Approve
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            
                            {filteredItems.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    No workflow items match your filters.
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default WorkflowDashboard;
```

#### 4. Database Schema Extensions
**Extensión de:** `src/database/schemas/ocr-tables.sql`

```sql
-- Tabla principal de workflow items
CREATE TABLE IF NOT EXISTS workflow_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    workflow_type TEXT NOT NULL, -- 'auto_approval', 'manual_review', 'escalation'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_review', 'approved', 'rejected', 'escalated'
    priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    assigned_to INTEGER, -- user_id
    created_by_rule_id INTEGER, -- reference to rule that created this item
    confidence_score REAL,
    reason TEXT,
    context_data JSON,
    due_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (document_id) REFERENCES ocr_processing_log(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Tabla de reglas de workflow por cliente
CREATE TABLE IF NOT EXISTS client_workflow_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    rule_name TEXT NOT NULL,
    rule_description TEXT,
    conditions JSON NOT NULL, -- Array of conditions
    actions JSON NOT NULL, -- Actions to take when conditions match
    priority INTEGER DEFAULT 100, -- Lower numbers = higher priority
    is_active BOOLEAN DEFAULT 1,
    is_definitive BOOLEAN DEFAULT 0, -- Stop evaluation after this rule matches
    version TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de audit trail para workflow decisions
CREATE TABLE IF NOT EXISTS workflow_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    workflow_item_id INTEGER,
    action_type TEXT NOT NULL, -- 'created', 'assigned', 'approved', 'escalated', 'completed'
    performed_by INTEGER, -- user_id, NULL for system actions
    rule_id INTEGER, -- rule that triggered this action
    previous_status TEXT,
    new_status TEXT,
    reasoning TEXT,
    execution_time_ms INTEGER,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES ocr_processing_log(id),
    FOREIGN KEY (workflow_item_id) REFERENCES workflow_items(id),
    FOREIGN KEY (performed_by) REFERENCES users(id),
    FOREIGN KEY (rule_id) REFERENCES client_workflow_rules(id)
);

-- Tabla de métricas de workflow performance
CREATE TABLE IF NOT EXISTS workflow_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    metric_type TEXT NOT NULL, -- 'auto_approval_rate', 'avg_resolution_time', etc.
    metric_value REAL NOT NULL,
    measurement_period TEXT, -- 'daily', 'weekly', 'monthly'
    measurement_date DATE NOT NULL,
    additional_data JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de templates de workflow pre-configurados
CREATE TABLE IF NOT EXISTS workflow_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL,
    template_description TEXT,
    industry_type TEXT, -- 'accounting', 'legal', 'retail', etc.
    rules_template JSON NOT NULL,
    default_settings JSON,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_workflow_items_status ON workflow_items(status);
CREATE INDEX IF NOT EXISTS idx_workflow_items_priority ON workflow_items(priority);
CREATE INDEX IF NOT EXISTS idx_workflow_items_assigned_to ON workflow_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_workflow_items_client_id ON workflow_items(client_id);
CREATE INDEX IF NOT EXISTS idx_workflow_items_due_date ON workflow_items(due_date);
CREATE INDEX IF NOT EXISTS idx_client_workflow_rules_client_id ON client_workflow_rules(client_id);
CREATE INDEX IF NOT EXISTS idx_client_workflow_rules_active ON client_workflow_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_document_id ON workflow_audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_workflow_item ON workflow_audit_log(workflow_item_id);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_client_id ON workflow_metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_type_date ON workflow_metrics(metric_type, measurement_date);
```

#### 5. API Routes
**Nuevo archivo:** `src/server/routes/workflow-routes.js`

```javascript
const express = require('express');
const router = express.Router();
const WorkflowEngine = require('../services/workflow-engine-service');
const BusinessRulesEngine = require('../services/business-rules-engine');
const { authenticateToken, requireRole } = require('../middleware/auth');

const workflowEngine = new WorkflowEngine();
const rulesEngine = new BusinessRulesEngine();

// GET /api/workflow/pending - Get pending workflow items
router.get('/pending', authenticateToken, async (req, res) => {
    try {
        const { status, priority, assignedTo, limit = 50 } = req.query;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        const filters = {
            status,
            priority,
            assignedTo: assignedTo === 'me' ? userId : assignedTo,
            limit: parseInt(limit)
        };
        
        const items = await workflowEngine.getPendingItems(filters, userRole);
        res.json({ items });
    } catch (error) {
        console.error('Error fetching pending workflow items:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/workflow/process/:documentId - Process document through workflow
router.post('/process/:documentId', authenticateToken, async (req, res) => {
    try {
        const { documentId } = req.params;
        const { clientConfig } = req.body;
        
        // Get OCR result with ML and AFIP validations
        const ocrResult = await getCompleteOCRResult(documentId);
        if (!ocrResult) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        const routingResult = await workflowEngine.routeDocument(ocrResult, clientConfig);
        
        // Broadcast update via WebSocket
        req.wsServer.broadcast({
            type: 'workflow_item_created',
            item: routingResult,
            documentId
        });
        
        res.json(routingResult);
    } catch (error) {
        console.error('Workflow processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/workflow/bulk-action - Perform bulk actions
router.post('/bulk-action', authenticateToken, async (req, res) => {
    try {
        const { action, itemIds } = req.body;
        const userId = req.user.id;
        
        const results = [];
        for (const itemId of itemIds) {
            try {
                const result = await workflowEngine.performAction(itemId, action, userId);
                results.push({ itemId, success: true, result });
            } catch (error) {
                results.push({ itemId, success: false, error: error.message });
            }
        }
        
        // Broadcast updates
        req.wsServer.broadcast({
            type: 'workflow_bulk_action_completed',
            action,
            results
        });
        
        res.json({ results });
    } catch (error) {
        console.error('Bulk action error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/workflow/metrics - Get workflow performance metrics
router.get('/metrics', authenticateToken, async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const metrics = await workflowEngine.getMetrics(period);
        res.json(metrics);
    } catch (error) {
        console.error('Error fetching workflow metrics:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/workflow/rules - Create/update client workflow rules
router.post('/rules', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { clientId, rules } = req.body;
        const result = await rulesEngine.createClientWorkflowRules(clientId, rules);
        res.json(result);
    } catch (error) {
        console.error('Error creating workflow rules:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/workflow/rules/:clientId - Get client workflow rules
router.get('/rules/:clientId', authenticateToken, async (req, res) => {
    try {
        const { clientId } = req.params;
        const rules = await rulesEngine.getClientRules(clientId);
        res.json(rules);
    } catch (error) {
        console.error('Error fetching workflow rules:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/workflow/optimize - Trigger workflow optimization
router.post('/optimize', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const optimizationResult = await workflowEngine.optimizeWorkflows();
        res.json(optimizationResult);
    } catch (error) {
        console.error('Workflow optimization error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

---

## 🔗 Integration Requirements

### IR1: User Management Integration
- Seamless integration con sistema de roles existente (Admin/Contador/Cliente)
- Respect user permissions para workflow actions
- Load balancing entre reviewers disponibles
- Role-based workflow routing y escalation

### IR2: Real-time Notifications
- WebSocket integration para instant updates
- Push notifications para mobile users
- Email notifications para SLA violations
- Slack/Teams integration para team notifications

### IR3: ML & AFIP Dependencies
- Consume ML confidence scores de User Story 4.1
- Integrate AFIP validation results de User Story 4.2
- Combined decision making basado en multiple factors
- Fallback mechanisms cuando dependencies fallan

### IR4: Performance & Scalability
- Async processing para no bloquear UI
- Database optimization para high-volume workflows
- Caching strategies para rules evaluation
- Horizontal scaling capability

---

## 🧪 Testing Requirements

### Unit Tests
- [ ] WorkflowEngine core methods testing
- [ ] BusinessRulesEngine rule evaluation testing
- [ ] Database operations para workflow tables
- [ ] Mock tests para notifications y external services

### Integration Tests
- [ ] End-to-end workflow: OCR → ML → AFIP → Routing → Approval
- [ ] WebSocket real-time updates testing
- [ ] User permissions y role-based access testing
- [ ] Bulk actions functionality testing

### Performance Tests
- [ ] High-volume workflow processing (1000+ concurrent items)
- [ ] Rules engine performance con complex rule sets
- [ ] Database query performance optimization
- [ ] Memory usage durante peak loads

### Business Logic Tests
- [ ] Different workflow scenarios testing
- [ ] Auto-approval logic validation
- [ ] Escalation triggers y routing accuracy
- [ ] SLA tracking y violation detection

---

## 📊 Success Metrics

### Quantitative Metrics
1. **Auto-approval Rate**
   - Target: 70%+ documents auto-approved for high-confidence cases
   - Measurement: Percentage of documents requiring no human intervention
   - Breakdown por document type y client

2. **Resolution Time**
   - Target: <4h average para manual review items
   - Target: <1h para escalated items
   - Measurement: Time from workflow creation to completion

3. **SLA Compliance**
   - Target: 95%+ items completed within SLA
   - Measurement: Percentage meeting defined SLAs
   - Alert threshold: <90%

### Qualitative Metrics
1. **User Satisfaction**
   - Reviewer satisfaction con workflow assignments
   - Admin satisfaction con configurability
   - Reduced manual effort feedback

2. **System Intelligence**
   - Improvement in routing accuracy over time
   - Reduction in mis-assignments
   - Optimization suggestions acceptance rate

---

## 🚀 Implementation Plan

### Week 7: Workflow Engine Foundation
**Days 1-3: Core Engine & Database**
- [ ] Implement WorkflowEngine core class
- [ ] Create database schema extensions
- [ ] Implement basic routing logic
- [ ] Setup workflow audit logging

**Days 4-5: Business Rules Engine**
- [ ] Implement BusinessRulesEngine
- [ ] Create rule evaluation framework
- [ ] Implement condition types
- [ ] Create rule templates

### Week 8: Smart Routing & Integration
**Days 1-3: ML & AFIP Integration**
- [ ] Integrate con ML confidence scores
- [ ] Integrate con AFIP validation results
- [ ] Implement smart routing algorithms
- [ ] Create auto-approval logic

**Days 4-5: Notification System**
- [ ] Implement WebSocket integration
- [ ] Create notification service
- [ ] Setup SLA tracking
- [ ] Implement escalation mechanisms

### Week 9: Dashboard & User Interface
**Days 1-3: Workflow Dashboard**
- [ ] Create WorkflowDashboard component
- [ ] Implement filtering y search
- [ ] Add bulk actions functionality
- [ ] Create metrics visualization

**Days 4-5: Configuration Interface**
- [ ] Create rules configuration UI
- [ ] Implement workflow templates
- [ ] Add client-specific customization
- [ ] Create admin management interface

### Week 10: Testing & Optimization
**Days 1-3: Comprehensive Testing**
- [ ] Unit tests para all workflow components
- [ ] Integration tests con dependencies
- [ ] Performance testing y optimization
- [ ] User acceptance testing

**Days 4-5: Polish & Documentation**
- [ ] Code review y refinements
- [ ] Performance optimization
- [ ] Documentation completa
- [ ] Deployment preparation

---

## ⚠️ Risk Mitigation

### Technical Risks
1. **Complex Rule Evaluation Performance**
   - *Risk:* Rule engine becomes bottleneck
   - *Mitigation:* Caching, rule optimization, async processing

2. **Workflow State Consistency**
   - *Risk:* Race conditions en concurrent processing
   - *Mitigation:* Database transactions, proper locking, state validation

3. **Notification Reliability**
   - *Risk:* Users miss important workflow notifications
   - *Mitigation:* Multiple notification channels, retry logic, escalation

### Business Risks
1. **Over-automation**
   - *Risk:* System auto-approves incorrectly
   - *Mitigation:* Conservative thresholds, audit trail, manual override

2. **User Adoption**
   - *Risk:* Users bypass workflow system
   - *Mitigation:* Intuitive UI, clear benefits, training program

---

## 📋 Definition of Done

### Technical DoD
- [ ] All acceptance criteria implemented y tested
- [ ] WorkflowEngine y BusinessRulesEngine fully functional
- [ ] Real-time notifications working via WebSocket
- [ ] Database schema optimized para performance
- [ ] Integration con ML y AFIP validation complete
- [ ] Bulk actions y dashboard functionality complete

### Quality DoD
- [ ] Unit test coverage >80% para workflow components
- [ ] Integration tests passing para all user flows
- [ ] Performance benchmarks meet requirements
- [ ] No regression en existing functionality
- [ ] Security audit passed para rule evaluation

### Business DoD
- [ ] Product Owner acceptance de all AC
- [ ] User testing con positive feedback
- [ ] Auto-approval rate meets 70% target
- [ ] SLA tracking functional y accurate
- [ ] Admin configuration interface complete y tested
- [ ] Ready for gradual rollout to pilot clients

---

## 📞 Contact & Support

**Product Owner:** Sarah  
**Lead Developer:** [To be assigned]  
**Technical Architect:** Winston  
**UI/UX Lead:** [To be assigned]

**Questions/Clarifications:** Contact Product Owner para business requirements o Technical Architect para implementation details.

---

*Documento creado el 2025-08-19 como parte del Epic 4: OCR Intelligence & Automation - Fase 3*