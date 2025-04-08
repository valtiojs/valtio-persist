import type { StorageStrategy } from "../types"

/**
 * Session storage strategy implementation
 */
export class SessionStorageStrategy implements StorageStrategy<false> {
	public isAsync = false as const

	has(key: string) {
		return sessionStorage.getItem(key) !== null
	}

	get(key: string) {
		return sessionStorage.getItem(key)
	}

	set(key: string, value: string) {
		sessionStorage.setItem(key, value)
	}

	remove(key: string) {
		sessionStorage.removeItem(key)
	}
}
