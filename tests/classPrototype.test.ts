import { describe, it, expect, beforeEach } from "vitest"
import { persist } from "../src/index"
import { DefaultMergeStrategy } from "../src/merge/default"
import { DeepMergeStrategy } from "../src/merge/deepMerge"
import type { SerializationStrategy } from "../src/types"

// Mock localStorage (mirrors tests/basic.test.ts)
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string): void => {
      store[key] = value
    },
    removeItem: (key: string): void => {
      delete store[key]
    },
    clear: (): void => {
      store = {}
    },
  }
})()

/**
 * Minimal class fixture with:
 * - a prototype method (to prove methods still work post-merge, not just `instanceof`)
 * - a `fromObject` static reconstructor (mirrors the pattern from the reported issue)
 */
class PasswordState {
  copyState: string
  length: number
  symbols: boolean

  constructor(init: Partial<Pick<PasswordState, "copyState" | "length" | "symbols">>) {
    this.copyState = init.copyState ?? "idle"
    this.length = init.length ?? 12
    this.symbols = init.symbols ?? false
  }

  static fromObject(obj: Record<string, unknown>): PasswordState {
    return new PasswordState({
      copyState: obj.copyState as string | undefined,
      length: obj.length as number | undefined,
      symbols: obj.symbols as boolean | undefined,
    })
  }

  describe(): string {
    return `${this.length}-char password (symbols: ${this.symbols})`
  }
}

/** Nested-class fixture for DeepMergeStrategy recursion tests */
class Preferences {
  language: string
  constructor(language = "en") {
    this.language = language
  }
  shout(): string {
    return this.language.toUpperCase()
  }
}

class AppState {
  count: number
  preferences: Preferences
  constructor(count = 0, preferences = new Preferences()) {
    this.count = count
    this.preferences = preferences
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: localStorageMock })
  localStorageMock.clear()
})

describe("class instance prototype preservation", () => {
  describe("DefaultMergeStrategy", () => {
    it("preserves the initialState's prototype when merging with a restored instance", () => {
      const initialState = new PasswordState({ copyState: "idle", length: 12, symbols: false })
      const restoredState = PasswordState.fromObject({
        copyState: "success",
        length: 20,
        symbols: true,
      })

      const merged = new DefaultMergeStrategy<PasswordState>().merge(
        initialState,
        restoredState,
      )

      expect(merged).toBeInstanceOf(PasswordState)
      expect(merged.describe()).toBe("20-char password (symbols: true)")
      expect(merged.length).toBe(20)
      expect(merged.symbols).toBe(true)
    })

    it("preserves the prototype even when restoredState is a plain object (e.g. raw JSON.parse)", () => {
      const initialState = new PasswordState({ copyState: "idle", length: 12, symbols: false })
      // Simulates a deserialize() that just does JSON.parse and returns a plain object
      const restoredState = {
        copyState: "success",
        length: 16,
        symbols: true,
      } as unknown as PasswordState

      const merged = new DefaultMergeStrategy<PasswordState>().merge(
        initialState,
        restoredState,
      )

      expect(merged).toBeInstanceOf(PasswordState)
      expect(merged.describe()).toBe("16-char password (symbols: true)")
    })

    it("still returns a plain object when initialState is a plain object (no regression)", () => {
      const initialState = { count: 0, text: "Initial" }
      const restoredState = { count: 5, text: "Restored" }

      const merged = new DefaultMergeStrategy<typeof initialState>().merge(
        initialState,
        restoredState,
      )

      expect(Object.getPrototypeOf(merged)).toBe(Object.prototype)
      expect(merged).toEqual({ count: 5, text: "Restored" })
    })
  })

  describe("DeepMergeStrategy", () => {
    it("preserves the initialState's prototype at the top level", () => {
      const initialState = new AppState(0, new Preferences("en"))
      const restoredState = new AppState(5, new Preferences("fr"))

      const merged = new DeepMergeStrategy<AppState>().merge(initialState, restoredState)

      expect(merged).toBeInstanceOf(AppState)
      expect(merged.count).toBe(5)
    })

    it("preserves prototypes on nested class instances through recursion", () => {
      const initialState = new AppState(0, new Preferences("en"))
      const restoredState = new AppState(5, new Preferences("fr"))

      const merged = new DeepMergeStrategy<AppState>().merge(initialState, restoredState)

      expect(merged.preferences).toBeInstanceOf(Preferences)
      expect(merged.preferences.shout()).toBe("FR")
    })

    it("preserves the prototype when restoredState is a plain object (raw JSON.parse)", () => {
      const initialState = new PasswordState({ copyState: "idle", length: 12, symbols: false })
      const restoredState = {
        copyState: "success",
        length: 24,
        symbols: true,
      } as unknown as PasswordState

      const merged = new DeepMergeStrategy<PasswordState>().merge(initialState, restoredState)

      expect(merged).toBeInstanceOf(PasswordState)
      expect(merged.describe()).toBe("24-char password (symbols: true)")
    })

    it("still returns a plain object when initialState is a plain object (no regression)", () => {
      const initialState = { settings: { theme: "light" } }
      const restoredState = { settings: { theme: "dark" } }

      const merged = new DeepMergeStrategy<typeof initialState>().merge(
        initialState,
        restoredState,
      )

      expect(Object.getPrototypeOf(merged)).toBe(Object.prototype)
      expect(Object.getPrototypeOf(merged.settings)).toBe(Object.prototype)
      expect(merged.settings.theme).toBe("dark")
    })
  })

  describe("end-to-end via persist() (reproduces the reported GitHub issue)", () => {
    class CustomSerializationStrategy implements SerializationStrategy<PasswordState, false> {
      readonly isAsync = false as const

      serialize(state: PasswordState): string {
        return JSON.stringify(state)
      }

      deserialize(data: string): PasswordState {
        // Reconstructs a real instance, exactly like the reporter's code
        return PasswordState.fromObject(JSON.parse(data))
      }
    }

    it("store is an instance of the original class after hydration, not a plain object", async () => {
      localStorage.setItem(
        "password-state-key",
        JSON.stringify({ copyState: "success", length: 20, symbols: true }),
      )

      const { store } = await persist<PasswordState>(
        new PasswordState({}),
        "password-state-key",
        { serializationStrategy: CustomSerializationStrategy },
      )

      expect(store).toBeInstanceOf(PasswordState)
      expect(store.describe()).toBe("20-char password (symbols: true)")
    })
  })
})