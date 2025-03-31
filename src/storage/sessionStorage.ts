import type { StorageStrategy } from "../types"

/**
 * Session storage strategy implementation
 */
export class SessionStorageStrategy implements StorageStrategy {
	public isSync = true

	async has(key: string) {
		return sessionStorage.getItem(key) !== null
	}

	async get(key: string) {
		return sessionStorage.getItem(key)
	}

	async set(key: string, value: string) {
		sessionStorage.setItem(key, value)
	}

	async remove(key: string) {
		sessionStorage.removeItem(key)
	}

	syncHas(key: string) {
		return sessionStorage.getItem(key) !== null
	}

	syncGet(key: string) {
		return sessionStorage.getItem(key)
	}

	syncSet(key: string, value: string) {
		sessionStorage.setItem(key, value)
	}

	syncRemove(key: string) {
		sessionStorage.removeItem(key)
	}
}
