import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { persist } from "../src/index"
import { IndexedDBStrategy } from "../src/storage/indexDb"

// Mock implementation for IndexedDB
const mockIndexedDB = () => {
	// Mock IDBDatabase
	const mockDB = {
		transaction: vi.fn().mockImplementation(() => mockTransaction),
		objectStoreNames: {
			contains: vi.fn().mockReturnValue(true),
		},
		createObjectStore: vi.fn(),
	}

	// Mock IDBTransaction
	const mockTransaction = {
		objectStore: vi.fn().mockImplementation(() => mockObjectStore),
	}

	// Mock IDBObjectStore
	const mockObjectStore = {
		get: vi.fn().mockImplementation(() => mockRequest),
		getKey: vi.fn().mockImplementation(() => mockRequest),
		put: vi.fn().mockImplementation(() => mockRequest),
		delete: vi.fn().mockImplementation(() => mockRequest),
	}

	// Mock IDBRequest
	const mockRequest = {
		onsuccess: null as ((event: any) => void) | null,
		onerror: null as ((event: any) => void) | null,
		result: null as any,
	}

	// Mock IDBOpenDBRequest extends IDBRequest
	const mockOpenRequest = {
		...mockRequest,
		onupgradeneeded: null as ((event: any) => void) | null,
	}

	// Mock indexedDB global
	const mockIndexedDB = {
		open: vi.fn().mockImplementation(() => {
			setTimeout(() => {
				if (mockOpenRequest.onsuccess) {
					mockOpenRequest.result = mockDB
					mockOpenRequest.onsuccess({ target: mockOpenRequest })
				}
			}, 0)
			return mockOpenRequest
		}),
	}

	return {
		mockDB,
		mockTransaction,
		mockObjectStore,
		mockRequest,
		mockOpenRequest,
		mockIndexedDB,
	}
}

describe("IndexedDBStrategy", () => {
	let mocks: ReturnType<typeof mockIndexedDB>

	beforeEach(() => {
		mocks = mockIndexedDB()
		// Assign the mock to the global object
		Object.defineProperty(global, "indexedDB", {
			value: mocks.mockIndexedDB,
			writable: true,
		})
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	describe("has method", () => {
		it("should return true when key exists", async () => {
			const strategy = new IndexedDBStrategy()

			// Setup mock behavior
			mocks.mockObjectStore.getKey.mockImplementation(() => {
				setTimeout(() => {
					if (mocks.mockRequest.onsuccess) {
						mocks.mockRequest.result = "some-value" // Key exists
						mocks.mockRequest.onsuccess({})
					}
				}, 0)
				return mocks.mockRequest
			})

			const result = await strategy.has("test-key")
			expect(result).toBe(true)
			expect(mocks.mockObjectStore.getKey).toHaveBeenCalledWith("test-key")
		})

		it("should return false when key does not exist", async () => {
			const strategy = new IndexedDBStrategy()

			// Setup mock behavior
			mocks.mockObjectStore.getKey.mockImplementation(() => {
				setTimeout(() => {
					if (mocks.mockRequest.onsuccess) {
						mocks.mockRequest.result = undefined // Key doesn't exist
						mocks.mockRequest.onsuccess({})
					}
				}, 0)
				return mocks.mockRequest
			})

			const result = await strategy.has("non-existent-key")
			expect(result).toBe(false)
		})

		it("should return false on error", async () => {
			const strategy = new IndexedDBStrategy()

			// Setup mock for error
			mocks.mockObjectStore.getKey.mockImplementation(() => {
				setTimeout(() => {
					if (mocks.mockRequest.onerror) {
						mocks.mockRequest.onerror(new Error("DB error"))
					}
				}, 0)
				return mocks.mockRequest
			})

			const result = await strategy.has("test-key")
			expect(result).toBe(false)
		})

		it("should fall back to get if getKey is not available", async () => {
			const strategy = new IndexedDBStrategy()

			// Remove getKey method
			mocks.mockObjectStore.getKey = undefined

			// Setup mock for get
			mocks.mockObjectStore.get.mockImplementation(() => {
				setTimeout(() => {
					if (mocks.mockRequest.onsuccess) {
						mocks.mockRequest.result = "some-value"
						mocks.mockRequest.onsuccess({})
					}
				}, 0)
				return mocks.mockRequest
			})

			const result = await strategy.has("test-key")
			expect(result).toBe(true)
			expect(mocks.mockObjectStore.get).toHaveBeenCalledWith("test-key")
		})
	})

	// You can add tests for get, set, remove methods similarly

	describe("integration with persist function", () => {
		it("should initialize with IndexedDBStrategy", () => {
			// For this test, we just verify it initializes without error
			const initialState = { count: 0 }

			// Setup mock for successful DB open
			mocks.mockIndexedDB.open.mockImplementation(() => {
				setTimeout(() => {
					if (mocks.mockOpenRequest.onsuccess) {
						mocks.mockOpenRequest.result = mocks.mockDB
						mocks.mockOpenRequest.onsuccess({ target: mocks.mockOpenRequest })
					}
				}, 0)
				return mocks.mockOpenRequest
			})

			expect(() => {
				persist(initialState, "indexeddb-test", {
					storageStrategy: IndexedDBStrategy,
				})
			}).not.toThrow()
		})
	})
})
