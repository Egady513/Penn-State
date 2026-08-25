import io
p = "app/admin/broadcast/page.tsx"
s = io.open(p, encoding="utf-8").read()

s = s.replace("import { PAIRING_TOKEN as GROUP_TOKEN } from '@/lib/broadcastToken';",
              "import { PAIRING_TOKEN as GROUP_TOKEN, PIN_TOKEN } from '@/lib/broadcastToken';", 1)

# Chip should light up for either token, and mention both.
old = """            {body.includes(GROUP_TOKEN) ? ("""
new = """            {body.includes(GROUP_TOKEN) || body.includes(PIN_TOKEN) ? ("""
assert old in s; s = s.replace(old, new, 1)

old = """                <span className={styles.tokenNote}>
                  Each golfer sees their own group where <code>{GROUP_TOKEN}</code> sits: group number,
                  starting hole, and the other team they&apos;re playing with. Anyone without a group yet
                  gets a short &ldquo;posted at check-in&rdquo; line instead.
                </span>"""
new = """                <span className={styles.tokenNote}>
                  <code>{GROUP_TOKEN}</code> becomes each golfer&apos;s group number, starting hole, and
                  the other team they&apos;re playing with. Anyone without a group yet gets a short
                  &ldquo;posted at check-in&rdquo; line instead. <code>{PIN_TOKEN}</code> becomes their
                  own team PIN, so nobody has to dig up an old email.
                </span>"""
assert old in s; s = s.replace(old, new, 1)

old = """                <button type="button" className={styles.resetBtn} onClick={() => setBody(b => `${b.trimEnd()}\n\n${GROUP_TOKEN}\n`)}>
                  Add group block
                </button>
                <span className={styles.tokenNote}>
                  Drops in <code>{GROUP_TOKEN}</code>, which becomes each golfer&apos;s own group and
                  starting hole. Move the line wherever you want it to appear.
                </span>"""
new = """                <button type="button" className={styles.resetBtn} onClick={() => setBody(b => `${b.trimEnd()}\n\n${GROUP_TOKEN}\n`)}>
                  Add group block
                </button>
                <button type="button" className={styles.resetBtn} onClick={() => setBody(b => `${b.trimEnd()}\n\n${PIN_TOKEN}\n`)}>
                  Add team PIN
                </button>
                <span className={styles.tokenNote}>
                  <code>{GROUP_TOKEN}</code> becomes each golfer&apos;s own group and starting hole.
                  <code>{PIN_TOKEN}</code> becomes their team PIN. Move either line wherever you want it.
                </span>"""
assert old in s; s = s.replace(old, new, 1)

io.open(p, "w", encoding="utf-8", newline="").write(s)
print("broadcast ui updated")
