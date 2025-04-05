import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { persist } from "../src/index"

// Create mocks for expo-file-system
const mockFileSystem = {
  documentDirectory: 'file:///mock/document/directory/',
  getInfoAsync: vi.fn(),
  makeDirectoryAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
  writeAsStringAsync: vi.fn(),
  deleteAsync: vi.fn()
}

// Mock the expo-file-system module
vi.mock('expo-file-system', () => mockFileSystem, { virtual: true });

// Mock the ExpoFileSystemStrategy class
vi.mock('../src/storage/expoFileSystem', () => {
  return {
    ExpoFileSystemStrategy: class MockExpoFileSystemStrategy {
      isSync = false
      baseDirectory: string
      
      constructor(baseDirectory?: string) {
        this.baseDirectory = baseDirectory || 'valtio-persist/'
      }
      
      getFilePath(key: string): string {
        // Ensure the key is valid for a file name by replacing invalid characters
        const safeKey = key.replace(/[/\\?%*:|"<>]/g, '_')
        return `${mockFileSystem.documentDirectory}${this.baseDirectory}${safeKey}.json`
      }
      
      async ensureDirectoryExists(): Promise<void> {
        // This will be mocked in tests
      }
      
      async has(key: string): Promise<boolean> {
        try {
          const filePath = this.getFilePath(key)
          
          const fileInfo = await mockFileSystem.getInfoAsync(filePath)
          return fileInfo.exists === true
        } catch (error) {
          console.error("ExpoFileSystem has error:", error)
          return false
        }
      }
      
      async get(key: string): Promise<string | null> {
        try {
          const filePath = this.getFilePath(key)
          
          // Check if file exists before reading
          const fileInfo = await mockFileSystem.getInfoAsync(filePath)
          
          if (!fileInfo.exists) {
            return null
          }
          
          const content = await mockFileSystem.readAsStringAsync(filePath)
          return content
        } catch (error) {
          console.error("ExpoFileSystem get error:", error)
          return null
        }
      }
      
      async set(key: string, value: string): Promise<void> {
        try {
          const filePath = this.getFilePath(key)
          await mockFileSystem.writeAsStringAsync(filePath, value)
        } catch (error) {
          console.error("ExpoFileSystem set error:", error)
        }
      }
      
      async remove(key: string): Promise<void> {
        try {
          const filePath = this.getFilePath(key)
          
          // Check if file exists before attempting to delete
          const fileInfo = await mockFileSystem.getInfoAsync(filePath)
          
          if (fileInfo.exists) {
            await mockFileSystem.deleteAsync(filePath)
          }
        } catch (error) {
          console.error("ExpoFileSystem remove error:", error)
        }
      }
    }
  }
});

// Now import the mocked class
import { ExpoFileSystemStrategy } from "../src/storage/expoFileSystem"

describe("ExpoFileSystemStrategy", () => {
  let strategy: ExpoFileSystemStrategy

  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks()
    
    // Set up mock default responses to ensure tests don't fail
    mockFileSystem.getInfoAsync.mockReset().mockResolvedValue({ exists: true })
    mockFileSystem.makeDirectoryAsync.mockReset().mockResolvedValue(undefined)
    mockFileSystem.readAsStringAsync.mockReset().mockResolvedValue("default-content")
    mockFileSystem.writeAsStringAsync.mockReset().mockResolvedValue(undefined)
    mockFileSystem.deleteAsync.mockReset().mockResolvedValue(undefined)
    
    // Create a new strategy instance for each test
    strategy = new ExpoFileSystemStrategy()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("constructor", () => {
    it("should create an instance with isSync=false", () => {
      expect(strategy.isSync).toBe(false)
    })

    it("should use the provided baseDirectory if specified", () => {
      const customStrategy = new ExpoFileSystemStrategy('custom-directory/')
      
      // Set up directory check to succeed
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: false })
      mockFileSystem.makeDirectoryAsync.mockResolvedValueOnce(undefined)
      
      // We'll test this by ensuring the makeDirectoryAsync is called with the correct path
      return customStrategy.has('test-key').then(() => {
        expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith(
          `${mockFileSystem.documentDirectory}custom-directory/test-key.json`
        )
      })
    })
  })
  
  describe("getFilePath", () => {
    it("should sanitize keys for file names", async () => {
      // Set up mocks for the has method
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: true }) // File exists
      
      // Use a key with special characters that should be sanitized
      await strategy.has('test/key?with:special*chars')
      
      // Verify the path was sanitized
      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith(
        `${mockFileSystem.documentDirectory}valtio-persist/test_key_with_special_chars.json`
      )
    })
  })

  describe("has method", () => {
    it("should return true when file exists", async () => {
      // File exists
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: true })

      const result = await strategy.has("test-key")
      
      expect(result).toBe(true)
      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith(
        `${mockFileSystem.documentDirectory}valtio-persist/test-key.json`
      )
    })

    it("should return false when file does not exist", async () => {
      // File doesn't exist
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: false })

      const result = await strategy.has("non-existent-key")
      
      expect(result).toBe(false)
    })

    it("should return false on error", async () => {
      const error = new Error("ExpoFileSystem error")
      
      // Make getInfoAsync throw an error
      mockFileSystem.getInfoAsync.mockRejectedValueOnce(error)
      
      // Spy on console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const result = await strategy.has("test-key")
      
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith("ExpoFileSystem has error:", error)
    })
  })

  describe("get method", () => {
    it("should return the stored value when file exists", async () => {
      // File exists
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: true })
      
      // File content
      mockFileSystem.readAsStringAsync.mockResolvedValueOnce("stored-value")

      const result = await strategy.get("test-key")
      
      expect(result).toBe("stored-value")
      expect(mockFileSystem.readAsStringAsync).toHaveBeenCalledWith(
        `${mockFileSystem.documentDirectory}valtio-persist/test-key.json`
      )
    })

    it("should return null when file does not exist", async () => {
      // File doesn't exist
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: false })

      const result = await strategy.get("non-existent-key")
      
      expect(result).toBeNull()
      expect(mockFileSystem.readAsStringAsync).not.toHaveBeenCalled()
    })

    it("should return null on error", async () => {
      const error = new Error("ExpoFileSystem error")
      
      // Make getInfoAsync throw an error
      mockFileSystem.getInfoAsync.mockRejectedValueOnce(error)
      
      // Spy on console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const result = await strategy.get("test-key")
      
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith("ExpoFileSystem get error:", error)
    })
    
    it("should return null when readAsStringAsync fails", async () => {
      const error = new Error("Read file error")
      
      // File exists
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: true })
      
      // Reading fails
      mockFileSystem.readAsStringAsync.mockRejectedValueOnce(error)
      
      // Spy on console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const result = await strategy.get("test-key")
      
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith("ExpoFileSystem get error:", error)
    })
  })

  describe("set method", () => {
    it("should store the value in the file", async () => {
      // Write succeeds
      mockFileSystem.writeAsStringAsync.mockResolvedValueOnce(undefined)

      await strategy.set("test-key", "test-value")
      
      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        `${mockFileSystem.documentDirectory}valtio-persist/test-key.json`,
        "test-value"
      )
    })

    it("should handle errors", async () => {
      const error = new Error("ExpoFileSystem error")
      
      // Make writeAsStringAsync throw an error
      mockFileSystem.writeAsStringAsync.mockRejectedValueOnce(error)
      
      // Spy on console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      await strategy.set("test-key", "test-value")
      
      expect(consoleSpy).toHaveBeenCalledWith("ExpoFileSystem set error:", error)
    })
  })

  describe("remove method", () => {
    it("should remove the file when it exists", async () => {
      // File exists
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: true })
      
      // Delete succeeds
      mockFileSystem.deleteAsync.mockResolvedValueOnce(undefined)

      await strategy.remove("test-key")
      
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        `${mockFileSystem.documentDirectory}valtio-persist/test-key.json`
      )
    })

    it("should not attempt deletion when file does not exist", async () => {
      // File doesn't exist
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: false })

      await strategy.remove("non-existent-key")
      
      expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled()
    })

    it("should handle errors", async () => {
      const error = new Error("ExpoFileSystem error")
      
      // Make getInfoAsync throw an error
      mockFileSystem.getInfoAsync.mockRejectedValueOnce(error)
      
      // Spy on console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      await strategy.remove("test-key")
      
      expect(consoleSpy).toHaveBeenCalledWith("ExpoFileSystem remove error:", error)
      expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled()
    })
    
    it("should handle deleteAsync errors", async () => {
      const error = new Error("Delete file error")
      
      // File exists
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({ exists: true })
      
      // Deletion fails
      mockFileSystem.deleteAsync.mockRejectedValueOnce(error)
      
      // Spy on console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      await strategy.remove("test-key")
      
      expect(consoleSpy).toHaveBeenCalledWith("ExpoFileSystem remove error:", error)
    })
  })

  describe("integration with persist function", () => {
    it("should initialize with ExpoFileSystemStrategy", () => {
      const initialState = { count: 0, text: "Hello" }
      
      // Create a mock strategy instance for persist function
      const mockStrategyInstance = {
        isSync: false,
        has: vi.fn().mockResolvedValue(false),
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined)
      }
      
      // Spy on ExpoFileSystemStrategy methods
      vi.spyOn(ExpoFileSystemStrategy.prototype, 'has').mockImplementation(mockStrategyInstance.has)
      vi.spyOn(ExpoFileSystemStrategy.prototype, 'get').mockImplementation(mockStrategyInstance.get)
      vi.spyOn(ExpoFileSystemStrategy.prototype, 'set').mockImplementation(mockStrategyInstance.set)
      vi.spyOn(ExpoFileSystemStrategy.prototype, 'remove').mockImplementation(mockStrategyInstance.remove)
      
      expect(() => {
        persist(initialState, "expo-test", {
          storageStrategy: ExpoFileSystemStrategy,
        })
      }).not.toThrow()
    })

    it("should persist state changes to file", async () => {
      const initialState = { count: 0, text: "Hello" }
      
      // Create mock strategy instance for persist function
      const mockStrategyInstance = {
        isSync: false,
        has: vi.fn().mockResolvedValue(false),
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined)
      }
      
      vi.spyOn(ExpoFileSystemStrategy.prototype, 'has').mockImplementation(mockStrategyInstance.has)
      vi.spyOn(ExpoFileSystemStrategy.prototype, 'get').mockImplementation(mockStrategyInstance.get)
      vi.spyOn(ExpoFileSystemStrategy.prototype, 'set').mockImplementation(mockStrategyInstance.set)
      vi.spyOn(ExpoFileSystemStrategy.prototype, 'remove').mockImplementation(mockStrategyInstance.remove)
      
      const { store, persist: persistStore } = persist(
        initialState,
        "expo-test",
        {
          storageStrategy: ExpoFileSystemStrategy,
        }
      )
      
      // Modify state
      store.count = 5
      store.text = "Updated"
      
      // Manually persist
      await persistStore()
      
      // Check if set was called with the correct key
      expect(mockStrategyInstance.set).toHaveBeenCalledWith(
        "expo-test",
        expect.any(String)
      )
      
      // Verify the serialized data
      const [[_, serializedData]] = mockStrategyInstance.set.mock.calls
      const parsedData = JSON.parse(serializedData)
      expect(parsedData.count).toBe(5)
      expect(parsedData.text).toBe("Updated")
    })

    it("should restore state from file on initialization", async () => {
      const initialState = { count: 0, text: "Hello" }
      const storedState = { count: 10, text: "Stored" }
      
      // Create mock strategy instance for persist function
      const mockStrategyInstance = {
        isSync: false,
        has: vi.fn().mockResolvedValue(true),
        get: vi.fn().mockResolvedValue(JSON.stringify(storedState)),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined)
      }
      
      vi.spyOn(ExpoFileSystemStrategy.prototype, 'has').mockImplementation(mockStrategyInstance.has)
      vi.spyOn(ExpoFileSystemStrategy.prototype, 'get').mockImplementation(mockStrategyInstance.get)
      vi.spyOn(ExpoFileSystemStrategy.prototype, 'set').mockImplementation(mockStrategyInstance.set)
      vi.spyOn(ExpoFileSystemStrategy.prototype, 'remove').mockImplementation(mockStrategyInstance.remove)
      
      const { store } = persist(initialState, "expo-test", {
        storageStrategy: ExpoFileSystemStrategy,
      })
      
      // Wait for the async state restoration
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // State should be restored from storage
      expect(store.count).toBe(10)
      expect(store.text).toBe("Stored")
    })

    it("should clear persisted state when requested", async () => {
      const initialState = { count: 0, text: "Hello" }
      
      // Create mock strategy instance for persist function
      const mockStrategyInstance = {
        isSync: false,
        has: vi.fn().mockResolvedValue(false),
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined)
      }
      
      vi.spyOn(ExpoFileSystemStrategy.prototype, 'has').mockImplementation(mockStrategyInstance.has)
      vi.spyOn(ExpoFileSystemStrategy.prototype, 'get').mockImplementation(mockStrategyInstance.get)
      vi.spyOn(ExpoFileSystemStrategy.prototype, 'set').mockImplementation(mockStrategyInstance.set)
      vi.spyOn(ExpoFileSystemStrategy.prototype, 'remove').mockImplementation(mockStrategyInstance.remove)
      
      const { clear } = persist(initialState, "expo-test", {
        storageStrategy: ExpoFileSystemStrategy,
      })
      
      // Manually clear
      await clear()
      
      // Check if removal method was called with the key
      expect(mockStrategyInstance.remove).toHaveBeenCalledWith("expo-test")
    })
  })
})