// Cargador de configuración

export class ConfigLoader {
  static async load() {
    const env = process.env.NODE_ENV || 'development';
    // TODO: Cargar configuración desde archivos
    return { environment: env };
  }
}

