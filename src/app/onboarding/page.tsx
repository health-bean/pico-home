"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { FormData } from "./shared";
import {
  CLIMATE_ZONES,
  MAJOR_SYSTEMS,
  initialSelectedItems,
  initialHealthFlags,
  ProgressBar,
  StepAboutHome,
  StepMajorSystems,
  StepHousehold,
  StepComplete,
} from "./shared";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 4; // Welcome + 3 wizard steps (About, Systems, Household) + completion

// ---------------------------------------------------------------------------
// Step 1: Welcome
// ---------------------------------------------------------------------------

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center -mx-5 -my-6 px-8 bg-gradient-to-b from-[#fffbeb] via-[#fef3c7] to-[#fde68a]">
      <div className="flex flex-col items-center text-center max-w-xs">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/60 backdrop-blur-sm shadow-sm mb-5">
          <span className="text-3xl">{"\u{1F3E0}"}</span>
        </div>
        <h1 className="text-[26px] font-extrabold text-[#451a03] tracking-tight leading-tight">
          Let&apos;s set up your home
        </h1>
        <p className="mt-2 text-sm text-[#92400e] leading-relaxed">
          A few quick questions and we&apos;ll build a personalized maintenance plan.
        </p>
        <div className="mt-6 flex gap-4 text-center">
          {[
            { icon: "\u{1F4CB}", label: "Track" },
            { icon: "\u{1F514}", label: "Remind" },
            { icon: "\u{1F4CA}", label: "Score" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/50 text-base">
                {item.icon}
              </div>
              <span className="text-[10px] font-bold text-[#78350f]">{item.label}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onNext}
          className="w-full h-[48px] bg-[#451a03] text-white rounded-xl font-bold text-[14px] mt-8 transition-all hover:bg-[#78350f] active:scale-[0.98]"
        >
          Get Started
        </button>
        <p className="mt-3 text-[11px] text-[#92400e]">Takes about 2 minutes</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();

  const DRAFT_KEY = "pico_onboarding_draft";

  const [step, setStep] = useState(() => {
    if (typeof window === "undefined") return 1;
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      return draft?.step ?? 1;
    } catch { return 1; }
  });
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  const [form, setForm] = useState<FormData>(() => {
    const blank: FormData = {
      name: "",
      type: "",
      yearBuilt: "",
      sqft: "",
      zip: "",
      state: "",
      selectedItems: initialSelectedItems(),
      healthFlags: initialHealthFlags(),
    };
    if (typeof window === "undefined") return blank;
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      return draft?.form ? { ...blank, ...draft.form } : blank;
    } catch { return blank; }
  });

  // Save draft to localStorage on every change
  useEffect(() => {
    // Don't save the completion step — that means we're done
    if (step >= 5) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, form }));
    } catch { /* storage full or unavailable */ }
  }, [step, form]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  }, []);

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
    // Push a dummy history entry so the browser back gesture fires popstate
    // instead of navigating away from the page.
    window.history.pushState({ onboarding: true }, "");

    const onPopState = () => {
      if (stepRef.current > 1) {
        // Go back one wizard step and re-push so future back gestures keep working
        backRef.current();
        window.history.pushState({ onboarding: true }, "");
      }
      // On step 1 the user already sees the first screen – do nothing
      // (the dummy entry we consumed prevents leaving the page)
    };

    window.addEventListener("popstate", onPopState);

    // Also listen for the Capacitor hardware back button on Android
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

    const householdHealth = Object.values(form.healthFlags).some(Boolean) ? form.healthFlags : undefined;

    return { systems, appliances, householdHealth };
  }, [form]);

  // Submit onboarding data, then show completion screen
  const handleSubmitAndComplete = useCallback(async () => {
    const { systems, appliances, householdHealth } = buildApiPayload();

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
          householdHealth: householdHealth || undefined,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error("Onboarding save failed:", res.status, errBody);
        const details = errBody?.details?.map((d: { path: string; message: string }) => `${d.path}: ${d.message}`).join("\n") || "";
        throw new Error(`${errBody?.error || "Failed to save"}${details ? `\n${details}` : ""}`);
      }
      clearDraft();
      goTo(5, "forward");
    } catch (err) {
      console.error("Failed to save onboarding data", err);
      alert(`Something went wrong saving your home. Please try again.\n\n${err instanceof Error ? err.message : err}`);
    }
  }, [buildApiPayload, form, goTo, clearDraft]);

  const translateClass = animating
    ? direction === "forward"
      ? "opacity-0 translate-x-8"
      : "opacity-0 -translate-x-8"
    : "opacity-100 translate-x-0";

  // Map step numbers: step 1 = welcome (no progress), steps 2-5 = wizard steps 1-4
  const wizardStep = step - 1; // 0 for welcome, 1-4 for wizard

  return (
    <div className="flex min-h-dvh flex-col bg-[#fafaf9]">
      {/* Progress bar for steps 2+ */}
      {step > 1 && step < 5 && (
        <div className="sticky top-0 z-10 bg-[#fafaf9]/80 px-5 pb-3 pt-4 backdrop-blur-sm">
          <ProgressBar currentStep={wizardStep} totalSteps={TOTAL_STEPS - 1} />
        </div>
      )}

      <div className={`flex flex-1 flex-col max-w-lg mx-auto w-full px-5 py-6 transition-all duration-200 ease-out ${translateClass}`}>
        {step === 1 && <StepWelcome onNext={next} />}
        {step === 2 && (
          <StepAboutHome
            data={form}
            onChange={updateForm}
            onNext={next}
            onBack={back}
            currentStep={wizardStep}
            totalSteps={TOTAL_STEPS}
          />
        )}
        {step === 3 && (
          <StepMajorSystems
            data={form}
            onChange={updateForm}
            onNext={next}
            onBack={back}
            onSkip={() => { handleSubmitAndComplete(); }}
            currentStep={wizardStep}
            totalSteps={TOTAL_STEPS}
          />
        )}
        {step === 4 && (
          <StepHousehold
            data={form}
            onChange={updateForm}
            onNext={() => { handleSubmitAndComplete(); }}
            onBack={back}
            onSkip={() => { handleSubmitAndComplete(); }}
            currentStep={wizardStep}
            totalSteps={TOTAL_STEPS}
          />
        )}
        {step === 5 && (
          <StepComplete
            systemCount={Object.values(form.selectedItems).filter((s) => s.enabled).length}
            onFinish={() => router.push("/dashboard")}
            loading={false}
          />
        )}
      </div>
    </div>
  );
}
