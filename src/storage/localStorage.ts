import type { StorageStrategy } from "../types"

/**
 * Local storage strategy implementation
 */
export class LocalStorageStrategy implements StorageStrategy<false> {
	readonly isAsync = false as const

	has(key: string) {
		return localStorage.getItem(key) !== null
	}

	get(key: string) {
		return localStorage.getItem(key)
	}

	set(key: string, value: string) {
		localStorage.setItem(key, value)
	}

	remove(key: string) {
		localStorage.removeItem(key)
	}
}
