import { proxy, type Snapshot, snapshot, subscribe } from "valtio"
import type {
	PersistResult,
	StorageStrategy,
	SerializationStrategy,
	MergeStrategy,
} from "./types"
import { LocalStorageStrategy } from "./storage/localStorage"
import { DefaultMergeStrategy } from "./merge/default"
import { JSONSerializationStrategy } from "./serialization/json"
import { debounce, updateStore } from "./utils"
import type { HistoryOptions } from "./history"

export type * from "./types"

// Export all storage strategies
export * from "./storage"

// Define your options type (without the key)
interface PersistOptions<T extends object> {
	// How to store state - accepting a constructor
	storageStrategy?: {
		new (): StorageStrategy
	}
	// Controls how objects are serialized
	serializationStrategy?: {
		new (): SerializationStrategy<T>
	}
	// How to merge stored state with initial state
	mergeStrategy?: {
		new (): MergeStrategy<T>
	}
	// Should the state be persisted at a moment in time
	shouldPersist?: (prevState: Snapshot<T>, nextState: Snapshot<T>) => boolean
	// Time in milliseconds to debounce persistence operations
	debounceTime?: number
	// Automatically restore state when loaded
	restoreStateOnInit?: boolean
	// history enabled
	history?: HistoryOptions<T>
}

export function persist<T extends object>(
	initialState: T,
	key: string,
	options?: PersistOptions<T>,
): PersistResult<T> {
	const defaultOptions = {
		storageStrategy: LocalStorageStrategy,
		serializationStrategy: JSONSerializationStrategy,
		mergeStrategy: DefaultMergeStrategy,
		shouldPersist: () => true,
		debounceTime: 100,
		restoreStateOnInit: true,
	}

	const o = { ...defaultOptions, ...options }

	// Create instances from constructors
	const storageInstance = new o.storageStrategy()

	// Create storage proxy to support legacy API with deprecation warnings
	const storage = new Proxy(storageInstance, {
		get(target, prop, receiver) {
			// Map legacy methods to new methods with warnings
			if (prop === "getItem") {
				console.warn("Deprecated: use .get() instead of .getItem()")
				return target.get.bind(target)
			}
			if (prop === "setItem") {
				console.warn("Deprecated: use .set() instead of .setItem()")
				return target.set.bind(target)
			}
			if (prop === "removeItem") {
				console.warn("Deprecated: use .remove() instead of .removeItem()")
				return target.remove.bind(target)
			}
			return Reflect.get(target, prop, receiver)
		},
	})

	const { serialize, deserialize } = new o.serializationStrategy()
	const { merge } = new o.mergeStrategy()
	const { shouldPersist, debounceTime, restoreStateOnInit } = o

	// Create the store with initial state
	let storeState = initialState

	// Handle synchronous restoration if available and requested
	if (restoreStateOnInit && storage.syncGet) {
		const storedData = storage.syncGet(key)
		if (storedData) {
			const storedState = deserialize(storedData)
			storeState = merge(initialState, storedState)
		}
	}

	// Create the proxy with our potentially restored state
	const store = proxy(storeState)

	// Handle asynchronous restoration if needed
	if (restoreStateOnInit && !storage.syncGet) {
		// Start async restoration
		storage
			.get(key)
			.then((storedData: string | null) => {
				if (storedData) {
					const storedState = deserialize(storedData)
					const mergedState = merge(initialState, storedState)
					// Update the already created store with the merged state
					updateStore(store, mergedState)
				}
			})
			.catch((err: Error) => {
				console.error("Failed to restore state:", err)
			})
	}

	let previousState = snapshot(store)

	// Create the persist function - modified to respect shouldPersist even for manual calls
	const persistData = () => {
		const currentState = snapshot(store)

		// Add this check to respect shouldPersist for manual calls
		if (!shouldPersist(previousState, currentState)) {
			return Promise.resolve() // Don't persist if shouldPersist returns false
		}

		const serialized = serialize(currentState)

		// Use sync or async depending on what's available
		if (storage.syncSet) {
			storage.syncSet(key, serialized)
			return Promise.resolve()
		}

		return storage.set(key, serialized)
	}

	// Set up persistence
	const debouncedPersist = debounce(persistData, debounceTime)

	// Subscribe to changes
	subscribe(store, () => {
		const currentState = snapshot(store)

		if (shouldPersist(previousState, currentState)) {
			debouncedPersist()
		}

		// Update previous state for next comparison
		previousState = currentState
	})

	// Return the result
	return {
		store,
		persist: persistData,
		clear: () => storage.remove(key),
		restore: async () => {
			const storedData = await storage.get(key)
			if (storedData) {
				const storedState = deserialize(storedData)
				const mergedState = merge(initialState, storedState)
				Object.assign(store, mergedState)
				return true
			}
			return false
		},
	}
}
