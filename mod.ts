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
