import type { Snapshot } from "valtio"
import { proxyMap, proxySet } from "valtio/utils"
import {
	type SerializationStrategy,
	type SerializedSpecialType,
	type TypeMarker,
	TYPE_MARKER,
} from "../../types"

/**
 * Default JSON serialization strategy (synchronous)
 */
export class JSONSerializationStrategy<T>
	implements SerializationStrategy<T, false>
{
	readonly isAsync = false as const

	serialize(state: Snapshot<T>): string {
		const processed = this.processForSerialization(state)
		return JSON.stringify(processed)
	}

	deserialize(data: string): T {
		const parsed = JSON.parse(data)
		return this.processForDeserialization(parsed) as T
	}

	private processForSerialization(obj: unknown): unknown {
		// Handle null or undefined
		if (obj === null || obj === undefined) {
			return obj
		}

		// Handle primitive types
		if (
			typeof obj !== "object" &&
			typeof obj !== "function" &&
			typeof obj !== "symbol"
		) {
			return obj
		}

		// Handle Symbol
		if (typeof obj === "symbol") {
			return {
				__type: TYPE_MARKER.Symbol,
				value: obj.description,
			} as SerializedSpecialType
		}

		// Handle Function
		if (typeof obj === "function") {
			return {
				__type: TYPE_MARKER.Function,
				value: obj.name || "anonymous",
				// Optionally add function.toString() if you want to try reconstructing it
			} as SerializedSpecialType
		}

		// Handle Date
		if (obj instanceof Date) {
			return {
				__type: TYPE_MARKER.Date,
				value: obj.toISOString(),
			} as SerializedSpecialType
		}

		// Handle Map
		if (obj instanceof Map) {
			return {
				__type: TYPE_MARKER.Map,
				value: Array.from(obj.entries()),
			} as SerializedSpecialType
		}

		// Handle Set
		if (obj instanceof Set) {
			return {
				__type: TYPE_MARKER.Set,
				value: Array.from(obj),
			} as SerializedSpecialType
		}

		// Handle WeakMap and WeakSet - since they can't be enumerated,
		// we return an empty structure of the same type
		if (obj instanceof WeakMap || obj instanceof WeakSet) {
			return null // or return a placeholder if needed
		}

		// Handle Error
		if (obj instanceof Error) {
			return {
				__type: TYPE_MARKER.Error,
				value: {
					message: obj.message,
					name: obj.name,
					stack: obj.stack,
				},
			} as SerializedSpecialType
		}

		// Handle DOM Element
		if (typeof window !== "undefined" && obj instanceof Element) {
			// Create a CSS selector for the element (basic implementation)
			let selector = obj.tagName.toLowerCase()
			if (obj.id) selector += `#${obj.id}`
			else if (obj.className)
				selector += `.${obj.className.replace(/\s+/g, ".")}`

			return {
				__type: TYPE_MARKER.DOMElement,
				value: selector,
			} as SerializedSpecialType
		}

		// Handle Class Instances - more complex case
		if (
			obj.constructor &&
			obj.constructor !== Object &&
			obj.constructor !== Array
		) {
			// This is a simplified approach; for complex classes you might need more info
			return {
				__type: TYPE_MARKER.Class,
				className: obj.constructor.name,
				value: { ...obj }, // Convert to plain object
			} as SerializedSpecialType
		}

		// Handle Arrays
		if (Array.isArray(obj)) {
			return obj.map((item) => this.processForSerialization(item))
		}

		// Handle Plain Objects
		const result: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
			result[key] = this.processForSerialization(value)
		}
		return result
	}

	private processForDeserialization(obj: unknown): unknown {
		// Handle null or undefined
		if (obj === null || obj === undefined) {
			return obj
		}

		// Handle primitive types
		if (typeof obj !== "object") {
			return obj
		}

		// Since we've checked that obj is an object and not null, we can safely cast
		const objRecord = obj as Record<string, unknown>

		// Handle special type markers
		if ("__type" in objRecord && typeof objRecord.__type === "string") {
			const typeMarker = objRecord.__type as TypeMarker

			switch (typeMarker) {
				case TYPE_MARKER.Date:
					if (typeof objRecord.value === "string") {
						return new Date(objRecord.value)
					}
					break

				case TYPE_MARKER.Map:
					if (Array.isArray(objRecord.value)) {
						return proxyMap(new Map(objRecord.value as [unknown, unknown][]))
					}
					break

				case TYPE_MARKER.Set:
					if (Array.isArray(objRecord.value)) {
						return proxySet(new Set(objRecord.value))
					}
					break

				case TYPE_MARKER.Symbol:
					if (
						typeof objRecord.value === "string" ||
						objRecord.value === undefined
					) {
						return Symbol(objRecord.value as string | undefined)
					}
					break

				case TYPE_MARKER.Function:
					// Functions can't be fully reconstructed from serialization
					return () => {
						return undefined
					}

				case TYPE_MARKER.Error:
					if (typeof objRecord.value === "object" && objRecord.value !== null) {
						const errorValue = objRecord.value as Record<string, unknown>
						const error = new Error(
							typeof errorValue.message === "string"
								? errorValue.message
								: "Unknown error",
						)
						if (typeof errorValue.name === "string") {
							error.name = errorValue.name
						}
						if (typeof errorValue.stack === "string") {
							error.stack = errorValue.stack
						}
						return error
					}
					break

				case TYPE_MARKER.DOMElement:
					if (
						typeof objRecord.value === "string" &&
						typeof document !== "undefined"
					) {
						return document.querySelector(objRecord.value)
					}
					return null

				case TYPE_MARKER.Class:
					// For class instances, return the value object
					if (typeof objRecord.value === "object" && objRecord.value !== null) {
						return objRecord.value
					}
					break

				default:
					return objRecord.value
			}

			// If we get here, something went wrong in type handling
			return null
		}

		// Handle Arrays
		if (Array.isArray(obj)) {
			return obj.map((item) => this.processForDeserialization(item))
		}

		// Handle Plain Objects
		const result: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(objRecord)) {
			result[key] = this.processForDeserialization(value)
		}
		return result
	}
}
