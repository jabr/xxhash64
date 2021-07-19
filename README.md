# xxHash64

A fast, simple xxHash64 implementation in TypeScript/WASM.

## Example

```ts
import * as XXH64 from "./mod.ts"

let h = await XXH64.create()
h.update('abc')
h.digest() // #=> Uint8Array(8) [ 68, 188, ... ]
h.digest('bigint') // #=> 11027476751619767364n
h.digest('hex') // #=> "990977adf52cbc44"

// Continue updating/digesting a hash...
h.update('xyz').digest('hex') // #=> "8309bfe8354a4319"
h.update('xyz').digest('hex') // #=> "0f96ca82f6748457"

// Reset to generate a new hash:
h.reset().update('xyz').digest('hex') // #=> "a13c835b4648bafe"

// Combine reset/update/digest in one call:
h.hash('xyz', 'hex') // #=> "a13c835b4648bafe"
```

## References

* [xxHash](https://cyan4973.github.io/xxHash/)
* [hash-wasm](https://github.com/Daninet/hash-wasm)

## License

This project is licensed under the terms of the [MIT license and others](LICENSE.txt).
