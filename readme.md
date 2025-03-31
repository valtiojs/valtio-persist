# valtio-persist

A persistence layer for [valtio](https://github.com/pmndrs/valtio) that allows you to save and restore state to various storage backends.

## Features

- 🔄 Persist and restore valtio state automatically
- 🧩 Pluggable storage backends (localStorage, sessionStorage, IndexedDB, memory)
- 🔀 Customizable merge strategies (default shallow merge, deep merge)
- 🔒 Extensible serialization (JSON by default, add encryption, compression)
- ⏱️ Configurable debounce for performance optimization
- 🚫 Conditional persistence with `shouldPersist` option
- 🚀 TypeScript support with full type safety

## Installation

```bash
npm install valtio-persist
# or
yarn add valtio-persist
# or
pnpm add valtio-persist
```

## Basic Usage

```typescript
import { persist } from 'valtio-persist'

// Define your state
interface State {
  count: number
  text: string
  user?: {
    name: string
    loggedIn: boolean
  }
}

// Create a persisted store
const { store } = persist<State>(
  // Initial state
  { 
    count: 0, 
    text: 'Hello' 
  },
  // Storage key
  'my-app-state'
)

// Use the store like a regular valtio store
store.count++
store.text = 'Updated'
store.user = { name: 'John', loggedIn: true }

// The changes will be automatically persisted to localStorage
```

## Advanced Usage

### Storage Strategies

```typescript
import { persist, LocalStorageStrategy } from 'valtio-persist'

// Use localStorage (default)
const { store: localStore } = persist(
  { count: 0 },
  'local-store',
  { storageStrategy: LocalStorageStrategy }
)
```

LocalStorageStrategy is the default and is provided within the main `valtio-persist` bundle along with `SessionStorageStrategy` and `MemoryStoragStrategey` (useful for testing), but there are many others provided that are not included in the main `valtio-persist` bundle. To use them, you need to import them separately.

```typescript
import { persist } from 'valtio-persist'
import { AsyncStorageStrategy } from 'valtio-persist/async-storage'

const { store } = persist(
  { count: 0 },
  'my-async-store',
  { storageStrategy: AsyncStorageStrategy }
)
```


Here are the different ones included and their paths:
<table>
  <thead>
    <tr><th>Exported Name</th><th>Import syntax</th></tr>
  </thead>
  <tbody>
    <tr><td>local-storage</td><td><pre><code class="language-typescript">import { LocalStorageStrategy } from 'valtio-persist'</code></pre></td></tr>
    <tr><td>session-storage</td><td><pre><code class="language-typescript">import { SessionStorageStrategy } from 'valtio-persist'</code></pre></td></tr>
    <tr><td>memory-storage</td><td><pre><code class="language-typescript">import { MemoryStorageStrategy } from 'valtio-persist'</code></pre></td></tr>
    <tr><td colspan='2'><i>The items below are not included in the `valtio-persist` bundle</i></td></tr>
    <tr><td>async-storage</td><td><pre><code class="language-typescript">import { AsyncStorageStrategy } from 'valtio-persist/async-storage'</code></pre></td></tr>
    <tr><td>expo-file-system</td><td><pre><code class="language-typescript">import { ExpoFileSystemStrategy } from 'valtio-persist/expo-file-system'</code></pre></td></tr>
    <tr><td>extension-storage</td><td><pre><code class="language-typescript">import { ExtensionStorageStrategy } from 'valtio-persist/extension-storage'</code></pre></td></tr>
    <tr><td>file-system-api</td><td><pre><code class="language-typescript">import { FileSystemApiStrategy } from 'valtio-persist/file-system-api'</code></pre></td></tr>
    <tr><td>indexed-db</td><td><pre><code class="language-typescript">import { IndexedDBStrategy } from 'valtio-persist/indexed-db'</code></pre></td></tr>
    <tr><td>single-file</td><td><pre><code class="language-typescript">import { SingleFileStrategy } from 'valtio-persist/single-file'</code></pre></td></tr>
    <tr><td>multi-file</td><td><pre><code class="language-typescript">import { MultiFileStrategy } from 'valtio-persist/multi-file'</code></pre></td></tr>
    <tr><td>secure-storage</td><td><pre><code class="language-typescript">import { SecureStorageStrategy } from 'valtio-persist/secure-storage'</code></pre></td></tr>
    <tr><td>sqllite</td><td><pre><code class="language-typescript">import { SQLiteStrategy } from 'valtio-persist/sqllite'</code></pre></td></tr>
  </tbody>
</table>


### Merge Strategies

```typescript
import { persist } from 'valtio-persist'
import { DefaultMergeStrategy, DeepMergeStrategy } from 'valtio-persist'

// Use default (shallow) merge strategy
const { store: defaultStore } = persist(
  { count: 0, nested: { value: 'default' } },
  'default-merge',
  { mergeStrategy: DefaultMergeStrategy }
)

// Use deep merge strategy for nested objects
const { store: deepStore } = persist(
  { count: 0, nested: { value: 'default', other: true } },
  'deep-merge',
  { mergeStrategy: DeepMergeStrategy }
)
```

### Custom Serialization

```typescript
import { persist } from 'valtio-persist'
import type { SerializationStrategy } from 'valtio-persist'
import type { Snapshot } from 'valtio'

// Create a custom serialization strategy
class CompressedJSONStrategy implements SerializationStrategy<any> {
  serialize(state: Snapshot<any>): string {
    // Add compression, encryption, etc.
    return btoa(JSON.stringify(state))
  }

  deserialize(data: string): any {
    return JSON.parse(atob(data))
  }
}

const { store } = persist(
  { secret: 'sensitive data' },
  'encrypted-store',
  { serializationStrategy: CompressedJSONStrategy }
)
```

### Conditional Persistence

```typescript
import { persist } from 'valtio-persist'

// Only persist when specific conditions are met
const { store } = persist(
  { count: 0, saving: false },
  'conditional-store',
  {
    // Only persist when count is even and we're not in a saving state
    shouldPersist: (prevState, nextState) => 
      nextState.count % 2 === 0 && !nextState.saving
  }
)
```

### Debounce Persistence

```typescript
import { persist } from 'valtio-persist'

// Set custom debounce time (default is 100ms)
const { store } = persist(
  { count: 0 },
  'debounced-store',
  { debounceTime: 500 } // Wait 500ms after state changes before persisting
)
```

### Manual Control

```typescript
import { persist } from 'valtio-persist'

// Get manual control functions
const { store, persist: persistStore, restore, clear } = persist(
  { count: 0 },
  'manual-store'
)

// Manually trigger persistence
await persistStore()

// Manually restore from storage
const success = await restore()
if (success) {
  console.log('State restored successfully')
}

// Clear persisted state
await clear()
```

### Options Object Format

You can also provide options in a single object:

```typescript
import { persist } from 'valtio-persist'
import { SessionStorageStrategy, DeepMergeStrategy } from 'valtio-persist'

const { store } = persist(
  { count: 0 },
  {
    key: 'options-store',
    storageStrategy: SessionStorageStrategy,
    mergeStrategy: DeepMergeStrategy,
    debounceTime: 200,
    restoreStateOnInit: true,
    shouldPersist: (prev, next) => true
  }
)
```

## TypeScript Support

The library is fully typed and will respect your state interface:

```typescript
interface UserState {
  name: string
  loggedIn: boolean
  preferences: {
    theme: 'light' | 'dark'
    notifications: boolean
  }
}

// Type-safe persisted store
const { store } = persist<UserState>(
  {
    name: '',
    loggedIn: false,
    preferences: {
      theme: 'light',
      notifications: true
    }
  },
  'user-settings'
)

// TypeScript will provide autocomplete and type checking
store.name = 'John' // ✅
store.preferences.theme = 'dark' // ✅
store.preferences.theme = 'blue' // ❌ Type error
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
