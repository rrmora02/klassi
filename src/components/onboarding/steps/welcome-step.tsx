export function WelcomeStep({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="text-center">
      <div className="text-6xl mb-6 animate-bounce">👋</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        ¡Bienvenido a Klassi!
      </h1>
      <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
        Te guiaremos a través de los pasos necesarios para configurar tu escuela
        en menos de 5 minutos.
      </p>

      <div className="grid grid-cols-1 gap-4 mb-8 max-w-sm mx-auto">
        <div className="flex items-start gap-3 text-left">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="font-semibold text-gray-900">Configura tu escuela</p>
            <p className="text-sm text-gray-600">
              Agrega logo, nombre y detalles de contacto
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 text-left">
          <span className="text-2xl">👥</span>
          <div>
            <p className="font-semibold text-gray-900">
              Invita a tu equipo
            </p>
            <p className="text-sm text-gray-600">
              Agrupa instructores y gestiona accesos
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 text-left">
          <span className="text-2xl">📊</span>
          <div>
            <p className="font-semibold text-gray-900">
              Crea tus grupos y disciplinas
            </p>
            <p className="text-sm text-gray-600">
              Organiza todas tus clases en un solo lugar
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onNext}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg hover:shadow-lg transition-shadow"
        >
          Comenzar →
        </button>
        <button
          onClick={onSkip}
          className="px-6 text-gray-600 font-semibold hover:text-gray-900 transition-colors"
        >
          Saltar
        </button>
      </div>
    </div>
  );
}
