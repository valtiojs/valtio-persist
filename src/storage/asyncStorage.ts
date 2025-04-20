import type { StorageStrategy } from "../types"

/**
 * Type for AsyncStorage module
 */
interface AsyncStorageModule {
	getItem(key: string): Promise<string | null>
	setItem(key: string, value: string): Promise<void>
	removeItem(key: string): Promise<void>
}

/**
 * AsyncStorage strategy for React Native
 * @requires @react-native-async-storage/async-storage
 */
export class AsyncStorageStrategy implements StorageStrategy {
	public isAsync = true

	// Cache the module import promise
	private asyncStoragePromise: Promise<AsyncStorageModule> | null = null

	private getAsyncStorage(): Promise<AsyncStorageModule> {
		if (!this.asyncStoragePromise) {
			this.asyncStoragePromise = import(
				"@react-native-async-storage/async-storage"
			)
				.then((module) => module.default as AsyncStorageModule)
				.catch((_e) => {
					throw new Error(
						"Package @react-native-async-storage/async-storage not found. Please install it first.",
					)
				})
		}
		return this.asyncStoragePromise
	}

	async has(key: string): Promise<boolean> {
		try {
			const AsyncStorage = await this.getAsyncStorage()
			const value = await AsyncStorage.getItem(key)
			return value !== null
		} catch (error) {
			console.error("AsyncStorage has error:", error)
			return false
		}
	}

	async get(key: string): Promise<string | null> {
		try {
			const AsyncStorage = await this.getAsyncStorage()
			return await AsyncStorage.getItem(key)
		} catch (error) {
			console.error("AsyncStorage get error:", error)
			return null
		}
	}

	async set(key: string, value: string): Promise<void> {
		try {
			const AsyncStorage = await this.getAsyncStorage()
			await AsyncStorage.setItem(key, value)
		} catch (error) {
			console.error("AsyncStorage set error:", error)
		}
	}

	async remove(key: string): Promise<void> {
		try {
			const AsyncStorage = await this.getAsyncStorage()
			await AsyncStorage.removeItem(key)
		} catch (error) {
			console.error("AsyncStorage remove error:", error)
		}
	}
}
