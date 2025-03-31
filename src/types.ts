import type { Snapshot } from "valtio";

export interface PersistResult<T extends object> {
	/**
	 * The persisted store proxy
	 */
	store: T;

	/**
	 * Function to manually trigger persistence
	 */
	persist: () => Promise<void>;

	/**
	 * Function to rehydrate the store from storage
	 */
	restore: () => Promise<boolean>;

	/**
	 * Function to clear the persisted state
	 */
	clear: () => Promise<void>;
}

/**
 * Optional merge strategy to control how rehydrated state is merged with initial state
 */
export interface MergeStrategy<T> {
	/**
	 * Merge rehydrated state with initial state
	 * @param initialState The initial state
	 * @param rehydratedState The rehydrated state from storage
	 * @returns The merged state
	 */
	merge: (initialState: T, rehydratedState: T) => T;
}

/**
 * Serialization strategy interface for converting between store state and string
 */
export interface SerializationStrategy<T> {
	/**
	 * Serialize state to string
	 */
	serialize: (state: Snapshot<T>) => string;

	/**
	 * Deserialize string to state
	 */
	deserialize: (data: string) => T;
}

/**
 * Generic storage strategy interface that all storage implementations must follow
 */
export interface StorageStrategy {
	isSync: boolean;
	/**
	 * Check if the key exists in storage
	 * @param key
	 * @returns Promise<boolean>
	 */
	has?: (key: string) => Promise<boolean>;
	/**
	 * Get value from storage - async
	 * @param key The key to retrieve
	 * @returns The stored value or null if not found
	 */
	get: (key: string) => Promise<string | null>;

	/**
	 * Set value in storage - async
	 * @param key The key to set
	 * @param value The value to store
	 */
	set: (key: string, value: string) => Promise<void>;

	/**
	 * Remove value from storage - async
	 * @param key The key to remove
	 */
	remove: (key: string) => Promise<void>;

	/**
	 * Check if the key exists (sync)
	 * @param key
	 * @returns boolean
	 */
	syncHas?: (key: string) => boolean;

	/**
	 * Get value from storage synchronously (optional)
	 * @param key The key to retrieve
	 * @returns The stored value or null if not found
	 */
	syncGet?: (key: string) => string | null;

	/**
	 * Set value in storage synchronously (optional)
	 * @param key The key to set
	 * @param value The value to store
	 */
	syncSet?: (key: string, value: string) => void;

	/**
	 * Remove value from storage synchronously (optional)
	 * @param key The key to remove
	 */
	syncRemove?: (key: string) => void;
}
