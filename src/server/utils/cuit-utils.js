// ===================================================
// src/server/utils/cuit-utils.js
// ===================================================
export class CuitUtils {
    /**
     * Validar formato y dígito verificador de CUIT
     */
    static isValid(cuit) {
        if (!cuit || typeof cuit !== 'string') {
            return false;
        }

        // Remover guiones y espacios
        const cleanCuit = cuit.replace(/[-\s]/g, '');

        // Verificar que tenga 11 dígitos
        if (!/^\d{11}$/.test(cleanCuit)) {
            return false;
        }

        // Verificar dígito verificador
        return CuitUtils.validateCheckDigit(cleanCuit);
    }

    /**
     * Validar dígito verificador
     */
    static validateCheckDigit(cuit) {
        const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
        let sum = 0;

        for (let i = 0; i < 10; i++) {
            sum += parseInt(cuit[i]) * multipliers[i];
        }

        const remainder = sum % 11;
        const checkDigit = remainder < 2 ? remainder : 11 - remainder;

        return checkDigit === parseInt(cuit[10]);
    }

    /**
     * Formatear CUIT con guiones
     */
    static format(cuit) {
        if (!CuitUtils.isValid(cuit)) {
            return cuit;
        }

        const cleanCuit = cuit.replace(/[-\s]/g, '');
        return `${cleanCuit.substring(0, 2)}-${cleanCuit.substring(2, 10)}-${cleanCuit.substring(10, 11)}`;
    }

    /**
     * Limpiar CUIT (remover guiones y espacios)
     */
    static clean(cuit) {
        if (!cuit) return cuit;
        return cuit.replace(/[-\s]/g, '');
    }
}