const ENCODER = new TextEncoder
const HEAP = 16 * 1024
const SEED_LENGTH = 8
const DEFAULT_SEED = new Uint8Array(SEED_LENGTH) // default to zeros

const DIGEST_DATA = new Uint8Array(BigUint64Array.BYTES_PER_ELEMENT)
const DIGEST_VIEW = new DataView(DIGEST_DATA.buffer)

type Data = Uint8Array | string
type Digests = Uint8Array | bigint | string
type InternalHasher = {
    Hash_GetBuffer: () => number,
    Hash_Init: () => undefined,
    Hash_Update: (length: number) => any,
    Hash_Final: () => undefined
}

export interface Hasher {
    reset: () => Hasher
    update: (data: Data) => Hasher
    digest: (format?: string) => Digests
    hash: (data: Data, format?: string) => Digests
}

class XXHasher implements Hasher {
    private internal: InternalHasher
    private memory: Uint8Array
    private seed: Uint8Array

    constructor(instance: WebAssembly.Instance, seed: Uint8Array) {
        this.internal = instance.exports as InternalHasher
        this.memory = new Uint8Array(
            (instance.exports.memory as WebAssembly.Memory).buffer,
            this.internal.Hash_GetBuffer(), HEAP
        )
        this.seed = seed
        this.reset()
    }

    reset() {
        this.memory.set(this.seed)
        this.internal.Hash_Init()
        return this
    }

    update(data: Data) {
        if (typeof data === 'string') data = ENCODER.encode(data)

        let updated = 0
        while (updated < data.length) {
            const block = data.subarray(updated, updated + HEAP)
            this.memory.set(block)
            this.internal.Hash_Update(block.length)
            updated += block.length
        }
        return this
    }

    digest(format: string = 'raw'): Digests {
        this.internal.Hash_Final()
        const length = DIGEST_DATA.byteLength

        if (format === 'bigint' || format === 'hex') {
            // read digest bytes as a little-endian uint64
            DIGEST_DATA.set(this.memory.subarray(0, length))
            const digest = DIGEST_VIEW.getBigUint64(0, true)
            if (format === 'bigint') return digest
            // return digest as a hex string
            return digest.toString(16).padStart(length * 2, '0')
        }

        // return a copy of the raw digest bytes
        return this.memory.slice(0, length)
    }

    hash(data: Data, format: string = 'raw'): Digests {
        return this.reset().update(data).digest(format)
    }
}

// xxHash64 WASM implementation from https://github.com/Daninet/hash-wasm/blob/master/src/xxhash64.c
const WASM = "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"

const XXHash64 = WebAssembly.compile(
    Uint8Array.from(atob(WASM), char => char.charCodeAt(0))
)

function generateSeed(data: Iterable<any>): Uint8Array {
    const seed = new Uint8Array(SEED_LENGTH)
    let index = 0
    for (const item of data) seed[index++ % SEED_LENGTH] ^= item
    return seed
}

export async function create(seedData?: Iterable<any>): Promise<Hasher> {
    let instance = await WebAssembly.instantiate(await XXHash64)
    let seed = DEFAULT_SEED
    if (seedData) seed = generateSeed(seedData)
    return new XXHasher(instance, seed)
}
