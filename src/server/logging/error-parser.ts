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

    if (match && match[2] && !match[2].includes("node_modules")) {
      const [, functionPath, filePath, lineNum, colNum] = match;

      details.file = (filePath || "").replace(/^.*[/\\]/, "") || "unknown"; // Solo nombre del archivo
      details.function = functionPath || "anonymous";
      details.line = parseInt(lineNum || "0", 10);
      details.column = parseInt(colNum || "0", 10);

      // Guardar ruta completa en contexto
      details.context.fullPath = filePath || "";
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
  const file = parsed.file ?? "unknown";
  const line = parsed.line ?? 0;
  const column = parsed.column ?? 0;
  const func = parsed.function ?? "anonymous";
  const stack = parsed.stack ?? "";

  return {
    errorType: parsed.type,
    message: `[${file}:${line}:${column}] ${func}() - ${parsed.message}`,
    stack: stack,
    context: {
      file: file,
      function: func,
      line: line,
      column: column,
      fullPath: parsed.context.fullPath,
      ...additionalContext,
    },
  };
}
