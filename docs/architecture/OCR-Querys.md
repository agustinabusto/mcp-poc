📊 Ubicación de registros en la base de datos:

  1. Tabla ocr_processing_log (ocr-routes.js:98-102)

  Qué guarda: Log general del procesamiento
  - process_id - ID único del proceso
  - file_path - Ruta del archivo subido
  - document_type - Tipo de documento (invoice, bank_statement, etc)
  - client_id - ID del cliente
  - status - Estado ('completed')
  - result - Resultado completo del procesamiento (JSON)

  2. Tabla ocr_extraction_results (ocr-routes.js:105-117)

  Qué guarda: Datos extraídos específicos del documento
  - id - ID del resultado (processId + '-result')
  - process_id - Vincula con ocr_processing_log
  - client_id - ID del cliente
  - document_type - Tipo de documento
  - raw_text - Texto extraído del OCR
  - structured_data - Datos estructurados (JSON con número, fecha, CUIT, etc)
  - confidence - Nivel de confianza del OCR (85-95%)
  - metadata - Metadatos adicionales (fechas, tamaño archivo, etc)

  Archivo de base de datos:

  ./data/afip_monitor.db (SQLite)

  Para ver los registros puedes usar:
  SELECT * FROM ocr_processing_log ORDER BY created_at DESC;
  SELECT * FROM ocr_extraction_results ORDER BY created_at DESC;