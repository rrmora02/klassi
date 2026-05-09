export interface ErrorDetails {
  message: string;
  type: string;
  file?: string;
  function?: string;
  line?: number;
  column?: number;
  stack?: string;
  context: Record<string, any>;
}

export function parseError(error: unknown): ErrorDetails {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const stack = errorObj.stack || "";

  // Parsear el stack trace
  const stackLines = stack.split("\n");
  const details: ErrorDetails = {
    message: errorObj.message,
    type: errorObj.name || "Error",
    stack: stack,
    context: {},
  };

  // Extraer información del primer error relevante en el stack
  for (const line of stackLines) {
    // Formato: at functionName (/path/to/file.ts:line:column)
    const match = line.match(/at\s+(?:new\s+)?(?:([^\s\(]+(?:\.[^\s\(]+)*)?\s+)?\(?([^:]+):(\d+):(\d+)/);

    if (match && !match[2].includes("node_modules")) {
      const [, functionPath, filePath, lineNum, colNum] = match;

      details.file = filePath.replace(/^.*[/\\]/, ""); // Solo nombre del archivo
      details.function = functionPath || "anonymous";
      details.line = parseInt(lineNum, 10);
      details.column = parseInt(colNum, 10);

      // Guardar ruta completa en contexto
      details.context.fullPath = filePath;
      break;
    }
  }

  return details;
}

export function formatErrorForLogging(error: unknown, additionalContext?: Record<string, any>): {
  errorType: string;
  message: string;
  stack: string;
  context: Record<string, any>;
} {
  const parsed = parseError(error);

  return {
    errorType: parsed.type,
    message: `[${parsed.file}:${parsed.line}:${parsed.column}] ${parsed.function}() - ${parsed.message}`,
    stack: parsed.stack,
    context: {
      file: parsed.file,
      function: parsed.function,
      line: parsed.line,
      column: parsed.column,
      fullPath: parsed.context.fullPath,
      ...additionalContext,
    },
  };
}
