export function CompletionStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="text-center">
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100px) rotate(720deg);
            opacity: 0;
          }
        }
        .confetti {
          animation: confetti-fall 2s ease-out forwards;
          position: absolute;
        }
      `}</style>

      <div className="text-7xl mb-4">
        <span className="inline-block animate-bounce" style={{ animationDelay: "0s" }}>
          🎉
        </span>
        <span className="inline-block animate-bounce mx-2" style={{ animationDelay: "0.1s" }}>
          🎊
        </span>
        <span className="inline-block animate-bounce" style={{ animationDelay: "0.2s" }}>
          🎉
        </span>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        ¡Tu escuela está lista!
      </h1>

      <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
        Felicidades. Ya puedes empezar a usar Klassi para gestionar tu escuela.
      </p>

      <div className="grid grid-cols-1 gap-4 mb-8 max-w-sm mx-auto">
        <div className="flex items-center gap-3 bg-green-50 p-4 rounded-lg">
          <span className="text-2xl">✓</span>
          <div className="text-left">
            <p className="font-semibold text-gray-900">Escuela configurada</p>
            <p className="text-sm text-gray-600">Con logo y detalles</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-green-50 p-4 rounded-lg">
          <span className="text-2xl">✓</span>
          <div className="text-left">
            <p className="font-semibold text-gray-900">Disciplinas creadas</p>
            <p className="text-sm text-gray-600">Listas para usar</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-green-50 p-4 rounded-lg">
          <span className="text-2xl">✓</span>
          <div className="text-left">
            <p className="font-semibold text-gray-900">Equipo invitado</p>
            <p className="text-sm text-gray-600">Instructores en camino</p>
          </div>
        </div>
      </div>

      <div className="mb-8 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-sm text-purple-900">
          📚 <strong>¿Qué sigue?</strong><br />
          Accede al dashboard para ver tu escuela, agregar más estudiantes,
          crear pagos y mucho más.
        </p>
      </div>

      <button
        onClick={onComplete}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg hover:shadow-lg transition-shadow"
      >
        Ir al Dashboard →
      </button>

      <p className="text-xs text-gray-500 mt-6">
        Puedes cambiar estos detalles en Configuración cuando lo desees
      </p>
    </div>
  );
}
