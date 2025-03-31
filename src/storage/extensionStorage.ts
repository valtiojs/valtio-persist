import type { StorageStrategy } from "../types"

// Add type definition for Chrome API
declare global {
	interface Chrome {
		storage: {
			sync: StorageArea
			local: StorageArea
		}
		runtime: {
			lastError?: Error
		}
	}

	interface StorageArea {
		get(
			keys: string | string[] | object | null,
			callback: (items: { [key: string]: unknown }) => void,
		): void
		set(items: object, callback?: () => void): void
		remove(keys: string | string[], callback?: () => void): void
	}

	var chrome: Chrome
}

/**
 * Browser Extension Storage strategy
 * Supports both chrome.storage.local and chrome.storage.sync
 */
export class ExtensionStorageStrategy implements StorageStrategy {
	public isSync = false
	private useSync: boolean

	constructor(useSync = false) {
		this.useSync = useSync

		// Check if we're in a browser extension environment
		if (
			typeof globalThis !== "undefined" &&
			(!("chrome" in globalThis) || !("storage" in globalThis.chrome))
		) {
			throw new Error(
				"Extension storage is only available in browser extensions with chrome.storage API",
			)
		}
	}

	async has(key: string): Promise<boolean> {
		try {
			const storage = this.useSync ? chrome.storage.sync : chrome.storage.local
			return new Promise<boolean>((resolve) => {
				storage.get([key], (result: Record<string, unknown>) => {
					resolve(key in result)
				})
			})
		} catch (error) {
			console.error("ExtensionStorage has error:", error)
			return false
		}
	}

	async get(key: string): Promise<string | null> {
		try {
			const storage = this.useSync ? chrome.storage.sync : chrome.storage.local
			return new Promise<string | null>((resolve) => {
				storage.get([key], (result: Record<string, unknown>) => {
					resolve(key in result ? String(result[key]) : null)
				})
			})
		} catch (error) {
			console.error("ExtensionStorage get error:", error)
			return null
		}
	}

	async set(key: string, value: string): Promise<void> {
		try {
			const storage = this.useSync ? chrome.storage.sync : chrome.storage.local
			return new Promise<void>((resolve) => {
				storage.set({ [key]: value }, () => {
					const error = chrome.runtime.lastError
					if (error) {
						console.error("ExtensionStorage set error:", error)
					}
					resolve()
				})
			})
		} catch (error) {
			console.error("ExtensionStorage set error:", error)
		}
	}

	async remove(key: string): Promise<void> {
		try {
			const storage = this.useSync ? chrome.storage.sync : chrome.storage.local
			return new Promise<void>((resolve) => {
				storage.remove(key, () => {
					const error = chrome.runtime.lastError
					if (error) {
						console.error("ExtensionStorage remove error:", error)
					}
					resolve()
				})
			})
		} catch (error) {
			console.error("ExtensionStorage remove error:", error)
		}
	}
}
