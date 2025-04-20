// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { persist } from "../src/index"
import { proxy } from "valtio"
import { AsyncStorageStrategy } from "../src/storage/asyncStorage"

// Mock AsyncStorage
const asyncStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn(async (key: string): Promise<string | null> => {
      return store[key] || null
    }),
    setItem: vi.fn(async (key: string, value: string): Promise<void> => {
      store[key] = value
    }),
    removeItem: vi.fn(async (key: string): Promise<void> => {
      delete store[key]
    }),
    clear: (): void => {
      store = {}
    }
  }
})()

// Mock the module import
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: asyncStorageMock
}))

// Define test interface
interface TestState {
  count: number
  text: string
  nested?: {
    value: string
    items: string[]
  }
}

describe("AsyncStorageStrategy", () => {
  // Setup and teardown
  beforeEach(() => {
    // Clear storage before each test
    asyncStorageMock.clear()
    
    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should implement StorageStrategy with correct isAsync flag", () => {
    const strategy = new AsyncStorageStrategy()
    expect(strategy.isAsync).toBe(true)
  })

  it("should handle the has method correctly", async () => {
    const strategy = new AsyncStorageStrategy()
    
    // Test when key doesn't exist
    await asyncStorageMock.setItem("exists", "value")
    
    const hasResult1 = await strategy.has("exists")
    const hasResult2 = await strategy.has("nonexistent")
    
    expect(hasResult1).toBe(true)
    expect(hasResult2).toBe(false)
    expect(asyncStorageMock.getItem).toHaveBeenCalledTimes(2)
  })

  it("should handle the get method correctly", async () => {
    const strategy = new AsyncStorageStrategy()
    
    await asyncStorageMock.setItem("testKey", "testValue")
    
    const value = await strategy.get("testKey")
    const nonExistentValue = await strategy.get("nonExistentKey")
    
    expect(value).toBe("testValue")
    expect(nonExistentValue).toBe(null)
    expect(asyncStorageMock.getItem).toHaveBeenCalledTimes(2)
  })

  it("should handle the set method correctly", async () => {
    const strategy = new AsyncStorageStrategy()
    
    await strategy.set("newKey", "newValue")
    
    expect(asyncStorageMock.setItem).toHaveBeenCalledWith("newKey", "newValue")
    
    const storedValue = await asyncStorageMock.getItem("newKey")
    expect(storedValue).toBe("newValue")
  })

  it("should handle the remove method correctly", async () => {
    const strategy = new AsyncStorageStrategy()
    
    await asyncStorageMock.setItem("keyToRemove", "value")
    await strategy.remove("keyToRemove")
    
    expect(asyncStorageMock.removeItem).toHaveBeenCalledWith("keyToRemove")
    
    const removedValue = await asyncStorageMock.getItem("keyToRemove")
    expect(removedValue).toBe(null)
  })

  it("should handle module import error", async () => {
    // Temporarily mock getAsyncStorage method to simulate import error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const originalGetAsyncStorage = AsyncStorageStrategy.prototype.getAsyncStorage
    
    AsyncStorageStrategy.prototype.getAsyncStorage = vi.fn().mockImplementation(() => {
      return Promise.reject(new Error("Import failed"))
    })
    
    const strategy = new AsyncStorageStrategy()
    
    // Error should be caught and false returned
    const hasResult = await strategy.has("test")
    expect(hasResult).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith("AsyncStorage has error:", expect.any(Error))
    
    // Error should be caught and null returned
    const getResult = await strategy.get("test")
    expect(getResult).toBe(null)
    expect(consoleSpy).toHaveBeenCalledWith("AsyncStorage get error:", expect.any(Error))
    
    // Error should be caught
    await strategy.set("test", "value")
    expect(consoleSpy).toHaveBeenCalledWith("AsyncStorage set error:", expect.any(Error))
    
    // Error should be caught
    await strategy.remove("test")
    expect(consoleSpy).toHaveBeenCalledWith("AsyncStorage remove error:", expect.any(Error))
    
    // Restore original method and console spy
    AsyncStorageStrategy.prototype.getAsyncStorage = originalGetAsyncStorage
    consoleSpy.mockRestore()
  })

  it("should work with persist function", async () => {
    const initialState: TestState = { count: 0, text: "Hello" }
    
    const { store, persist: persistStore } = await persist(
      initialState,
      "async-test",
      {
        storageStrategy: AsyncStorageStrategy
      },
    )
    
    // Initialize store with initial state
    Object.assign(store, initialState)
    
    // Update the store
    store.count = 42
    store.text = "Updated"
    
    // Manually persist
    await persistStore()
    
    // Check if AsyncStorage was called with correct args
    expect(asyncStorageMock.setItem).toHaveBeenCalledWith(
      "async-test", 
      expect.any(String)
    )
    
    // Verify the persisted value
    const storedJson = await asyncStorageMock.getItem("async-test")
    const storedData = JSON.parse(storedJson)
    
    expect(storedData.count).toBe(42)
    expect(storedData.text).toBe("Updated")
  })

  it("should restore state from AsyncStorage", async () => {
    const initialState: TestState = { count: 0, text: "Initial" }
    
    // First store something in AsyncStorage
    await asyncStorageMock.setItem(
      "restore-test",
      JSON.stringify({ count: 99, text: "Restored" })
    )
    
    // Create store with same key
    const { store } = await persist(
      initialState,
      "restore-test",
      {
        storageStrategy: AsyncStorageStrategy
      }
    )
    
    // State should be restored from storage
    expect(store.count).toBe(99)
    expect(store.text).toBe("Restored")
  })

  it("should cache the AsyncStorage module promise", async () => {
    const strategy = new AsyncStorageStrategy()
    
    // Call a method that triggers getAsyncStorage
    await strategy.get("test")
    
    // Call another method
    await strategy.set("test", "value")
    
    // The import should have been called only once
    expect(asyncStorageMock.getItem).toHaveBeenCalledTimes(1)
    expect(asyncStorageMock.setItem).toHaveBeenCalledTimes(1)
  })
})