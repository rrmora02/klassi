"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import type { Tenant } from "@prisma/client";
import { WelcomeStep } from "./steps/welcome-step";
import { TenantInfoStep } from "./steps/tenant-info-step";
import { DisciplinesStep } from "./steps/disciplines-step";
import { InstructorsStep } from "./steps/instructors-step";
import { GroupsStep } from "./steps/groups-step";
import { CompletionStep } from "./steps/completion-step";

export type Step = "welcome" | "tenant" | "disciplines" | "instructors" | "groups" | "completion";

const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: "welcome", label: "Bienvenida", icon: "👋" },
  { key: "tenant", label: "Tu Escuela", icon: "🏫" },
  { key: "disciplines", label: "Disciplinas", icon: "📚" },
  { key: "instructors", label: "Instructores", icon: "👨‍🏫" },
  { key: "groups", label: "Grupos", icon: "👥" },
  { key: "completion", label: "¡Listo!", icon: "🎉" },
];

interface SetupWizardProps {
  tenant: Tenant;
  onComplete: () => void;
}

export function SetupWizard({ tenant, onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const completeSetupMutation = api.tenants.completeSetup.useMutation();

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleNext = async (nextStep: Step) => {
    if (nextStep === "completion") {
      await completeSetupMutation.mutateAsync({ tenantId: tenant.id });
      onComplete();
    } else {
      setCurrentStep(nextStep);
    }
  };

  const handleSkip = () => {
    setCurrentStep("completion");
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 z-50">
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        .slide-in {
          animation: slideInRight 0.4s ease-out;
        }
      `}</style>

      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 flex justify-between">
            {STEPS.map((step, index) => (
              <div
                key={step.key}
                className={`flex flex-col items-center ${
                  index <= currentStepIndex ? "opacity-100" : "opacity-40"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                    index < currentStepIndex
                      ? "bg-gradient-to-r from-purple-400 to-pink-500 text-white"
                      : index === currentStepIndex
                      ? "bg-gradient-to-r from-purple-400 to-pink-500 text-white ring-2 ring-white scale-110"
                      : "bg-white/10 text-white/50"
                  }`}
                >
                  {index < currentStepIndex ? "✓" : step.icon}
                </div>
                <span className="text-xs text-white/60 text-center hidden sm:block">
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 fade-in slide-in">
          {currentStep === "welcome" && (
            <WelcomeStep
              onNext={() => handleNext("tenant")}
              onSkip={handleSkip}
            />
          )}
          {currentStep === "tenant" && (
            <TenantInfoStep
              tenant={tenant}
              onNext={() => handleNext("disciplines")}
              onBack={() => setCurrentStep("welcome")}
            />
          )}
          {currentStep === "disciplines" && (
            <DisciplinesStep
              tenantId={tenant.id}
              onNext={() => handleNext("instructors")}
              onBack={() => setCurrentStep("tenant")}
            />
          )}
          {currentStep === "instructors" && (
            <InstructorsStep
              tenantId={tenant.id}
              onNext={() => handleNext("groups")}
              onBack={() => setCurrentStep("disciplines")}
              onSkip={() => handleNext("groups")}
            />
          )}
          {currentStep === "groups" && (
            <GroupsStep
              tenantId={tenant.id}
              onNext={() => handleNext("completion")}
              onBack={() => setCurrentStep("instructors")}
              onSkip={() => handleNext("completion")}
            />
          )}
          {currentStep === "completion" && (
            <CompletionStep onComplete={onComplete} />
          )}
        </div>
      </div>
    </div>
  );
}
