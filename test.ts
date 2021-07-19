import { assert, assertEquals } from "https://deno.land/std/testing/asserts.ts"
import { describe, before, it } from "https://deno.land/x/spec/mod.ts"

import { Hasher, create } from "./mod.ts"

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
                assertEquals(dh.hash('abc', 'hex'), '990977adf52cbc44')
                const ch = await create(Uint8Array.of(1,2,3,4,5,6,7,8))
                assertEquals(ch.hash('abc', 'hex'), 'ae62c0ec1c209b07')
            })

            it('accepts any iterable', async ctx => {
                const h = await create('12345678')
                assertEquals(h.hash('abc', 'hex'), 'ae62c0ec1c209b07')
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
                assertEquals(ctx.h.digest('hex'), '99e9d85137db46ef')
                ctx.h.update('x')
                assertEquals(ctx.h.digest('hex'), '2311048396c0805c')
                ctx.h.reset()
                assertEquals(ctx.h.digest('hex'), '99e9d85137db46ef')
            })
        })

        describe('#update', () => {
            it('returns the Hasher instance', ctx => {
                assertEquals(ctx.h.update('x'), ctx.h)
            })

            it('accepts a Uint8Array', ctx => {
                ctx.h.update(Uint8Array.of(97, 98, 99))
                assertEquals(ctx.h.digest('hex'), '990977adf52cbc44')
            })

            it('accepts a string', ctx => {
                ctx.h.update('abc')
                assertEquals(ctx.h.digest('hex'), '990977adf52cbc44')
            })

            it('can be called incrementally', ctx => {
                ctx.h.update('a').update('b').update('c')
                assertEquals(ctx.h.digest('hex'), '990977adf52cbc44')
            })
        })

        describe('#digest', () => {
            before(ctx => {
                ctx.h.update('xyz')
            })

            it('defaults to returning a "raw" Uint8Array', ctx => {
                assertEquals(
                    [ ...ctx.h.digest() ],
                    [ 254, 186, 72, 70, 91, 131, 60, 161 ]
                )
            })

            it('can return a "bigint"', ctx => {
                assertEquals(ctx.h.digest('bigint'), 11618305566753471230n)
            })

            it('can return a "hex" string', ctx => {
                assertEquals(ctx.h.digest('hex'), 'a13c835b4648bafe')
            })

            it('can be called multiple times without reseting', ctx => {
                ctx.h.update('foo')
                assertEquals(ctx.h.digest('bigint'), 12479437785964555199n)
                assertEquals(ctx.h.digest('hex'), 'ad2fde8c25012bbf')
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
                assertEquals(ctx.h.hash('mno', 'hex'), '5c69ed943b56232c')
            })
        })
    })
})
