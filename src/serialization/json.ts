import type { Snapshot } from "valtio";
import type { SerializationStrategy } from "../types";

/**
 * Default JSON serialization strategy
 */
export class JSONSerializationStrategy<T> implements SerializationStrategy<T> {
	serialize(state: Snapshot<T>): string {
		return JSON.stringify(state);
	}

	deserialize(data: string): T {
		return JSON.parse(data);
	}
}
