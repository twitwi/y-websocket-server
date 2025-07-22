
import fs from 'fs'
import YAML from 'yaml'
import { z } from 'zod'
import assert from 'assert'
import { createHash } from 'crypto'

export const zRegexp = z.string()
export const zBiReplacement = z.string()
//export const zAccessType = z.union([z.literal('read'), z.literal('write'), z.literal('denied')])
export const zAccessType = z.literal(['read', 'write', 'denied'])
//export const zTokenMap = z.record(zToken, z.record(zAccessType)) // token -> regexp -> mode
export const zRule = z.object({
    mode: zAccessType,
    token: zRegexp,
    path: zRegexp,
    preHash: zBiReplacement.optional(),
    l: z.number().default(32), // hash length for hash check
    hashCheck: zBiReplacement.optional(),
    checks: z.array(z.tuple([zBiReplacement, zBiReplacement])).default([])
}).strict()
export const zRuleWithShortcuts = z.preprocess((input, ctx) => {
    if (typeof input === 'string') {
        input = input.split(/ +/)
        if (!Array.isArray(input) || input.length < 2) {
            ctx.issues.push({
                code: "custom",
                message: "Text shortcuts must contain at least 2 parts (mode and text-token)",
                input,
            });
            return z.NEVER
        }
        input[1] = '^' + input[1] + '$'
    }
    if (Array.isArray(input)) {
        input = {
            mode: input[0],
            token: input[1],
            path: input[2] ?? '.*',
        }
    }
    return input
}, zRule)
export const zConfig = z.array(zRuleWithShortcuts)

export function loadYaml(path) {
    const file = fs.readFileSync(path, 'utf8')
    return parseYaml(file)
}
export function parseYaml(yaml) {
    return zConfig.parse(YAML.parse(yaml))
}

export function biReplace(s, T, P) {
    return s.replaceAll(/\$T([0-9]+)\$/g, (...m) => T[m[1]]).replaceAll(/\$P([0-9]+)\$/g, (...m) => P[m[1]])
}

export function getRegexp(pattern) {
    // TODO: could memoize
    return new RegExp(pattern)
}

export function getAccessMode(config, token, path) {
    ruleLoop: for (const rule of config) {
        const reToken = getRegexp(rule.token)
        const rePath = getRegexp(rule.path)
        const T = token.match(reToken)
        if (T == null) {
            continue
        }
        const P = path.match(rePath)
        if (P == null) {
            continue
        }
        if (rule.hashCheck !== undefined) {
            const hashCheck = biReplace(rule.hashCheck, T, P)
            const preHash = biReplace(rule.preHash, T, P)
            const hash = createHash('sha256').update(preHash).digest('hex').substring(0, rule.l)
            //console.log("!!!!", preHash, hash, hashCheck === hash)
            if (hashCheck !== hash) {
                continue
            }
        }
        for (const c of rule.checks) {
            if (biReplace(c[0], T, P) !== biReplace(c[1], T, P)) {
                continue ruleLoop
            }
        }
        return rule.mode
    }
    return 'denied'
}

//// Tests/Specification
export function testAccess() {
    const cfg = loadYaml('./tokens_test.yaml')
    const _ = (mode, token, path) => assert.equal(getAccessMode(cfg, token, path), mode, `path «${path}» with token «${token}», expect «${mode}»`)
    _('denied', 'Ttest', '/TEST')
    _('write', 'Ttest', '/TEST/')
    _('write', 'Ttest', '/TEST/ok')
    _('denied', 'blaTtestbla', '/TEST/ok')
    _('denied', 'Ttest', '/ko/TEST/ko')
    _('denied', '', '/TEST')
    _('denied', 'Ttest', '/RO')
    _('read', 'Ttest', '/RO/ok') // even if two spaces after "read" in the yaml
    // # array: regexp token (here for the empty token)
    _('denied', '', '/PUBLIC')
    _('read', '', '/PUBLIC/')
    _('read', '', '/PUBLIC/yes')
    _('read', '', '/PUBLIC/sub/yes')
    _('denied', 'Tnonempty', '/PUBLIC/sub/yes')
    // # trivial, un-hashed token factory
    _('write', 'TEST_123', '/TEST/123')
    _('write', 'TEST_toto', '/TEST/toto')
    _('denied', 'TEST_123', '/TEST/toto')
    // # per-doc token access
    _('denied', '', '/DOCS/gabu')
    _('read', 'Ttest_rod781a4', '/DOCS/gabu')
    _('write', 'Ttest_3ffd1fa2', '/DOCS/gabu')
    _('denied', 'Ttest_badhash', '/DOCS/gabu')
    _('denied', 'Ttest_robadbad', '/DOCS/gabu')
    // # per-user token access to a shared folder
    _('write', 'Tgroup-bob-f3ae5a3cf99628c4', '/GROUP/stuff')
    _('write', 'Tgroup-bob-f3ae5a3cf99628c4', '/GROUP/otherstuff')
    _('denied', 'Tgroup-bob-badhash', '/GROUP/stuff')
    _('write', 'Tgroup-abed-95bba777202a03b9', '/GROUP/stuff')
    // # per-user token access to personal document
    _('write', 'Tuser-bob-f3ae5a3c', '/PRIVATE/bob/stuff')
    _('write', 'Tuser-bob-f3ae5a3c', '/PRIVATE/bob/other/stuff')
    _('denied', 'Tuser-bob-f3ae5a3c', '/PRIVATE/abed/stuff')
    _('write', 'Tuser-abed-95bba777', '/PRIVATE/abed/stuff')
    _('denied', 'Tuser-abed-95bba777', '/PRIVATE/bob/stuff')
    _('denied', 'Tuser-abed-f3ae5a3c', '/PRIVATE/abed/stuff')
    _('denied', 'Tuser-abed-f3ae5a3c', '/PRIVATE/bob/stuff')
    _('denied', 'Tuser-beerbad-3555aa1b', '/PRIVATE/beerbad/stuff') // revoked/denied
    // # per-user, per-doc access to shared documents
    _('denied', 'Tfine-bob-badhash', '/FINESHARE/stuff')
    _('write', 'Tfine-bob-fcc31f37b09a77c53e7103c49cae16ec', '/FINESHARE/stuff')
    _('denied', 'Tfine-bob-fcc31f37b09a77c53e7103c49cae16ec', '/FINESHARE/other/stuff')
    _('write', 'Tfine-bob-ac83fc7418d6c9f227463d81cc1e3ce9', '/FINESHARE/other/stuff')
    _('denied', 'Tfine-bob-5405d10f17f3ca210c1e550ee7a44255', '/FINESHARE/more/other/stuff') // revoked
    _('write', 'Tfine-abed-be41604afcc669b2aa45197d99e3d980', '/FINESHARE/stuff')
    _('write', 'Tfine-abed-72f72c1270084c9fac438987ad2230c7', '/FINESHARE/other/stuff')
    _('denied', 'Tfine-abed-fcc31f37b09a77c53e7103c49cae16ec', '/FINESHARE/stuff')
}
export function testParsing() {
    const eq = assert.deepEqual
    const p1 = parseYaml(`- ['denied', '^testtoken$', '.*']`) // array => all regexp
    const p2 = parseYaml(`- denied testtoken .*`) // string => token gets ^$ wrapped
    const p3 = parseYaml(`- denied testtoken`)
    eq(p1, p2)
    eq(p2, p3)
    const p4 = parseYaml(`- read testtoken2 ^/testdir/doc$`)
    const p5 = parseYaml(`- ['read', '^testtoken2$', '^/testdir/doc$']`)
    eq(p4, p5)
    const p6 = parseYaml(`
- mode: write
  token: ^test_(.*)$
  path: ^/test/(.*)$
  preHash: 'salt_2025-07-22T11:15:41_$P1$_write'
  hashCheck: $T1$`)
    const p7 = [{
        mode: "write",
        token: "^test_(.*)$",
        path: "^/test/(.*)$",
        preHash: 'salt_2025-07-22T11:15:41_$P1$_write',
        hashCheck: "$T1$",
        l: 32,
        checks: [],
    }]
    eq(p6, p7)
    const p99 = loadYaml('./tokens_test.yaml')
}

if (process.env.TEST) {
    console.log("Running tests")
    testParsing()
    testAccess()
    console.log("... all done.")
}
