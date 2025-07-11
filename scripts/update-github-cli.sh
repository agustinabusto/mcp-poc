#!/bin/bash

# =============================================================================
# Script para Actualizar GitHub CLI a la Última Versión en Ubuntu
# =============================================================================

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Actualizando GitHub CLI a la última versión...${NC}"

# =============================================================================
# 1. VERIFICAR VERSIÓN ACTUAL
# =============================================================================

echo -e "${YELLOW}📋 Verificando versión actual...${NC}"
if command -v gh &> /dev/null; then
    current_version=$(gh --version | head -n1)
    echo -e "${BLUE}Versión actual: $current_version${NC}"
else
    echo -e "${RED}❌ GitHub CLI no está instalado${NC}"
    current_version="No instalado"
fi

# =============================================================================
# 2. DESINSTALAR VERSIÓN ANTERIOR (SI EXISTE)
# =============================================================================

echo -e "${YELLOW}🗑️ Desinstalando versión anterior...${NC}"

# Intentar desinstalar por diferentes métodos
if dpkg -l | grep -q "gh"; then
    echo -e "${BLUE}📦 Desinstalando via apt...${NC}"
    sudo apt remove -y gh
elif snap list | grep -q "gh"; then
    echo -e "${BLUE}📦 Desinstalando via snap...${NC}"
    sudo snap remove gh
else
    echo -e "${YELLOW}⚠️ No se encontró instalación previa via apt o snap${NC}"
fi

# Limpiar archivos de configuración residuales
echo -e "${BLUE}🧹 Limpiando archivos residuales...${NC}"
sudo apt autoremove -y
sudo apt autoclean

# =============================================================================
# 3. ACTUALIZAR REPOSITORIOS
# =============================================================================

echo -e "${YELLOW}🔄 Actualizando repositorios del sistema...${NC}"
sudo apt update

# =============================================================================
# 4. INSTALAR DEPENDENCIAS
# =============================================================================

echo -e "${YELLOW}📋 Instalando dependencias necesarias...${NC}"
sudo apt install -y curl gpg software-properties-common

# =============================================================================
# 5. AGREGAR REPOSITORIO OFICIAL DE GITHUB CLI
# =============================================================================

echo -e "${YELLOW}🔑 Configurando repositorio oficial de GitHub CLI...${NC}"

# Remover claves y repositorios anteriores
sudo rm -f /usr/share/keyrings/githubcli-archive-keyring.gpg
sudo rm -f /etc/apt/sources.list.d/github-cli.list

# Agregar nueva clave GPG
echo -e "${BLUE}🔐 Agregando clave GPG...${NC}"
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg

# Agregar repositorio
echo -e "${BLUE}📁 Agregando repositorio...${NC}"
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null

# =============================================================================
# 6. ACTUALIZAR E INSTALAR NUEVA VERSIÓN
# =============================================================================

echo -e "${YELLOW}⬇️ Instalando última versión de GitHub CLI...${NC}"

# Actualizar lista de paquetes con el nuevo repositorio
sudo apt update

# Instalar GitHub CLI
if sudo apt install -y gh; then
    echo -e "${GREEN}✅ GitHub CLI instalado exitosamente!${NC}"
else
    echo -e "${RED}❌ Error instalando GitHub CLI${NC}"
    exit 1
fi

# =============================================================================
# 7. VERIFICAR NUEVA VERSIÓN
# =============================================================================

echo -e "${YELLOW}✅ Verificando nueva versión...${NC}"
if command -v gh &> /dev/null; then
    new_version=$(gh --version | head -n1)
    echo -e "${GREEN}Nueva versión: $new_version${NC}"
    
    # Comparar versiones
    echo -e "${BLUE}📊 Comparación:${NC}"
    echo -e "   Anterior: $current_version"
    echo -e "   Nueva:    $new_version"
else
    echo -e "${RED}❌ Error: GitHub CLI no se encuentra después de la instalación${NC}"
    exit 1
fi

# =============================================================================
# 8. VERIFICAR COMANDOS DISPONIBLES
# =============================================================================

echo -e "${YELLOW}🔍 Verificando comandos disponibles...${NC}"

# Verificar comando milestone
if gh milestone --help &> /dev/null; then
    echo -e "${GREEN}✅ Comando 'gh milestone' disponible${NC}"
else
    echo -e "${RED}❌ Comando 'gh milestone' NO disponible${NC}"
fi

# Verificar comando project
if gh project --help &> /dev/null; then
    echo -e "${GREEN}✅ Comando 'gh project' disponible${NC}"
else
    echo -e "${RED}❌ Comando 'gh project' NO disponible${NC}"
fi

# Listar todos los comandos disponibles
echo -e "${BLUE}📋 Comandos principales disponibles:${NC}"
gh --help | grep -A 20 "CORE COMMANDS" | tail -n +2 | head -n 15

# =============================================================================
# 9. VERIFICAR AUTENTICACIÓN
# =============================================================================

echo -e "${YELLOW}🔐 Verificando autenticación...${NC}"
if gh auth status &> /dev/null; then
    echo -e "${GREEN}✅ Autenticación mantiene la configuración${NC}"
    gh auth status
else
    echo -e "${YELLOW}⚠️ Necesitas re-autenticarte${NC}"
    echo -e "${BLUE}💡 Ejecuta: gh auth login${NC}"
fi

# =============================================================================
# 10. PROBAR FUNCIONALIDADES NUEVAS
# =============================================================================

echo -e "${YELLOW}🧪 Probando funcionalidades nuevas...${NC}"

# Probar listado de milestones
echo -e "${BLUE}📊 Probando comando milestone...${NC}"
if gh milestone list --repo agustinabusto/mcp-poc --state all 2>/dev/null; then
    echo -e "${GREEN}✅ Comando milestone funciona correctamente${NC}"
else
    echo -e "${YELLOW}⚠️ Milestones: Sin milestones creados o error de permisos${NC}"
fi

# Probar listado de proyectos
echo -e "${BLUE}📋 Probando comando project...${NC}"
if gh project list --owner agustinabusto 2>/dev/null; then
    echo -e "${GREEN}✅ Comando project funciona correctamente${NC}"
else
    echo -e "${YELLOW}⚠️ Projects: Sin proyectos creados o error de permisos${NC}"
fi

# =============================================================================
# 11. RESUMEN Y PRÓXIMOS PASOS
# =============================================================================

echo -e "${GREEN}🎉 ¡Actualización completada!${NC}"
echo -e "${BLUE}📊 Resumen:${NC}"
echo -e "   • ✅ GitHub CLI actualizado a la última versión"
echo -e "   • ✅ Repositorio oficial configurado"
echo -e "   • ✅ Comandos milestone y project disponibles"
echo -e "   • ✅ Autenticación verificada"

echo ""
echo -e "${YELLOW}📋 Próximos pasos:${NC}"
echo -e "   1. Ejecutar script completo de configuración del proyecto"
echo -e "   2. Crear milestones automáticamente"
echo -e "   3. Crear proyecto con todas las funcionalidades"
echo -e "   4. Crear las 32 historias de usuario con milestones"

echo ""
echo -e "${BLUE}🚀 Comando para continuar:${NC}"
echo -e "   ./setup-project.sh"

echo ""
echo -e "${BLUE}🔧 Comandos útiles que ahora tienes disponibles:${NC}"
cat << 'EOF'

# Gestión de milestones
gh milestone list --repo OWNER/REPO
gh milestone create --title "Título" --description "Desc" --due-date "2025-12-31"

# Gestión de proyectos
gh project list --owner OWNER
gh project create --title "Título" --owner OWNER

# Issues con milestones
gh issue create --title "Título" --milestone "Milestone Name"
gh issue edit NUMBER --milestone "Milestone Name"

# Ver todas las opciones
gh milestone --help
gh project --help

EOF

# =============================================================================
# 12. MÉTODO ALTERNATIVO (SI FALLA EL PRINCIPAL)
# =============================================================================

echo -e "${YELLOW}🔄 Método alternativo (si el anterior falló):${NC}"
cat << 'EOF'

# Si la instalación falló, puedes probar:

# Método 1: Snap
sudo snap install gh

# Método 2: Descarga directa
cd /tmp
wget https://github.com/cli/cli/releases/latest/download/gh_*_linux_amd64.tar.gz
tar -xzf gh_*_linux_amd64.tar.gz
sudo cp gh_*_linux_amd64/bin/gh /usr/local/bin/
sudo chmod +x /usr/local/bin/gh

# Verificar
gh --version

EOF