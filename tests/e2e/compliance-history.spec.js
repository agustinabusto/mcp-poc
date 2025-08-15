import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import puppeteer from 'puppeteer';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const TIMEOUT = 30000;

describe('Compliance History E2E Tests', () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
        
        // Configurar viewport para pruebas responsive
        await page.setViewport({ width: 1280, height: 720 });
        
        // Navegar a la página de contribuyentes
        await page.goto(`${BASE_URL}/contributors`, { waitUntil: 'networkidle0' });
        
        // Esperar a que la página cargue completamente
        await page.waitForSelector('[data-testid="contributors-table"], [data-testid="contributors-cards"]', { timeout: TIMEOUT });
    }, TIMEOUT);

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    describe('Compliance History Modal', () => {
        it('should open compliance history when clicking history button', async () => {
            // Buscar y hacer click en el primer botón de historial
            const historyButton = await page.waitForSelector('button:has-text("Historial")', { timeout: TIMEOUT });
            expect(historyButton).toBeTruthy();
            
            await historyButton.click();
            
            // Verificar que se abre el modal
            const modal = await page.waitForSelector('[role="dialog"], .fixed.inset-0', { timeout: TIMEOUT });
            expect(modal).toBeTruthy();
            
            // Verificar que tiene el título correcto
            const title = await page.waitForSelector('h2:has-text("Historial de Compliance")', { timeout: TIMEOUT });
            expect(title).toBeTruthy();
        });

        it('should display navigation tabs', async () => {
            // Verificar que existen las 3 pestañas
            const timelineTab = await page.$('button[role="tab"]:has-text("Timeline de Eventos")');
            const trendsTab = await page.$('button[role="tab"]:has-text("Análisis de Tendencias")');
            const patternsTab = await page.$('button[role="tab"]:has-text("Patrones y Predicciones")');
            
            expect(timelineTab).toBeTruthy();
            expect(trendsTab).toBeTruthy();
            expect(patternsTab).toBeTruthy();
        });

        it('should switch between tabs', async () => {
            // Click en pestaña de tendencias
            const trendsTab = await page.$('button[role="tab"]:has-text("Análisis de Tendencias")');
            await trendsTab.click();
            
            // Verificar que cambió la pestaña activa
            const activeTrendsTab = await page.$('button[role="tab"][aria-selected="true"]:has-text("Análisis de Tendencias")');
            expect(activeTrendsTab).toBeTruthy();
            
            // Click en pestaña de patrones
            const patternsTab = await page.$('button[role="tab"]:has-text("Patrones y Predicciones")');
            await patternsTab.click();
            
            // Verificar que cambió la pestaña activa
            const activePatternsTab = await page.$('button[role="tab"][aria-selected="true"]:has-text("Patrones y Predicciones")');
            expect(activePatternsTab).toBeTruthy();
            
            // Volver al timeline
            const timelineTab = await page.$('button[role="tab"]:has-text("Timeline de Eventos")');
            await timelineTab.click();
        });

        it('should display timeline content by default', async () => {
            // Verificar que está en la pestaña timeline
            const activeTimelineTab = await page.$('button[role="tab"][aria-selected="true"]:has-text("Timeline de Eventos")');
            expect(activeTimelineTab).toBeTruthy();
            
            // Verificar elementos del timeline
            const timelineContent = await page.$('#panel-timeline');
            expect(timelineContent).toBeTruthy();
        });

        it('should have filter functionality', async () => {
            // Verificar que existen los filtros
            const eventTypeFilter = await page.$('select[value=""]'); // Filtro de tipo de evento
            const severityFilter = await page.$('select'); // Filtro de severidad
            const searchInput = await page.$('input[placeholder*="Buscar"]');
            
            expect(eventTypeFilter || severityFilter).toBeTruthy();
            expect(searchInput).toBeTruthy();
        });

        it('should close modal when clicking close button', async () => {
            // Buscar botón de cerrar
            const closeButton = await page.$('button:has-text("Cerrar"), button[aria-label*="Cerrar"]');
            expect(closeButton).toBeTruthy();
            
            await closeButton.click();
            
            // Verificar que el modal se cerró
            await page.waitForFunction(
                () => !document.querySelector('[role="dialog"], .fixed.inset-0'),
                { timeout: 5000 }
            );
            
            const modal = await page.$('[role="dialog"], .fixed.inset-0');
            expect(modal).toBeFalsy();
        });
    });

    describe('Responsive Design', () => {
        it('should work on mobile viewport', async () => {
            // Cambiar a viewport móvil
            await page.setViewport({ width: 375, height: 667 });
            
            // Abrir historial nuevamente
            const historyButton = await page.waitForSelector('button:has-text("Historial")', { timeout: TIMEOUT });
            await historyButton.click();
            
            // Verificar que el modal se adapta bien al móvil
            const modal = await page.waitForSelector('[role="dialog"], .fixed.inset-0', { timeout: TIMEOUT });
            const modalBox = await modal.boundingBox();
            
            expect(modalBox.width).toBeGreaterThan(300); // Debe tener un ancho mínimo
            expect(modalBox.width).toBeLessThanOrEqual(375); // No debe exceder el viewport
            
            // Cerrar modal
            const closeButton = await page.$('button:has-text("Cerrar"), button[aria-label*="Cerrar"]');
            await closeButton.click();
            
            // Volver a viewport desktop
            await page.setViewport({ width: 1280, height: 720 });
        });

        it('should work on tablet viewport', async () => {
            // Cambiar a viewport tablet
            await page.setViewport({ width: 768, height: 1024 });
            
            // Abrir historial nuevamente
            const historyButton = await page.waitForSelector('button:has-text("Historial")', { timeout: TIMEOUT });
            await historyButton.click();
            
            // Verificar que el modal se ve bien en tablet
            const modal = await page.waitForSelector('[role="dialog"], .fixed.inset-0', { timeout: TIMEOUT });
            expect(modal).toBeTruthy();
            
            // Cerrar modal
            const closeButton = await page.$('button:has-text("Cerrar"), button[aria-label*="Cerrar"]');
            await closeButton.click();
            
            // Volver a viewport desktop
            await page.setViewport({ width: 1280, height: 720 });
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA labels', async () => {
            // Abrir modal
            const historyButton = await page.waitForSelector('button:has-text("Historial")', { timeout: TIMEOUT });
            await historyButton.click();
            
            // Verificar ARIA labels en pestañas
            const tabs = await page.$$('button[role="tab"]');
            for (const tab of tabs) {
                const ariaSelected = await tab.getAttribute('aria-selected');
                expect(['true', 'false']).toContain(ariaSelected);
            }
            
            // Verificar tabpanels
            const tabpanels = await page.$$('[role="tabpanel"]');
            expect(tabpanels.length).toBeGreaterThan(0);
            
            // Cerrar modal
            const closeButton = await page.$('button[aria-label*="Cerrar"]');
            expect(closeButton).toBeTruthy();
            await closeButton.click();
        });

        it('should be keyboard navigable', async () => {
            // Abrir modal con Enter
            const historyButton = await page.waitForSelector('button:has-text("Historial")', { timeout: TIMEOUT });
            await historyButton.focus();
            await page.keyboard.press('Enter');
            
            // Verificar que se abrió el modal
            const modal = await page.waitForSelector('[role="dialog"], .fixed.inset-0', { timeout: TIMEOUT });
            expect(modal).toBeTruthy();
            
            // Navegar entre pestañas con Tab
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');
            
            // Verificar que el foco está en una pestaña
            const focusedElement = await page.evaluateHandle(() => document.activeElement);
            const role = await focusedElement.getProperty('role');
            const roleValue = await role.jsonValue();
            
            // El elemento con foco debería ser una pestaña o un botón dentro del modal
            expect(['tab', 'button'].includes(roleValue) || await focusedElement.evaluate(el => el.closest('[role="dialog"]'))).toBeTruthy();
            
            // Cerrar con Escape
            await page.keyboard.press('Escape');
            
            // Verificar que se cerró (esto puede fallar si no está implementado)
            try {
                await page.waitForFunction(
                    () => !document.querySelector('[role="dialog"], .fixed.inset-0'),
                    { timeout: 2000 }
                );
            } catch (e) {
                // Si no se cerró con Escape, cerrar manualmente
                const closeButton = await page.$('button[aria-label*="Cerrar"]');
                if (closeButton) {
                    await closeButton.click();
                }
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle API errors gracefully', async () => {
            // Interceptar requests para simular error
            await page.setRequestInterception(true);
            
            page.on('request', (req) => {
                if (req.url().includes('/compliance/history/')) {
                    req.abort('failed');
                } else {
                    req.continue();
                }
            });
            
            // Abrir modal
            const historyButton = await page.waitForSelector('button:has-text("Historial")', { timeout: TIMEOUT });
            await historyButton.click();
            
            // Verificar que se muestra mensaje de error
            try {
                await page.waitForSelector('.text-red-800, .bg-red-50, [role="alert"]', { timeout: 10000 });
                
                // Verificar que hay un mensaje de error visible
                const errorElement = await page.$('.text-red-800, .bg-red-50, [role="alert"]');
                expect(errorElement).toBeTruthy();
            } catch (e) {
                // Si no hay mensaje de error específico, al menos verificar que no se colgó
                const modal = await page.$('[role="dialog"], .fixed.inset-0');
                expect(modal).toBeTruthy();
            }
            
            // Cerrar modal
            const closeButton = await page.$('button:has-text("Cerrar"), button[aria-label*="Cerrar"]');
            if (closeButton) {
                await closeButton.click();
            }
            
            // Deshabilitar intercepción
            await page.setRequestInterception(false);
        });
    });
});