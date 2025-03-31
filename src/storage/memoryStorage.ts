import type { StorageStrategy } from "../types"

/**
 * In-memory storage strategy (useful for testing)
 */
export class MemoryStorageStrategy implements StorageStrategy {
	public isSync = true
	private storage: Map<string, string> = new Map()

	async has(key: string): Promise<boolean> {
		return this.storage.has(key)
	}

	async get(key: string): Promise<string | null> {
		return this.storage.get(key) || null
	}

	async set(key: string, value: string): Promise<void> {
		this.storage.set(key, value)
	}

	async remove(key: string): Promise<void> {
		this.storage.delete(key)
	}

	syncHas(key: string): boolean {
		return this.storage.has(key)
	}

	syncGet(key: string): string | null {
		return this.storage.get(key) || null
	}

	syncSet(key: string, value: string): void {
		this.storage.set(key, value)
	}

	syncRemove(key: string): void {
		this.storage.delete(key)
	}
}
