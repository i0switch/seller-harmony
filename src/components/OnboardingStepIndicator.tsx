import { ReactNode } from "react";
import { Check } from "lucide-react";

const steps = [
  { label: "プロフィール", path: "profile" },
  { label: "Stripe連携", path: "stripe" },
  { label: "Discord設定", path: "discord" },
  { label: "完了", path: "complete" },
];

export function OnboardingStepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={step.path} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  done
                    ? "bg-accent border-accent text-accent-foreground"
                    : active
                    ? "border-accent text-accent bg-accent/10"
                    : "border-border text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs mt-1 hidden sm:block ${active ? "text-accent font-medium" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${done ? "bg-accent" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function OnboardingShell({ step, children }: { step: number; children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md glass-card rounded-xl p-6 space-y-4">
        <OnboardingStepIndicator currentStep={step} />
        {children}
      </div>
    </div>
  );
}
