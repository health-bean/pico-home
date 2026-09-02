"use client";

import { useState, useCallback, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { FormData } from "@/app/onboarding/shared";
import {
  CLIMATE_ZONES,
  MAJOR_SYSTEMS,
  initialSelectedItems,
  initialHealthFlags,
  ProgressBar,
  StepAboutHome,
  StepMajorSystems,
  StepComplete,
} from "@/app/onboarding/shared";

// ---------------------------------------------------------------------------
// Add Home — abbreviated 3-step onboarding for second properties
// Step 1 = About Home, Step 2 = Major Systems, Step 3 = Complete
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 2; // About + Systems (completion screen hides the bar)

export default function AddHomePage() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  const [form, setForm] = useState<FormData>({
    name: "",
    type: "",
    yearBuilt: "",
    sqft: "",
    zip: "",
    state: "",
    selectedItems: initialSelectedItems(),
    healthFlags: initialHealthFlags(),
    taskSetups: {},
  });

  const updateForm = useCallback((partial: Partial<FormData>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  const goTo = useCallback(
    (next: number, dir: "forward" | "backward") => {
      if (animating) return;
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setStep(next);
        setTimeout(() => setAnimating(false), 30);
      }, 200);
    },
    [animating]
  );

  const next = useCallback(() => goTo(step + 1, "forward"), [goTo, step]);
  const back = useCallback(() => goTo(step - 1, "backward"), [goTo, step]);

  // Keep a ref so the popstate handler always sees the latest step & back fn
  const stepRef = useRef(step);
  const backRef = useRef(back);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { backRef.current = back; }, [back]);

  // Intercept hardware / gesture back so selections aren't lost
  useEffect(() => {
    window.history.pushState({ addHome: true }, "");

    const onPopState = () => {
      if (stepRef.current > 1) {
        backRef.current();
        window.history.pushState({ addHome: true }, "");
      }
    };

    window.addEventListener("popstate", onPopState);

    let capListener: { remove: () => void } | undefined;
    import("@capacitor/app").then(({ App }) => {
      App.addListener("backButton", () => {
        if (stepRef.current > 1) {
          backRef.current();
        }
      }).then((l) => { capListener = l; });
    }).catch(() => { /* @capacitor/app not available (web) */ });

    return () => {
      window.removeEventListener("popstate", onPopState);
      capListener?.remove();
    };
  }, []);

  // Convert unified selectedItems back to separate systems and appliances for the API
  const buildApiPayload = useCallback(() => {
    const systems: { key: string; subtype: string }[] = [];
    const appliances: string[] = [];
    const seenAppliances = new Set<string>();

    for (const group of MAJOR_SYSTEMS) {
      for (const item of group.items) {
        const selection = form.selectedItems[item.key];
        if (!selection?.enabled) continue;
        if (item.type === "system" && item.mappedSystem) {
          const subtypes = selection.subtypes.length > 0 ? [...selection.subtypes] : ["standard"];
          for (const st of subtypes) {
            systems.push({ key: item.mappedSystem, subtype: st });
          }
        } else if (item.type === "appliance" && item.mappedAppliance) {
          if (!seenAppliances.has(item.mappedAppliance)) {
            seenAppliances.add(item.mappedAppliance);
            appliances.push(item.mappedAppliance);
          }
        }
      }
    }

    return { systems, appliances };
  }, [form]);

  // Submit and transition to completion screen
  const handleSubmit = useCallback(() => {
    startTransition(async () => {
      const { systems, appliances } = buildApiPayload();

      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            home: {
              name: form.name.trim() || "My Home",
              type: form.type || "single_family",
              yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : null,
              sqft: form.sqft ? Number(form.sqft) : null,
              zip: form.zip || "",
              state: form.state || "",
              climateZone: CLIMATE_ZONES[form.state] ?? "",
            },
            systems,
            appliances,
            taskSetups: [],
          }),
        });

        if (!res.ok) throw new Error("Failed to save");
      } catch {
        console.error("Failed to save new property");
      }

      goTo(3, "forward");
    });
  }, [buildApiPayload, form, goTo, startTransition]);

  const translateClass = animating
    ? direction === "forward"
      ? "opacity-0 translate-x-8"
      : "opacity-0 -translate-x-8"
    : "opacity-100 translate-x-0";

  const homeName = form.name.trim() || "your new home";

  return (
    <div className="flex min-h-dvh flex-col bg-[#fafaf9]">
      {/* Progress bar for steps 1-2 (hidden on completion) */}
      {step < 3 && (
        <div className="sticky top-0 z-10 bg-[#fafaf9]/80 px-5 pb-3 pt-4 backdrop-blur-sm">
          <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />
        </div>
      )}

      <div className={`flex flex-1 flex-col max-w-lg mx-auto w-full px-5 py-6 transition-all duration-200 ease-out ${translateClass}`}>
        {step === 1 && (
          <StepAboutHome
            data={form}
            onChange={updateForm}
            onNext={next}
            onBack={() => router.back()}
            currentStep={1}
            totalSteps={TOTAL_STEPS}
          />
        )}
        {step === 2 && (
          <StepMajorSystems
            data={form}
            onChange={updateForm}
            onNext={handleSubmit}
            onBack={back}
            onSkip={handleSubmit}
            currentStep={2}
            totalSteps={TOTAL_STEPS}
          />
        )}
        {step === 3 && (
          <StepComplete
            systemCount={Object.values(form.selectedItems).filter((s) => s.enabled).length}
            onFinish={() => router.push("/dashboard")}
            loading={false}
            title="Added!"
            description={`We created your maintenance plan for ${homeName}.`}
            buttonLabel="Go to My Dashboard"
          />
        )}
      </div>
    </div>
  );
}
