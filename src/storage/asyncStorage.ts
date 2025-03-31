import type { StorageStrategy } from "../types"

/**
 * AsyncStorage strategy for React Native
 * @requires @react-native-async-storage/async-storage
 */
export class AsyncStorageStrategy implements StorageStrategy {
  public isSync = false

  constructor() {
    // Dynamic import to avoid bundling issues in non-RN environments
    try {
      // This will be evaluated at runtime
      require('@react-native-async-storage/async-storage')
    } catch (e) {
      throw new Error(
        'Package @react-native-async-storage/async-storage not found. Please install it first.'
      )
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default
      const value = await AsyncStorage.getItem(key)
      return value !== null
    } catch (error) {
      console.error("AsyncStorage has error:", error)
      return false
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default
      return await AsyncStorage.getItem(key)
    } catch (error) {
      console.error("AsyncStorage get error:", error)
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default
      await AsyncStorage.setItem(key, value)
    } catch (error) {
      console.error("AsyncStorage set error:", error)
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default
      await AsyncStorage.removeItem(key)
    } catch (error) {
      console.error("AsyncStorage remove error:", error)
    }
  }
}