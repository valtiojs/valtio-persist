import type { StorageStrategy } from "../types"

/**
 * Interface for SQLite Database results
 */
export interface SQLiteResultSet {
	rows: {
		length: number
		item(index: number): Record<string, unknown>
	}
}

/**
 * Interface for SQLite Database
 */
export interface SQLiteDatabase {
	executeSql(query: string, params?: unknown[]): Promise<SQLiteResultSet[]>
}

/**
 * SQLite storage strategy
 * @requires SQLite database instance
 */
export class SQLiteStrategy implements StorageStrategy {
	public isSync = false
	private db: SQLiteDatabase
	private tableName: string

	constructor(db: SQLiteDatabase, tableName = "valtio_persist") {
		if (!db) {
			throw new Error("SQLite database instance is required")
		}
		this.db = db
		this.tableName = tableName
	}

	private async ensureTableExists(): Promise<void> {
		if (!this.db) {
			throw new Error("SQLite database not initialized")
		}

		try {
			// Create the table if it doesn't exist
			await this.db.executeSql(
				`CREATE TABLE IF NOT EXISTS ${this.tableName} (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )`,
			)
		} catch (error) {
			console.error("Error ensuring table exists:", error)
			throw error
		}
	}

	async has(key: string): Promise<boolean> {
		if (!this.db) {
			throw new Error("SQLite database not initialized")
		}

		try {
			await this.ensureTableExists()

			try {
				const result = await this.db.executeSql(
					`SELECT COUNT(*) as count FROM ${this.tableName} WHERE key = ?`,
					[key],
				)

				// Extract count from result set - structure depends on the SQLite implementation
				const count = result?.[0]?.rows?.item?.(0)?.count || 0
				return Number(count) > 0
			} catch (error) {
				console.error("Error checking key existence:", error)
				return false
			}
		} catch (error) {
			console.error("SQLite has error:", error)
			return false
		}
	}

	async get(key: string): Promise<string | null> {
		if (!this.db) {
			throw new Error("SQLite database not initialized")
		}

		try {
			await this.ensureTableExists()

			try {
				const result = await this.db.executeSql(
					`SELECT value FROM ${this.tableName} WHERE key = ?`,
					[key],
				)

				// Check if we have a result - structure depends on the SQLite implementation
				if (result?.[0]?.rows?.length > 0) {
					return `${result[0].rows.item(0).value}`
				}

				return null
			} catch (error) {
				console.error("Error getting value:", error)
				return null
			}
		} catch (error) {
			console.error("SQLite get error:", error)
			return null
		}
	}

	async set(key: string, value: string): Promise<void> {
		if (!this.db) {
			throw new Error("SQLite database not initialized")
		}

		try {
			await this.ensureTableExists()

			// Use INSERT OR REPLACE to handle both new and existing keys
			await this.db.executeSql(
				`INSERT OR REPLACE INTO ${this.tableName} (key, value) VALUES (?, ?)`,
				[key, value],
			)
		} catch (error) {
			console.error("SQLite set error:", error)
		}
	}

	async remove(key: string): Promise<void> {
		if (!this.db) {
			throw new Error("SQLite database not initialized")
		}

		try {
			await this.ensureTableExists()

			await this.db.executeSql(`DELETE FROM ${this.tableName} WHERE key = ?`, [
				key,
			])
		} catch (error) {
			console.error("SQLite remove error:", error)
		}
	}
}
