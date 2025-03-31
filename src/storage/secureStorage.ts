import type { StorageStrategy } from "../types"

/**
 * Secure Storage strategy for React Native
 * Supports both expo-secure-store and react-native-keychain
 * @requires expo-secure-store or react-native-keychain depending on useExpo parameter
 */
export class SecureStorageStrategy implements StorageStrategy {
	public isSync = false
	private useExpo: boolean

	constructor(useExpo = true) {
		this.useExpo = useExpo

		try {
			// Check if the appropriate package is available
			if (this.useExpo) {
				require("expo-secure-store")
			} else {
				require("react-native-keychain")
			}
		} catch (e) {
			throw new Error(
				this.useExpo
					? "Package expo-secure-store not found. Please install it first."
					: "Package react-native-keychain not found. Please install it first.",
			)
		}
	}

	async has(key: string): Promise<boolean> {
		try {
			// Different implementations have different APIs
			if (this.useExpo) {
				// expo-secure-store
				const SecureStore = require("expo-secure-store")
				const result = await SecureStore.getItemAsync(key)
				return result !== null
			}
			// react-native-keychain
			const Keychain = require("react-native-keychain")
			const result = await Keychain.getGenericPassword({ service: key })
			return !!result
		} catch (error) {
			console.error("SecureStorage has error:", error)
			return false
		}
	}

	async get(key: string): Promise<string | null> {
		try {
			if (this.useExpo) {
				// expo-secure-store
				const SecureStore = require("expo-secure-store")
				return await SecureStore.getItemAsync(key)
			}
			// react-native-keychain
			const Keychain = require("react-native-keychain")
			const result = await Keychain.getGenericPassword({ service: key })
			return result ? result.password : null
		} catch (error) {
			console.error("SecureStorage get error:", error)
			return null
		}
	}

	async set(key: string, value: string): Promise<void> {
		try {
			if (this.useExpo) {
				// expo-secure-store has a size limit of 2KB
				if (value.length > 2000) {
					console.warn(
						`Value for key ${key} exceeds 2KB limit for expo-secure-store`,
					)
				}

				// expo-secure-store
				const SecureStore = require("expo-secure-store")
				await SecureStore.setItemAsync(key, value)
			} else {
				// react-native-keychain
				const Keychain = require("react-native-keychain")
				await Keychain.setGenericPassword(key, value, { service: key })
			}
		} catch (error) {
			console.error("SecureStorage set error:", error)
		}
	}

	async remove(key: string): Promise<void> {
		try {
			if (this.useExpo) {
				// expo-secure-store
				const SecureStore = require("expo-secure-store")
				await SecureStore.deleteItemAsync(key)
			} else {
				// react-native-keychain
				const Keychain = require("react-native-keychain")
				await Keychain.resetGenericPassword({ service: key })
			}
		} catch (error) {
			console.error("SecureStorage remove error:", error)
		}
	}
}
