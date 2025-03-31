import type { StorageStrategy } from "../types"

/**
 * Local storage strategy implementation
 */
export class LocalStorageStrategy implements StorageStrategy {
	public isSync = true

	async has(key: string): Promise<boolean> {
		return localStorage.getItem(key) !== null
	}

	async get(key: string): Promise<string | null> {
		return localStorage.getItem(key)
	}

	async set(key: string, value: string): Promise<void> {
		localStorage.setItem(key, value)
	}

	async remove(key: string): Promise<void> {
		localStorage.removeItem(key)
	}

	syncGet(key: string) {
		return localStorage.getItem(key)
	}

	syncSet(key: string, value: string) {
		localStorage.setItem(key, value)
	}

	syncRemove(key: string) {
		localStorage.removeItem(key)
	}

	syncHas(key: string) {
		return localStorage.getItem(key) !== null
	}
}
