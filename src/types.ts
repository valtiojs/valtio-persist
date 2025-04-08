import type { Snapshot } from "valtio"

export interface PersistResult<T extends object> {
	// The persisted store proxy
	store: T

	// Function to manually trigger persistence
	persist: () => Promise<void>

	// Function to rehydrate the store from storage
	restore: () => Promise<boolean>

	// Function to clear the persisted state
	clear: () => Promise<void>
}

/************************
 *  STORAGE STRATEGIES  *
 ************************/
type StorageResult<T, Async extends boolean> = Async extends true
	? Promise<T>
	: T

export interface StorageStrategy<Async extends boolean = boolean> {
	readonly isAsync: Async
	has?(key: string): StorageResult<boolean, Async>
	get(key: string): StorageResult<string | null, Async>
	set(key: string, value: string): StorageResult<void, Async>
	remove(key: string): StorageResult<void, Async>
}

/*******************************
 *  SERIALIAZATION STRATEGIES  *
 *******************************/
type SerializationResult<Async extends boolean> = Async extends true
	? Promise<string>
	: string

type DeserializationResult<T, Async extends boolean> = Async extends true
	? Promise<T>
	: T

export interface SerializationStrategy<T, Async extends boolean = boolean> {
	readonly isAsync: Async
	serialize(state: Snapshot<T>): SerializationResult<Async>
	deserialize(data: string): DeserializationResult<T, Async>
}

/**********************
 *  MERGE STRATEGIES  *
 **********************/
type MergeResult<T, Async extends boolean> = Async extends true ? Promise<T> : T

export interface MergeStrategy<T, Async extends boolean = boolean> {
	readonly isAsync: Async
	merge(initialState: T, restoredState: T): MergeResult<T, Async>
}

/************************************************
 *  TYPE MARKERS FOR SERIALIZATION AND MERGING  *
 ************************************************/
export const TYPE_MARKER = {
	Date: "__DATE__",
	Map: "__MAP__",
	Set: "__SET__",
	Symbol: "__SYMBOL__",
	Function: "__FUNCTION__",
	Class: "__CLASS__",
	Error: "__ERROR__",
	DOMElement: "__DOM_ELEMENT__",
} as const

export type TypeMarker = (typeof TYPE_MARKER)[keyof typeof TYPE_MARKER]

// Type definitions for serialized special types
export interface SerializedSpecialType {
	__type: TypeMarker
	value: unknown
	[key: string]: unknown // For additional metadata
}
