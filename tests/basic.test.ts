// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { persist } from "../src/index"
import { proxy, snapshot } from "valtio"
import { DeepMergeStrategy } from "../src/merge/deepMerge"
import { DefaultMergeStrategy } from "../src/merge/default"
import { JSONSerializationStrategy } from "../src/serialization/json"
import { LocalStorageStrategy } from "../src/storage/localStorage"
import { SessionStorageStrategy } from "../src/storage/sessionStorage"
import { MemoryStorageStrategy } from "../src/storage/memoryStorage"

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {}
	return {
		getItem: (key: string): string | null => {
			return store[key] || null
		},
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

// Mock sessionStorage
const sessionStorageMock = (() => {
	let store: Record<string, string> = {}
	return {
		getItem: (key: string): string | null => {
			return store[key] || null
		},
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

// Define some test interfaces and types
interface TestState {
	count: number
	text: string
	nested?: {
		value: string
		items: string[]
	}
}

interface ComplexTestState {
	users: {
		id: string
		name: string
		roles: string[]
	}[]
	settings: {
		theme: string
		notifications: boolean
		preferences: {
			language: string
			timezone: string
		}
	}
}

describe("persist function", () => {
	// Setup and teardown
	beforeEach(() => {
		// Set up mocks
		Object.defineProperty(globalThis, "localStorage", {
			value: localStorageMock,
		})
		Object.defineProperty(globalThis, "sessionStorage", {
			value: sessionStorageMock,
		})

		// Clear storages before each test
		localStorageMock.clear()
		sessionStorageMock.clear()

		// Reset all mocks
		vi.resetAllMocks()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	// Basic functionality tests
	describe("basic functionality", () => {
		it("should create a store with the initial state", () => {
			const initialState: TestState = { count: 0, text: "Hello" }
			const { store } = persist(initialState, "test-key")

			expect(store.count).toBe(0)
			expect(store.text).toBe("Hello")
		})

		it("should persist state changes to storage", async () => {
			const initialState: TestState = { count: 0, text: "Hello" }
			const { store, persist: persistStore } = persist(initialState, "test-key")

			// Modify state
			store.count = 5
			store.text = "Updated"

			// Manually persist
			await persistStore()

			// Check if localStorage was updated
			const stored = localStorage.getItem("test-key")
			expect(stored).not.toBeNull()

			const parsedState = JSON.parse(stored!)
			expect(parsedState.count).toBe(5)
			expect(parsedState.text).toBe("Updated")
		})

		it("should restore state from storage on initialization", () => {
			// First, store some state
			const initialState: TestState = { count: 0, text: "Hello" }
			localStorage.setItem(
				"test-key",
				JSON.stringify({ count: 10, text: "Stored" }),
			)

			// Now initialize with the same key
			const { store } = persist(initialState, "test-key")

			// State should be restored from storage
			expect(store.count).toBe(10)
			expect(store.text).toBe("Stored")
		})

		it("should clear persisted state when requested", async () => {
			const initialState: TestState = { count: 0, text: "Hello" }
			const { store, clear } = persist(initialState, "test-key")

			// Modify and let it persist
			store.count = 5

			// Manually clear
			await clear()

			// Storage should be empty for this key
			expect(localStorage.getItem("test-key")).toBeNull()
		})
	})

	// Storage strategy tests
	describe("storage strategies", () => {
		it("should work with localStorage strategy", async () => {
			const initialState: TestState = { count: 0, text: "Hello" }
			const { store, persist: persistStore } = persist(
				initialState,
				"local-test",
				{
					storageStrategy: LocalStorageStrategy,
				},
			)

			store.count = 20
			await persistStore()

			expect(localStorage.getItem("local-test")).not.toBeNull()
			const stored = JSON.parse(localStorage.getItem("local-test")!)
			expect(stored.count).toBe(20)
		})

		it("should work with sessionStorage strategy", async () => {
			const initialState: TestState = { count: 0, text: "Hello" }
			const { store, persist: persistStore } = persist(
				initialState,
				"session-test",
				{
					storageStrategy: SessionStorageStrategy,
				},
			)

			store.count = 30
			await persistStore()

			expect(sessionStorage.getItem("session-test")).not.toBeNull()
			const stored = JSON.parse(sessionStorage.getItem("session-test")!)
			expect(stored.count).toBe(30)
		})

		it("should work with memoryStorage strategy", async () => {
			const initialState: TestState = { count: 0, text: "Hello" }
			const { store, persist: persistStore } = persist(
				initialState,
				"memory-test",
				{
					storageStrategy: MemoryStorageStrategy,
				},
			)

			store.count = 40
			await persistStore()

			// We can't directly check the memory storage, but we can test restoring
			const { store: newStore } = persist(initialState, "memory-test", {
				storageStrategy: MemoryStorageStrategy,
			})

			expect(newStore.count).toBe(40)
		})
	})

	// Merge strategy tests
	describe("merge strategies", () => {
		it("should use DefaultMergeStrategy to merge states", () => {
			// Store state with some properties
			localStorage.setItem(
				"merge-test",
				JSON.stringify({
					count: 50,
					text: "Stored",
					extra: "Extra field",
				}),
			)

			const initialState: TestState = {
				count: 0,
				text: "Initial",
				nested: { value: "test", items: ["a", "b"] },
			}

			// Use default merge strategy
			const { store } = persist(initialState, "merge-test", {
				mergeStrategy: DefaultMergeStrategy,
			})

			// Stored properties should override initial
			expect(store.count).toBe(50)
			expect(store.text).toBe("Stored")
			// Extra properties from storage should be preserved
			expect(store.extra).toBe("Extra field")
			// Initial properties not in storage should remain
			expect(store.nested).toEqual({ value: "test", items: ["a", "b"] })
		})

		it("should use DeepMergeStrategy to recursively merge nested objects", () => {
			// Prepare complex initial state
			const initialState: ComplexTestState = {
				users: [{ id: "1", name: "Alice", roles: ["admin"] }],
				settings: {
					theme: "light",
					notifications: true,
					preferences: {
						language: "en",
						timezone: "UTC",
					},
				},
			}

			// Store a partial state with some nested changes
			localStorage.setItem(
				"deep-merge-test",
				JSON.stringify({
					users: [{ id: "1", name: "Alice Updated", roles: ["admin", "user"] }],
					settings: {
						theme: "dark",
						preferences: {
							language: "fr",
						},
					},
				}),
			)

			// Use deep merge strategy
			const { store } = persist(initialState, "deep-merge-test", {
				mergeStrategy: DeepMergeStrategy,
			})

			// Check deep merging results
			expect(store.users[0].name).toBe("Alice Updated")
			expect(store.users[0].roles).toEqual(["admin", "user"])
			expect(store.settings.theme).toBe("dark")
			// This should be preserved from initial because deep merge is used
			expect(store.settings.notifications).toBe(true)
			// Nested preferences should be merged
			expect(store.settings.preferences.language).toBe("fr")
			expect(store.settings.preferences.timezone).toBe("UTC")
		})
	})

	// Serialization strategy tests
	describe("serialization strategies", () => {
		it("should use JSONSerializationStrategy by default", async () => {
			const initialState: TestState = { count: 0, text: "Hello" }
			const { store, persist: persistStore } = persist(
				initialState,
				"json-test",
			)

			store.count = 60
			await persistStore()

			// Check that JSON serialization was used
			const stored = localStorage.getItem("json-test")
			expect(stored).toBe(JSON.stringify({ count: 60, text: "Hello" }))
		})

		it("should support custom serialization strategies", async () => {
			// Create a custom serialization strategy
			class CustomSerializationStrategy
				implements SerializationStrategy<TestState>
			{
				serialize(state: Snapshot<TestState>): string {
					// Add a prefix to the serialized data
					return `CUSTOM:${JSON.stringify(state)}`
				}

				deserialize(data: string): TestState {
					// Remove the prefix before parsing
					const jsonData = data.replace("CUSTOM:", "")
					return JSON.parse(jsonData)
				}
			}

			const initialState: TestState = { count: 0, text: "Hello" }
			const { store, persist: persistStore } = persist(
				initialState,
				"custom-serial-test",
				{
					serializationStrategy: CustomSerializationStrategy,
				},
			)

			store.count = 70
			await persistStore()

			// Check the custom serialization format
			const stored = localStorage.getItem("custom-serial-test")
			expect(stored?.startsWith("CUSTOM:")).toBe(true)

			// Test restoration with custom serialization
			const { store: restoredStore } = persist(
				initialState,
				"custom-serial-test",
				{
					serializationStrategy: CustomSerializationStrategy,
				},
			)

			expect(restoredStore.count).toBe(70)
		})
	})

	// Other option tests
	describe("other options", () => {
		it("should respect shouldPersist option", async () => {
			const initialState: TestState = { count: 0, text: "Hello" }

			// Set initial state to localStorage so we have something to start with
			localStorage.setItem("should-persist-test", JSON.stringify(initialState))

			// Only persist when count is even
			const { store, persist: persistStore } = persist(
				initialState,
				"should-persist-test",
				{
					shouldPersist: (prevState, nextState) => nextState.count % 2 === 0,
				},
			)

			// Update to odd number shouldn't persist
			store.count = 1

			// Even when manually calling persist, it should respect shouldPersist
			await persistStore()

			let stored = localStorage.getItem("should-persist-test")
			expect(JSON.parse(stored!).count).toBe(0) // Should still be the initial value

			// Update to even number should persist
			store.count = 2
			await persistStore()

			stored = localStorage.getItem("should-persist-test")
			expect(JSON.parse(stored!).count).toBe(2)
		})

		it("should respect restoreStateOnInit option", () => {
			// First, store some state
			localStorage.setItem(
				"restore-test",
				JSON.stringify({ count: 100, text: "Stored" }),
			)

			const initialState: TestState = { count: 0, text: "Initial" }

			// Don't restore on init
			const { store } = persist(initialState, "restore-test", {
				restoreStateOnInit: false,
			})

			// Should use initial state, not stored state
			expect(store.count).toBe(0)
			expect(store.text).toBe("Initial")
		})

		it("should handle debounceTime option", async () => {
			vi.useFakeTimers()
			const initialState: TestState = { count: 0, text: "Hello" }

			const { store, persist: persistStore } = persist(
				initialState,
				"debounce-test",
				{
					debounceTime: 500, // 500ms debounce
				},
			)

			// Make multiple rapid updates
			store.count = 1
			store.count = 2
			store.count = 3

			// Nothing should be persisted yet
			expect(localStorage.getItem("debounce-test")).toBe(null)

			// Advance timer past debounce time
			vi.advanceTimersByTime(600)

			// Manually trigger persist to ensure it's called
			await persistStore()

			// Now it should be persisted with final value
			const stored = localStorage.getItem("debounce-test")
			expect(JSON.parse(stored!).count).toBe(3)

			vi.useRealTimers()
		})
	})

	// Advanced functionality tests
	describe("advanced functionality", () => {
		it("should handle complex nested objects", async () => {
			const complexState: ComplexTestState = {
				users: [
					{ id: "1", name: "Alice", roles: ["admin"] },
					{ id: "2", name: "Bob", roles: ["user"] },
				],
				settings: {
					theme: "light",
					notifications: true,
					preferences: {
						language: "en",
						timezone: "UTC",
					},
				},
			}

			const { store, persist: persistStore } = persist(
				complexState,
				"complex-test",
			)

			// Modify nested properties
			store.users[0].name = "Alice Updated"
			store.users.push({ id: "3", name: "Charlie", roles: ["guest"] })
			store.settings.preferences.language = "es"

			await persistStore()

			// Check persistence of complex state
			const stored = localStorage.getItem("complex-test")
			const parsedState = JSON.parse(stored!)

			expect(parsedState.users.length).toBe(3)
			expect(parsedState.users[0].name).toBe("Alice Updated")
			expect(parsedState.users[2].name).toBe("Charlie")
			expect(parsedState.settings.preferences.language).toBe("es")
		})

		it("should support manual restore operation", async () => {
			const initialState: TestState = { count: 0, text: "Initial" }
			const { store, restore } = persist(initialState, "manual-restore-test")

			// Store a different state manually
			localStorage.setItem(
				"manual-restore-test",
				JSON.stringify({
					count: 200,
					text: "Manually Stored",
				}),
			)

			// Perform manual restore
			const success = await restore()

			expect(success).toBe(true)
			expect(store.count).toBe(200)
			expect(store.text).toBe("Manually Stored")
		})

		it("should handle options as second parameter", () => {
			const initialState: TestState = { count: 0, text: "Hello" }

			// Use options object with key as second parameter
			const { store } = persist(initialState, {
				key: "options-test",
				storageStrategy: SessionStorageStrategy,
				debounceTime: 200,
			})

			// Just verify it doesn't throw and creates the store
			expect(store.count).toBe(0)
			expect(store.text).toBe("Hello")
		})
	})
})
