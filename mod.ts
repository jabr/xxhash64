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

// xxHash64 WASM implementation from https://github.com/Daninet/hash-wasm/blob/master/src/xxhash64.c (4.10.0)
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
