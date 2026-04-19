import { describe, it, expect } from "vitest";
import {
  createTaskSchema,
  completeTaskSchema,
  snoozeTaskSchema,
  inviteSchema,
  pushSubscribeSchema,
  onboardingSchema,
} from "./schemas";

describe("createTaskSchema", () => {
  it("accepts valid input", () => {
    const result = createTaskSchema.parse({
      name: "Replace HVAC filter",
      category: "heating_cooling",
      priority: "safety",
      frequencyUnit: "months",
      frequencyValue: 3,
    });
    expect(result.name).toBe("Replace HVAC filter");
  });

  it("applies defaults", () => {
    const result = createTaskSchema.parse({ name: "Basic task" });
    expect(result.category).toBe("appliances");
    expect(result.priority).toBe("efficiency");
    expect(result.frequencyUnit).toBe("months");
    expect(result.frequencyValue).toBe(1);
  });

  it("rejects empty name", () => {
    expect(() => createTaskSchema.parse({ name: "" })).toThrow();
  });

  it("rejects invalid category", () => {
    expect(() =>
      createTaskSchema.parse({ name: "Test", category: "invalid" })
    ).toThrow();
  });

  it("rejects frequencyValue out of range", () => {
    expect(() =>
      createTaskSchema.parse({ name: "Test", frequencyValue: 0 })
    ).toThrow();
    expect(() =>
      createTaskSchema.parse({ name: "Test", frequencyValue: 999 })
    ).toThrow();
  });
});

describe("completeTaskSchema", () => {
  it("applies defaults for empty object", () => {
    const result = completeTaskSchema.parse({});
    expect(result.isDiy).toBe(true);
  });

  it("accepts full input", () => {
    const result = completeTaskSchema.parse({
      isDiy: false,
      costCents: 15000,
      timeSpentMinutes: 120,
      notes: "Called a plumber",
    });
    expect(result.costCents).toBe(15000);
  });

  it("rejects negative cost", () => {
    expect(() => completeTaskSchema.parse({ costCents: -1 })).toThrow();
  });
});

describe("snoozeTaskSchema", () => {
  it("defaults to 7 days", () => {
    const result = snoozeTaskSchema.parse({});
    expect(result.days).toBe(7);
  });

  it("rejects days outside 1-365", () => {
    expect(() => snoozeTaskSchema.parse({ days: 0 })).toThrow();
    expect(() => snoozeTaskSchema.parse({ days: 366 })).toThrow();
  });
});

describe("inviteSchema", () => {
  it("accepts valid email", () => {
    const result = inviteSchema.parse({ email: "test@example.com" });
    expect(result.email).toBe("test@example.com");
  });

  it("normalizes email to lowercase", () => {
    const result = inviteSchema.parse({ email: "User@Example.COM" });
    expect(result.email).toBe("user@example.com");
  });

  it("rejects invalid email", () => {
    expect(() => inviteSchema.parse({ email: "not-an-email" })).toThrow();
  });
});

describe("pushSubscribeSchema", () => {
  it("accepts valid subscription", () => {
    const result = pushSubscribeSchema.parse({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
      keys: { p256dh: "key1", auth: "key2" },
    });
    expect(result.endpoint).toContain("fcm");
  });

  it("rejects invalid endpoint URL", () => {
    expect(() =>
      pushSubscribeSchema.parse({
        endpoint: "not-a-url",
        keys: { p256dh: "key1", auth: "key2" },
      })
    ).toThrow();
  });

  it("rejects empty keys", () => {
    expect(() =>
      pushSubscribeSchema.parse({
        endpoint: "https://example.com/push",
        keys: { p256dh: "", auth: "" },
      })
    ).toThrow();
  });
});

describe("onboardingSchema", () => {
  it("accepts valid onboarding payload", () => {
    const result = onboardingSchema.parse({
      home: {
        name: "My House",
        type: "single_family",

        yearBuilt: 1995,
        sqft: 2000,
        zip: "90210",
        state: "CA",
        climateZone: "3A",
      },
      systems: [{ key: "hvac", subtype: "central" }],
      appliances: ["refrigerator", "dishwasher"],
      taskSetups: [
        { templateId: "tmpl-1", state: "track", doneMonth: 1, doneYear: 2026 },
      ],
    });
    expect(result.home.name).toBe("My House");
    expect(result.systems).toHaveLength(1);
  });

  it("rejects invalid home type", () => {
    expect(() =>
      onboardingSchema.parse({
        home: {
          name: "Test",
          type: "castle",
          yearBuilt: 2000,
          zip: "12345",
          state: "TX",
          climateZone: "2A",
        },
        systems: [],
        appliances: [],
        taskSetups: [],
      })
    ).toThrow();
  });

  it("rejects too many systems (max 50)", () => {
    const systems = Array.from({ length: 51 }, () => ({
      key: "hvac" as const,
      subtype: "central",
    }));
    expect(() =>
      onboardingSchema.parse({
        home: {
          name: "Test",
          type: "condo",
          yearBuilt: 2020,
          zip: "12345",
          state: "NY",
          climateZone: "4A",
        },
        systems,
        appliances: [],
        taskSetups: [],
      })
    ).toThrow();
  });

  it("accepts new appliance categories and system types", () => {
    const result = onboardingSchema.parse({
      home: {
        name: "Test Home",
        type: "single_family",

        zip: "12345",
        state: "CA",
        climateZone: "3B",
      },
      systems: [{ key: "solar", subtype: "" }],
      appliances: ["heat_pump", "boiler", "fireplace", "mini_split", "evap_cooler", "solar_panels"],
      taskSetups: [],
    });
    expect(result.appliances).toContain("heat_pump");
    expect(result.appliances).toContain("solar_panels");
    expect(result.systems[0].key).toBe("solar");
  });
});
