import { attempt } from "./utils"

type PersistOperation = () => Promise<void>

export class PersistQueue {
	private queue: PersistOperation[] = []
	private inProgress = false
	private latestSnapshot: unknown = null
	private debounceTimer: ReturnType<typeof setTimeout> | null = null
	private debounceTime: number

	constructor(debounceTime = 50) {
		this.debounceTime = debounceTime
	}

	add(
		getSnapshot: () => unknown,
		persistFunction: (data: unknown) => Promise<void>,
	) {
		// Clear any pending debounce timer
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer)
		}

		// Debounce adding to the queue
		this.debounceTimer = setTimeout(() => {
			// Only grab the snapshot when we're actually going to queue it
			this.latestSnapshot = getSnapshot()

			// Replace any existing queue with just the latest state
			this.queue = [() => persistFunction(this.latestSnapshot)]
			this.processQueue()
		}, this.debounceTime)
	}

	private async processQueue() {
		if (this.inProgress || this.queue.length === 0) return

		this.inProgress = true
		const operation = this.queue.shift()
		if (operation) {
			const { error } = await attempt(operation())
			if (error) {
				console.error("Peristence operation failed: ", error)
			}
		}
		this.inProgress = false
		this.processQueue()
	}
}

export const defaultQueue = new PersistQueue()
