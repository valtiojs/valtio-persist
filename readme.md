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
const { store } = await persist<State>(
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
const { store: localStore } = await persist(
  { count: 0 },
  'local-store',
  { storageStrategy: LocalStorageStrategy }
)
```

LocalStorageStrategy is the default and is provided within the main `valtio-persist` bundle along with `SessionStorageStrategy` and `MemoryStoragStrategey` (useful for testing). Other strategies are imported separately. Many of these are still in development. See <a href="#future-additions">Future Additions</a>.

```typescript
import { persist } from 'valtio-persist'
import { IndexedDbStrategy } from 'valtio-persist/indexed-db'

const { store } = await persist(
  { count: 0 },
  'my-indexdb-store',
  { storageStrategy: IndexedDbStrategy }
)
```


Current list of available storage strategies. You can find others that are still in development in <a href="#future-additions">Future Additions</a>
<table>
  <thead>
    <tr><th>Exported Name</th><th>Import syntax</th></tr>
  </thead>
  <tbody>
    <tr><td>local-storage</td><td><pre><code class="language-typescript">import { LocalStorageStrategy } from 'valtio-persist'</code></pre></td></tr>
    <tr><td>session-storage</td><td><pre><code class="language-typescript">import { SessionStorageStrategy } from 'valtio-persist'</code></pre></td></tr>
    <tr><td>memory-storage</td><td><pre><code class="language-typescript">import { MemoryStorageStrategy } from 'valtio-persist'</code></pre></td></tr>
    <tr><td colspan='2'><i>The items below are not included in the `valtio-persist` bundle</i></td></tr>
    <tr><td>indexed-db</td><td><pre><code class="language-typescript">import { IndexedDBStrategy } from 'valtio-persist/indexed-db'</code></pre></td></tr>
    <tr><td colspan='2'><i>Many more coming! See <a href="#future-additions">Future Additions</a></i></td></tr>
  </tbody>
</table>


### Merge Strategies
Choose how to merge stored state with the initialState.

The default merge strategy doesn't check for any non-serializable types which in turn is very fast.
If you're just store simple objects, use this strategy.

The deepMerge strategy will go through the object and account for unserializable types and store them as best it can.
```typescript
import { persist } from 'valtio-persist'
import { DefaultMergeStrategy, DeepMergeStrategy } from 'valtio-persist'

// Use default (shallow) merge strategy
const { store: defaultStore } = await persist(
  { count: 0, nested: { value: 'default' } },
  'default-merge',
  { mergeStrategy: DefaultMergeStrategy }
)

// Use deep merge strategy for nested objects
const { store: deepStore } = await persist(
  { count: 0, nested: { value: 'default', other: true } },
  'deep-merge',
  { mergeStrategy: DeepMergeStrategy }
)
```

### Conditional Persistence
```typescript
import { persist } from 'valtio-persist'

// Only persist when specific conditions are met
const { store } = await persist(
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
>> Note: This is not recommended for file writes. Consider <a href="https://lodash.com/docs/#throttle">throttling</a> instead.
```typescript
import { persist } from 'valtio-persist'

// Set custom debounce time (default is 100ms)
const { store } = await persist(
  { count: 0 },
  'debounced-store',
  { debounceTime: 500 } // Wait 500ms after state changes before persisting
)
```

### Manual Control
Restoration and persistence are automatically handled for you, but you can manually invoke them as well.
```typescript
import { persist } from 'valtio-persist'

// Get manual control functions
const { store, persist: persistStore, restore, clear } = await persist(
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

```typescript
import { persist } from 'valtio-persist'
import { SessionStorageStrategy, DeepMergeStrategy } from 'valtio-persist'

const { store } = await persist(
  { count: 0 },
  'storage-key',
  {
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
const { store } = await persist<UserState>(
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

## Future additions
We have many new storage strategies already in the works and would love the help of the community (that's you) to both test and develop them. Each of the items below already has it's own branch. Contributions are most welcome!

[async-storage](/tree/async-storage) - React Native persistent key-value storage system for mobile apps.

[expo-file-system](/tree/expo-file-system) - File-based storage for Expo applications with directory support.

[extension-storage](/tree/extension-storage) - Browser extension-specific storage using Chrome's storage API.

[file-system-api](/tree/file-system-api) - Modern web browser API for accessing the file system in PWAs (progressive web apps).

[single-file](/tree/single-file) - Node.js implementation that stores all state in a single JSON file. (from the original `valtio-persist` libarary)

[multi-file](/tree/multi-file) - Node.js implementation that stores each state key in a separate file. (from the original `valtio-persist` library)

[secure-storage](/tree/secure-storage) - Encrypted storage for sensitive data in mobile apps using Expo or React Native.

[sqllite](/tree/sqllite) - Relational database storage using SQLite for more complex data relationships.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Thank you

A big shout and thank you to [Noitidart](https://github.com/Noitidart) who created the original `valtio-persist` package and has graciously allowed the use of the name to the community.