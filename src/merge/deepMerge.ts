import type { MergeStrategy } from "../types"
import { deepClone } from "valtio/utils"
import { proxyMap, proxySet } from "valtio/utils"
import {
	TYPE_MARKER,
	type TypeMarker,
	type SerializedSpecialType,
} from "../types"

/**
 * Deep merge strategy that recursively merges objects while handling special types
 */
export class DeepMergeStrategy<T> implements MergeStrategy<T, false> {
	readonly isAsync = false as const

	merge = (initialState: T, restoredState: T): T => {
		return this.deepMerge(initialState, restoredState) as T
	}

	// Detect if an object is a special serialized type
	private isSpecialType = (obj: unknown): obj is SerializedSpecialType => {
		return (
			typeof obj === "object" &&
			obj !== null &&
			"__type" in obj &&
			typeof (obj as Record<string, unknown>).__type === "string" &&
			Object.values(TYPE_MARKER).includes(
				(obj as Record<string, unknown>).__type as TypeMarker,
			)
		)
	}

	// Get the type marker from a special type
	private getTypeMarker = (obj: SerializedSpecialType): TypeMarker => {
		return obj.__type
	}

	private deepMerge = (target: unknown, source: unknown): unknown => {
		// If source is null or not an object, return it directly
		if (typeof source !== "object" || source === null) {
			return source
		}

		// If target is null or not an object, clone the source
		if (typeof target !== "object" || target === null) {
			return deepClone(source)
		}

		// Handle arrays
		if (Array.isArray(source)) {
			if (!Array.isArray(target)) {
				return deepClone(source)
			}
			return [...source]
		}

		// Special handling for serialized special types
		if (this.isSpecialType(source)) {
			const sourceType = this.getTypeMarker(source)

			// If target is also a special type of the same kind, try to merge them
			if (
				this.isSpecialType(target) &&
				this.getTypeMarker(target) === sourceType
			) {
				const sourceRecord = source as Record<string, unknown>
				const targetRecord = target as Record<string, unknown>

				switch (sourceType) {
					case TYPE_MARKER.Map:
						// For maps, create a new map with entries from both
						if (
							Array.isArray(sourceRecord.value) &&
							Array.isArray(targetRecord.value)
						) {
							const targetEntries = proxyMap(
								targetRecord.value as [unknown, unknown][],
							)
							const sourceEntries = proxyMap(
								sourceRecord.value as [unknown, unknown][],
							)

							// Merge the maps, with source entries taking precedence
							const mergedEntries = proxyMap([
								...targetEntries,
								...sourceEntries,
							])
							return {
								__type: TYPE_MARKER.Map,
								value: Array.from(mergedEntries.entries()),
							} as SerializedSpecialType
						}
						break

					case TYPE_MARKER.Set:
						// For sets, create a union of both sets
						if (
							Array.isArray(sourceRecord.value) &&
							Array.isArray(targetRecord.value)
						) {
							const mergedSet = proxySet([
								...(targetRecord.value as unknown[]),
								...(sourceRecord.value as unknown[]),
							])
							return {
								__type: TYPE_MARKER.Set,
								value: Array.from(mergedSet),
							} as SerializedSpecialType
						}
						break

					case TYPE_MARKER.Date:
					case TYPE_MARKER.Symbol:
					case TYPE_MARKER.Function:
					case TYPE_MARKER.DOMElement:
						// For these types, prefer the source value
						return deepClone(source)

					case TYPE_MARKER.Error:
						// Merge error properties
						if (
							typeof sourceRecord.value === "object" &&
							sourceRecord.value !== null &&
							typeof targetRecord.value === "object" &&
							targetRecord.value !== null
						) {
							return {
								__type: TYPE_MARKER.Error,
								value: {
									...(targetRecord.value as Record<string, unknown>),
									...(sourceRecord.value as Record<string, unknown>),
								},
							} as SerializedSpecialType
						}
						return deepClone(source)

					case TYPE_MARKER.Class:
						// Merge the class instance properties
						if (
							typeof sourceRecord.value === "object" &&
							sourceRecord.value !== null &&
							typeof targetRecord.value === "object" &&
							targetRecord.value !== null
						) {
							return {
								__type: TYPE_MARKER.Class,
								className: (sourceRecord.className ||
									targetRecord.className) as string,
								value: this.deepMerge(targetRecord.value, sourceRecord.value),
							} as SerializedSpecialType
						}
						break

					default:
						// For any other special type, prefer the source
						return deepClone(source)
				}
			}

			// If target is not the same special type, prefer the source
			return deepClone(source)
		}

		// If we get here, we're dealing with plain objects
		const result: Record<string, unknown> = {
			...(target as Record<string, unknown>),
		}

		for (const key in source) {
			if (Object.prototype.hasOwnProperty.call(source, key)) {
				const sourceValue = (source as Record<string, unknown>)[key]
				const targetValue = (target as Record<string, unknown>)[key]

				result[key] = this.deepMerge(targetValue, sourceValue)
			}
		}

		return result
	}
}
