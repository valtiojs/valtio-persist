import type { StorageStrategy } from "../types"

/**
 * In-memory storage strategy (useful for testing)
 */
export class MemoryStorageStrategy implements StorageStrategy<false> {
	public isAsync = false as const
	private storage: Map<string, string> = new Map()

	has(key: string) {
		return this.storage.has(key)
	}

	get(key: string) {
		return this.storage.get(key) || null
	}

	set(key: string, value: string) {
		this.storage.set(key, value)
	}

	remove(key: string) {
		this.storage.delete(key)
	}
}
