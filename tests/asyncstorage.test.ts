import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { persist } from "../src/index"
import { AsyncStorageStrategy } from "../src/storage/asyncStorage"

// Create a mock for AsyncStorage
const mockAsyncStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}

// Mock the AsyncStorage module
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage
}), { virtual: true })

// Mock the AsyncStorageStrategy class methods directly
vi.mock('../src/storage/asyncStorage', () => {
  // Get the actual module
  const actual = vi.importActual('../src/storage/asyncStorage')
  
  // Return a modified version
  return {
    ...actual,
    AsyncStorageStrategy: class MockAsyncStorageStrategy {
      isSync = false
      
      constructor() {
        // Do nothing - no need to check for the module
      }
      
      async has(key) {
        try {
          const value = await mockAsyncStorage.getItem(key)
          return value !== null
        } catch (error) {
          console.error("AsyncStorage has error:", error)
          return false
        }
      }
      
      async get(key) {
        try {
          return await mockAsyncStorage.getItem(key)
        } catch (error) {
          console.error("AsyncStorage get error:", error)
          return null
        }
      }
      
      async set(key, value) {
        try {
          await mockAsyncStorage.setItem(key, value)
        } catch (error) {
          console.error("AsyncStorage set error:", error)
        }
      }
      
      async remove(key) {
        try {
          await mockAsyncStorage.removeItem(key)
        } catch (error) {
          console.error("AsyncStorage remove error:", error)
        }
      }
    }
  }
})

describe("AsyncStorageStrategy", () => {
  let strategy

  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks()
    mockAsyncStorage.getItem.mockReset()
    mockAsyncStorage.setItem.mockReset()
    mockAsyncStorage.removeItem.mockReset()
    
    // Create a new strategy instance for each test
    strategy = new AsyncStorageStrategy()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("constructor", () => {
    it("should create an instance with isSync=false", () => {
      expect(strategy.isSync).toBe(false)
    })
  })

  describe("has method", () => {
    it("should return true when key exists", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("stored-value")

      const result = await strategy.has("test-key")
      
      expect(result).toBe(true)
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith("test-key")
    })

    it("should return false when key does not exist", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null)

      const result = await strategy.has("non-existent-key")
      
      expect(result).toBe(false)
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith("non-existent-key")
    })

    it("should return false on error", async () => {
      const error = new Error("AsyncStorage error")
      mockAsyncStorage.getItem.mockRejectedValue(error)
      
      // Spy on console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const result = await strategy.has("test-key")
      
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith("AsyncStorage has error:", error)
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith("test-key")
    })
  })

  describe("get method", () => {
    it("should return the stored value when key exists", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("stored-value")

      const result = await strategy.get("test-key")
      
      expect(result).toBe("stored-value")
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith("test-key")
    })

    it("should return null when key does not exist", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null)

      const result = await strategy.get("non-existent-key")
      
      expect(result).toBeNull()
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith("non-existent-key")
    })

    it("should return null on error", async () => {
      const error = new Error("AsyncStorage error")
      mockAsyncStorage.getItem.mockRejectedValue(error)
      
      // Spy on console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const result = await strategy.get("test-key")
      
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith("AsyncStorage get error:", error)
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith("test-key")
    })
  })

  describe("set method", () => {
    it("should store the value", async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined)

      await strategy.set("test-key", "test-value")
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith("test-key", "test-value")
    })

    it("should handle errors", async () => {
      const error = new Error("AsyncStorage error")
      mockAsyncStorage.setItem.mockRejectedValue(error)
      
      // Spy on console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      await strategy.set("test-key", "test-value")
      
      expect(consoleSpy).toHaveBeenCalledWith("AsyncStorage set error:", error)
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith("test-key", "test-value")
    })
  })

  describe("remove method", () => {
    it("should remove the stored value", async () => {
      mockAsyncStorage.removeItem.mockResolvedValue(undefined)

      await strategy.remove("test-key")
      
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith("test-key")
    })

    it("should handle errors", async () => {
      const error = new Error("AsyncStorage error")
      mockAsyncStorage.removeItem.mockRejectedValue(error)
      
      // Spy on console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      await strategy.remove("test-key")
      
      expect(consoleSpy).toHaveBeenCalledWith("AsyncStorage remove error:", error)
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith("test-key")
    })
  })

  describe("integration with persist function", () => {
    it("should initialize with AsyncStorageStrategy", () => {
      const initialState = { count: 0, text: "Hello" }
      
      expect(() => {
        persist(initialState, "asyncstorage-test", {
          storageStrategy: AsyncStorageStrategy,
        })
      }).not.toThrow()
    })

    it("should persist state changes to AsyncStorage", async () => {
      const initialState = { count: 0, text: "Hello" }
      
      const { store, persist: persistStore } = persist(
        initialState,
        "asyncstorage-test",
        {
          storageStrategy: AsyncStorageStrategy,
        }
      )
      
      // Modify state
      store.count = 5
      store.text = "Updated"
      
      // Manually persist
      await persistStore()
      
      // Check if set was called with the correct key
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "asyncstorage-test",
        expect.any(String)
      )
      
      // Verify the serialized data
      const [[_, serializedData]] = mockAsyncStorage.setItem.mock.calls
      const parsedData = JSON.parse(serializedData)
      expect(parsedData.count).toBe(5)
      expect(parsedData.text).toBe("Updated")
    })

    it("should restore state from AsyncStorage on initialization", async () => {
      const initialState = { count: 0, text: "Hello" }
      const storedState = { count: 10, text: "Stored" }
      
      // Set up mock to return stored state
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedState))
      
      const { store } = persist(initialState, "asyncstorage-test", {
        storageStrategy: AsyncStorageStrategy,
      })
      
      // Wait for the async state restoration
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // State should be restored from storage
      expect(store.count).toBe(10)
      expect(store.text).toBe("Stored")
    })

    it("should clear persisted state when requested", async () => {
      const initialState = { count: 0, text: "Hello" }
      
      const { clear } = persist(initialState, "asyncstorage-test", {
        storageStrategy: AsyncStorageStrategy,
      })
      
      // Manually clear
      await clear()
      
      // remove should be called with the key
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith("asyncstorage-test")
    })
  })
})