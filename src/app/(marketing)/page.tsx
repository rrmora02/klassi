import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-gray-100 px-8 py-4">
        <span className="text-xl font-semibold text-violet-900">Klassi</span>
        <div className="flex items-center gap-4">
          <Link href="/precios" className="text-sm text-gray-600 hover:text-gray-900">Precios</Link>
          <Link href="/sign-in" className="text-sm text-gray-600 hover:text-gray-900">Iniciar sesión</Link>
          <Link href="/sign-up" className="rounded-lg bg-violet-900 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800">
            Prueba gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-8 py-24 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-semibold leading-tight text-gray-900">
          Gestiona tu escuela de deportes o artes desde un solo lugar
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-gray-500">
          Alumnos, instructores, grupos, asistencia y pagos — sin hojas de cálculo, sin caos.
          Funciona para fútbol, ballet, baile y cualquier disciplina que ofrezcas.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/sign-up" className="rounded-lg bg-violet-900 px-6 py-3 font-medium text-white hover:bg-violet-800">
            Empieza gratis 14 días
          </Link>
          <Link href="/precios" className="rounded-lg border border-gray-200 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50">
            Ver planes
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-100 bg-gray-50 px-8 py-20">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          {[
            { title: "Multidisciplina",    desc: "Una escuela puede dar fútbol y ballet al mismo tiempo. Activa las disciplinas que ofreces, sin límites de tipo." },
            { title: "Control de pagos",   desc: "Mensualidades, adeudos y recibos por alumno. Alertas automáticas para pagos vencidos." },
            { title: "Portal para padres", desc: "Los tutores consultan asistencia, estado de cuenta y avisos desde su propio acceso." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
