import type { Snapshot } from "valtio"
import type { SerializationStrategy } from "../../types"
import { JSONSerializationStrategy } from "./json"

// Processor function types
export type SerializeProcessor<T> = (
	serializedData: string,
	originalState: Snapshot<T>,
) => Promise<string> | string

export type DeserializeProcessor = (
	serializedData: string,
) => Promise<string> | string

// Options for the AsyncJSONSerializationStrategy
export interface AsyncJSONSerializationOptions<T> {
	// Optional processor to run after serialization
	serializeProcessor?: SerializeProcessor<T>

	// Optional processor to run before deserialization
	deserializeProcessor?: DeserializeProcessor
}

// Async JSON serialization strategy
export class AsyncJSONSerializationStrategy<T>
	implements SerializationStrategy<T, true>
{
	readonly isAsync = true as const
	private options: AsyncJSONSerializationOptions<T>

	constructor(options: AsyncJSONSerializationOptions<T> = {}) {
		this.options = options
	}

	// Create an instance of the sync JSONSerializationStrategy to reuse its methods
	private syncStrategy = new JSONSerializationStrategy<T>()

	async serialize(state: Snapshot<T>): Promise<string> {
		// Use the synchronous method for base serialization
		let serialized = this.syncStrategy.serialize(state)

		// Apply the custom processor if provided
		if (this.options.serializeProcessor) {
			const processed = this.options.serializeProcessor(serialized, state)
			// Handle both synchronous and asynchronous processors
			serialized = processed instanceof Promise ? await processed : processed
		}

		return serialized
	}

	async deserialize(data: string): Promise<T> {
		let processedData = data

		// Apply the custom processor if provided
		if (this.options.deserializeProcessor) {
			const processed = this.options.deserializeProcessor(data)
			// Handle both synchronous and asynchronous processors
			processedData = processed instanceof Promise ? await processed : processed
		}

		// Use the synchronous method for base deserialization
		return this.syncStrategy.deserialize(processedData)
	}
}
