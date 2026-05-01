"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";

export function InstructorsStep({
  tenantId,
  onNext,
  onBack,
  onSkip,
}: {
  tenantId: string;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const inviteMember = api.team.inviteMember.useMutation();
  const [isLoading, setIsLoading] = useState(false);

  const handleAddEmail = () => {
    if (currentEmail.trim() && !emails.includes(currentEmail)) {
      setEmails([...emails, currentEmail.trim()]);
      setCurrentEmail("");
    }
  };

  const handleRemoveEmail = (email: string) => {
    setEmails(emails.filter((e) => e !== email));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      for (const email of emails) {
        await inviteMember.mutateAsync({
          tenantId,
          email,
          role: "INSTRUCTOR",
        });
      }
      onNext();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Agrega Instructores</h2>
        <p className="text-gray-600 mt-2">
          Invita a los profesores a que se unan a tu escuela
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="email"
            value={currentEmail}
            onChange={(e) => setCurrentEmail(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddEmail()}
            placeholder="correo@instructor.com"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
          <button
            type="button"
            onClick={handleAddEmail}
            className="px-4 py-2 bg-purple-100 text-purple-700 font-semibold rounded-lg hover:bg-purple-200 transition-colors"
          >
            Agregar
          </button>
        </div>

        {emails.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Instructores a invitar ({emails.length})
            </p>
            <div className="space-y-2">
              {emails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between bg-white p-2 rounded border border-blue-200"
                >
                  <span className="text-sm text-gray-700">👨‍🏫 {email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email)}
                    className="text-blue-500 hover:text-blue-700 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800">
            💡 Los instructores recibirán un enlace de invitación por correo.
            Podrán aceptar desde cualquier dispositivo.
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Atrás
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="px-6 py-2 text-gray-600 font-semibold hover:text-gray-900 transition-colors"
        >
          Saltar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || emails.length === 0}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-2 rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50"
        >
          {isLoading ? "Invitando..." : "Siguiente →"}
        </button>
      </div>
    </div>
  );
}
