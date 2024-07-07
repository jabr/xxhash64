# xxHash64

A fast, simple xxHash64 (and XXH3) implementation in TypeScript/WASM.

## Example

```ts
import * as XXH64 from "https://deno.land/x/xxhash64@1.1.0/mod.ts"

let h = await XXH64.create()
h.update('abc')
h.digest() // #=> Uint8Array(8) [ 68, 188, ... ]
h.digest('bigint') // #=> 11027476751619767364n
h.digest('hex') // #=> "44bc2cf5ad770999"

// Continue updating/digesting a hash...
h.update('xyz').digest('hex') // #=> "19434a35e8bf0983"
h.update('xyz').digest('hex') // #=> "578474f682ca960f"

// Reset to generate a new hash:
h.reset().update('xyz').digest('hex') // #=> "feba48465b833ca1"

// Combine reset/update/digest in one call:
h.hash('xyz', 'hex') // #=> "feba48465b833ca1"

// Improved XXH3 64-bit algorithm...
let h3 = await XXH64.create3()
h3.hash('xyz', 'hex') // #=> "6276d2656f411f1f"
h3.hash('abc', 'bigint') // #=> 5780703864653066104n
```

## References

* [xxHash](https://cyan4973.github.io/xxHash/)
* [hash-wasm](https://github.com/Daninet/hash-wasm)

## License

This project is licensed under the terms of the [MIT license and others](LICENSE.txt).
