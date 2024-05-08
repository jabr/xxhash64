import { assert, assertEquals } from "https://deno.land/std/testing/asserts.ts"
import { describe, before, it } from "https://deno.land/x/spec/mod.ts"

import { Hasher, create, create3 } from "./mod.ts"

describe('xxHash64', () => {
    describe('Hasher', () => {
        it('is a type/interface', () => {
            // Not a "real" test, but the file will fail to compile if
            // Hasher is not an exported type/interface.
            interface TestHasherInterface extends Hasher {}
            assert(true)
        })
    })

    describe('create', () => {
        it('returns a Promise for a Hasher instance', async ctx => {
            const hp = create()
            assert(hp instanceof Promise)

            const h = await hp
            assertEquals(typeof h, 'object')

            // Check for functions defined by Hasher interface...
            assertEquals(typeof h.reset, 'function')
            assertEquals(h.reset.length, 0)

            assertEquals(typeof h.update, 'function')
            assertEquals(h.update.length, 1)

            assertEquals(typeof h.digest, 'function')
            assertEquals(h.digest.length, 0) // has optional `format` argument

            assertEquals(typeof h.hash, 'function')
            assertEquals(h.hash.length, 1) // has optional `format` argument
        })

        describe('with custom seed data', () => {
            it('generates different hashes', async ctx => {
                const dh = await create()
                assertEquals(dh.hash('abc', 'hex'), '44bc2cf5ad770999')
                const ch = await create(Uint8Array.of(1,2,3,4,5,6,7,8))
                assertEquals(ch.hash('abc', 'hex'), '079b201cecc062ae')
            })

            it('accepts any iterable', async ctx => {
                const h = await create('12345678')
                assertEquals(h.hash('abc', 'hex'), '079b201cecc062ae')
            })
        })
    })

    describe('instance', () => {
        before(async ctx => {
            ctx.h = await create()
        })

        describe('#reset', () => {
            it('returns the Hasher instance', ctx => {
                assertEquals(ctx.h.reset(), ctx.h)
            })

            it('sets the instance back to the initial state', ctx => {
                assertEquals(ctx.h.digest('hex'), 'ef46db3751d8e999')
                ctx.h.update('x')
                assertEquals(ctx.h.digest('hex'), '5c80c09683041123')
                ctx.h.reset()
                assertEquals(ctx.h.digest('hex'), 'ef46db3751d8e999')
            })
        })

        describe('#update', () => {
            it('returns the Hasher instance', ctx => {
                assertEquals(ctx.h.update('x'), ctx.h)
            })

            it('accepts a Uint8Array', ctx => {
                ctx.h.update(Uint8Array.of(97, 98, 99))
                assertEquals(ctx.h.digest('hex'), '44bc2cf5ad770999')
            })

            it('accepts a string', ctx => {
                ctx.h.update('abc')
                assertEquals(ctx.h.digest('hex'), '44bc2cf5ad770999')
            })

            it('can be called incrementally', ctx => {
                ctx.h.update('a').update('b').update('c')
                assertEquals(ctx.h.digest('hex'), '44bc2cf5ad770999')
            })
        })

        describe('#digest', () => {
            before(ctx => {
                ctx.h.update('xyz')
            })

            it('defaults to returning a "raw" Uint8Array', ctx => {
                assertEquals(
                    [ ...ctx.h.digest() ],
                    [ 0xfe, 0xba, 0x48, 0x46, 0x5b, 0x83, 0x3c, 0xa1 ]
                )
            })

            it('can return a "bigint"', ctx => {
                assertEquals(ctx.h.digest('bigint'), 11618305566753471230n)
            })

            it('can return a "hex" string', ctx => {
                assertEquals(ctx.h.digest('hex'), 'feba48465b833ca1')
            })

            it('can be called multiple times without reseting', ctx => {
                ctx.h.update('foo')
                assertEquals(ctx.h.digest('bigint'), 12479437785964555199n)
                assertEquals(ctx.h.digest('hex'), 'bf2b01258cde2fad')
            })
        })

        describe('#hash', () => {
            before(ctx => {
                ctx.h.update('xyz')
            })

            it('combines a reset, update, and digest call', ctx => {
                assertEquals(
                    [ ...ctx.h.hash('mno') ],
                    [ 44, 35, 86, 59, 148, 237, 105, 92 ]
                )
            })

            it('takes an optional argument for the digest format', ctx => {
                assertEquals(ctx.h.hash('mno', 'bigint'), 6659114744950432556n)
                assertEquals(ctx.h.hash('mno', 'hex'), '2c23563b94ed695c')
            })
        })
    })

    describe('#create3', () => {
        before(async ctx => {
            ctx.h = await create3()
        })

        it('creates a Hasher using the XXH3 algorithm', ctx => {
            assertEquals(
                [ ...ctx.h.hash('mno') ],
                [ 0xe0, 0x46, 0xa7, 0x2c, 0xe8, 0x49, 0x75, 0x47 ]
            )
            assertEquals(ctx.h.hash('mno', 'hex'), 'e046a72ce8497547')
            assertEquals(ctx.h.hash('xyz', 'hex'), '6276d2656f411f1f')
            assertEquals(ctx.h.hash('abc', 'bigint'), 5780703864653066104n)
        })
    })
})
