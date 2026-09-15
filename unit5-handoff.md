# Unidad 5 Handoff — Sistemas de Partículas
### "Una estructura que se convierte en lenguaje" — Museum Walkthrough concept

Course: Simulación para Sistemas Interactivos (UPB)
Unit page: https://juanferfranco.github.io/simulacion-2026-20/units/unit5/
Weight: 12.5% of final grade
Status: concept locked (Section 5), nothing built yet.

**Framing:** this is a reimagining of a real commission. The professor's own referente (ForumTEDTALK) turns out to be his solution to the exact same brief, for the exact same client, using the exact same script — the uploaded script confirms this word for word. The exercise is: act as though we were hired for this talk, working from the client's actual materials, and build our own presentation for it. The content (the script, its order, its 13 beats) is prescribed and non-negotiable. The visual solution is not — it needs to be ours, not the professor's.

---

## 0. What this unit actually asks for

Read literally, the brief is: build a live generative web presentation, driven by the client's fixed script, where a particle or linked-element system's structural relationships (not literal illustration) carry the meaning of each line. The professor's framing, translated: an isolated particle can move; a relationship makes structure possible; a structure that changes can become language. The code is a means, not the point — the point is understanding how the system's changes communicate.

**Hard requirements, from the "Actividad 02" spec:**
- A particle system or linked-element system built on structural relationships.
- Those relationships must have declared meaning, and that meaning must change across the discourse.
- Major changes in movement or structure must respond to communicative intent, not decoration.
- The system must interpret the given script without altering its narrative sequence.
- It must run as a full-screen web presentation, legible and well-composed on a large screen.

**The design rule, quoted directly because the wording is the actual constraint to build against:**
> "Ningún movimiento debería existir solamente para decorar. Todo cambio importante del sistema debe poder explicarse en términos de una relación, una transformación estructural o una intención comunicativa."

**Bitácora:** process must be logged via git version control (experiments, decisions, progress, reflections). Ungraded, but required practice — same convention as prior units.

**Presentation (Actividad 03):** demo the working piece live and explain the concept, the visual grammar, and how structural relationships and motion interpreted the discourse. Self-evaluation (written in the bitácora *before* presenting) is scored on four 25-point criteria: brief compliance + full-screen operation, ability to explain what the relationships mean and how they organize the system, ability to connect behavior/structure/density changes to communicative intent, and quality of the live explanation/demo.

---

## 1. The client's script is exact and non-negotiable

The uploaded `TED_TALK_BRASIL.docx` is, word for word, the same script ForumTEDTALK built from: 13 slides, the same lines, the same six photo callouts (FOTO 1 through FOTO 6), the same closing QR slide. This is not a coincidence and not a loose thematic match — it's the actual commissioned material, and both the professor's build and this one are working from it directly.

That changes something I got wrong in the first draft of this document: I'd flagged the 13-beat count as an incidental detail not to be imitated. That was wrong. The beat count and sequence aren't the professor's stylistic choice, they're the client's actual content, so they carry over exactly — same 13 stations, same order, same words, no reordering, no adding or dropping a beat. The full script is reproduced in Section 8 so it's ready to paste into the project when you prompt for it.

**What still must not carry over** is the specific visual solution built on top of that content: the spiral-as-stable-anchor device, particles-as-orbiting-people representing "Forum as living space," the flat full-bleed 2D canvas format itself, the specific named behavior parameters (spiral/network/architecture/archive/stability) and their per-moment values, and the cyan/red/magenta palette tied to that event's own branding (Future Leaders Forum World Cup Edition 2026 — that tie-in was the professor's choice, not something the client's script asks for). None of that is content. All of it is one particular designer's answer to the content, and a different answer is the actual assignment.

---

## 2. Referente 1: Memo Akten, *Forms* (2011)

Motion-capture footage of athletes (from the National Media Museum archive), reprocessed with tracking and simulation software into abstract sculptural extrapolations of movement — inspired by Muybridge, Marey, and Duchamp's *Nude Descending a Staircase*. Won the Golden Nica at Prix Ars Electronica 2013. The point for this unit isn't the tracking pipeline; it's that a single movement, extended and transformed through time, reveals structure and relationship that weren't visible in the original gesture. Use it as a conceptual lens for what "movement becomes structure becomes language" can mean, not as a style target.

## 3. Referente 2: ForumTEDTALK — architecture breakdown

**What it is, structurally:** not a slide deck. A single-page browser experience with 13 scripted "momentos," advanced by keyboard (space/→ forward, ← back, F fullscreen, H toggle help, R restart) or swipe on mobile. Runs offline by double-clicking `index.html`. Opens in Portuguese by default (the talk was in Brazil) with an ES/PT toggle. Closes on a QR-code slide.

**File anatomy** (six files, cleanly separated by responsibility):
- `index.html` — DOM skeleton: canvas mount point plus the UI chrome (title/kicker/subtitle text layer, help panel, controls).
- `styles.css` — layout, typography, the QR/link composition, responsive rules.
- `config.js` — the "knobs" file: particle count, connection distance, transition easing speed, color palette, default language, per-moment background-image assignments, and the QR destination links. Nothing narrative lives here.
- `moments.js` — the actual script, as data. An array of 13 objects, each with bilingual copy (title/kicker/subtitle), a semantic `state` label (e.g. `"latent"`, `"triad"`, `"trust"`, `"convergence"`), an `intensity` scalar, a 3-color set, and a `behavior` vector of five named parameters (spiral / network / architecture / archive / stability) that function as *target values* for that moment.
- `main.js` — DOM wiring: keyboard/touch handlers, moment-to-moment transition sequencing, language switching, fullscreen toggling, QR rendering.
- `visualSystem.js` — the render engine. One class holding a fixed pool of particles and a `params` object that eases toward whatever `behavior` vector the current moment declares, once per frame. A dispatcher keyed on the `state` string decides, per moment, how particles are repositioned and what auxiliary shapes (connections, the spiral, energy traces, etc.) get drawn.

**The one pattern worth actually reusing:** content and rendering are fully decoupled. `moments.js` never touches canvas code — it only declares, in abstract numeric terms, what a given moment *means* (how connected, how stable, how architectural, how intense). `visualSystem.js` never contains a word of the script — it only knows how to ease toward a target vector and how to draw a menu of named states. That separation is what forces the "every change must mean something" rule to actually hold: you can't add a visual flourish without first deciding which named parameter it belongs to and writing that decision into the script data. This maps directly onto the museum concept below: each station's data (script text + a small set of named "meaning" parameters) should stay separate from the Three.js code that renders whatever particle system sits on that station's pillar.

**Also worth reusing as a working habit, not as content:** the repo keeps a `DECISIONES_SISTEMA_VISUAL.md` — one section per moment, naming the "concepto visual" and the concrete decision taken (what to include, what to explicitly ban, and why), plus a short section up front locking the guiding metaphor. This is the same discipline this project already uses for the Unidad 4 Kuramoto build (`decisions.md`) — worth running again here with unit-5-specific content, logging decisions as the museum concept gets built out.

**What NOT to import, even structurally:** the spiral-as-stable-anchor device, the "space/orbit/community" metaphor itself, the specific behavior-parameter names and values, the flat full-bleed 2D canvas format, and the event's cyan/red/magenta palette.

## 4. Referente / alignment text: Nature of Code, ch. 4 — Particle Systems
https://natureofcode.com/particles/

Worth noting because it's the book chapter the unit is explicitly pegged to, and its model is *different* from ForumTEDTALK's: Shiffman's pattern is Particle objects with position/velocity/acceleration, a lifespan that counts down, an Emitter that births and removes them (with inheritance/polymorphism for varied particle types), and forces applied via `applyForce()`. ForumTEDTALK, by contrast, uses a **fixed pool of persistent particles** whose *target position function* changes per narrative state — no birth, no death, no forces. For a Three.js build, either model translates fine (a `THREE.Points` buffer geometry can hold a fixed pool just as easily as a canvas can), but it's worth deciding per station whether a given particle system wants persistent particles that reconfigure, or an emitter that births/dies — they read differently (a reconfiguring cloud feels like transformation; a birth/death stream feels like growth or decay), and the twelve remaining stations will each want one of these two answers.

---

## 5. Locked creative decision — the Museum Walkthrough

**The concept, as decided:** a first-person virtual museum. The camera acts as the visitor. Each of the client's 13 script beats becomes one station along a fixed path. At each station: a pillar with a placard bearing the client's exact words for that beat, and on top of the pillar, a particle system expressing that beat's narrative meaning — this is what replaces the professor's central spiral. The camera advances station to station on keyboard input, the same operating logic as traditional slide navigation (discrete jumps, not free-roam walking). The general museum scaffold gets built first; each station's particle system gets authored iteratively afterward, once the shell works end to end.

This is a genuinely different structural answer to the brief, not a reskin: where ForumTEDTALK's relationship is orbital (particles held in relation to a fixed center), the museum's relationship is processional (meaning accumulates as you walk a sequence, station by station, with generational succession told through physical progression through a space). That distinction is worth stating plainly in the Actividad 03 presentation, since "why does a walk through a museum represent generational relevo better than an orbiting network" is exactly the kind of question the rubric's third criterion is asking you to be able to answer.

**Open decisions worth resolving before Claude Code scaffolds anything** (these aren't things I'm deciding for you — flagging them because the rubric explicitly grades on "una estructura de elementos relacionados," and each one affects whether the museum reads as one connected system or as 13 separate dioramas):

1. **What connects the stations to each other.** A pillar-plus-particle-system at each stop satisfies "structure" at the station level, but the brief asks for relationships between elements, and a row of independent exhibits doesn't automatically read as a structure on its own. Worth deciding whether something is visible connecting station to station as you walk (a thread, a changing floor/ceiling motif, particles that migrate from one station's system into the next's) so the throughline itself carries the "relevo generacional" idea, not just each individual placard.
2. **Floor plan shape.** Worth deliberately avoiding a circular or spiral gallery layout — that would spatially reintroduce the exact device this project is meant to not import, just rebuilt in 3D instead of 2D. A straight hall, a branching path, or an ascending one all avoid that trap.
3. **Placard legibility.** Full-screen legibility on a large display is a hard requirement (rubric criterion 1). Worth deciding between a screen-space HUD overlay for the text (reliable, always legible, easy to sync to camera position, similar to ForumTEDTALK's copy layer) versus true in-world 3D text on the placard geometry (more immersive, harder to guarantee legibility at presentation scale and viewing distance).
4. **One engine or thirteen.** ForumTEDTALK's reusability trick was one parameterized engine reading 13 small config objects. The museum could do the same (one station-particle-system class, 13 configs) or genuinely bespoke code per station, which is heavier but matches "worked on iteratively" if each station is meant to feel like its own distinct study. Worth naming which one before the second station gets built, since retrofitting from bespoke-per-station into a shared engine later is real rework.

## 6. Tooling: img2threejs

You mentioned `img2threejs` as a way to leverage generated 3D environments — worth being precise about what it actually does, since it's more specific than "build me a 3D scene." It's an open-source, agent-driven pipeline (runs as a Claude Code skill) that takes **one reference image of a single object** and reconstructs it as a procedural, code-only `THREE.Group` factory — primitives, procedural shaders, generated geometry, with pivots/sockets ready for animation. It's explicitly not photogrammetry and not a downloaded asset pack; it's "rebuild this specific object in code from a photo of it."

That makes it a good fit for individual props — a pillar, a placard frame, maybe a lighting fixture or a display case — each reconstructed from a reference photo. It's not built for reconstructing a whole environment (the museum shell: floor, walls, hallway, lighting layout) from a single image; that part still needs to be modeled directly, either by hand in Three.js or via a scene-level approach outside this tool's scope. Worth deciding which specific props (if any) you want built from reference images versus modeled directly, so Claude Code knows when to reach for the skill and when not to.

Install (as a Claude Code skill): `git clone https://github.com/img2threejs/img2threejs.git ~/.claude/skills/img2threejs`, then invoke with `/img2threejs` pointed at a reference image.

---

## 7. Working agreement for Claude Code (carried over from this project)

- Kiwi owns the creative and design decisions — the metaphor, what each station means, what changes narratively. Claude Code implements, scaffolds, and documents.
- Explicit approval gates before structural rewrites. Don't do speculative large refactors unprompted; incremental patches can be rejected in favor of a more fundamental change if that's what's called for, but that call is Kiwi's.
- Keep a running decisions log as the piece develops (one entry per real structural/narrative decision plus its rationale), mirroring the `decisions.md` / `DECISIONES_SISTEMA_VISUAL.md` convention above.
- No em dashes in generated docs, comments, or commit messages.

## 8. The client script, in full (source: TED_TALK_BRASIL.docx)

**SLIDE 1**
TEXTO: **RELEVO GENERACIONAL**: LA VENTAJA QUE NADIE ESTÁ APROVECHANDO
@centrodeeventosupb

**SLIDE 2**
TEXTO: ¿Un gran auditorio solo para hacer grados?
IMAGEN: Fotografía de una ceremonia de grados en Fórum (FOTO 1)

**SLIDE 3**
TEXTO: Los eventos no llegaron a la Universidad. **La Universidad decidió encontrarse con el mundo.**

**SLIDE 4**
TEXTO: Academia + Industria + Ciudad
(FOTO 2)

**SLIDE 5**
TEXTO: Los eventos nunca fueron el objetivo. **El impacto sí.**
(FOTO 3)

**SLIDE 6**
TEXTO: Un evento trae personas. Una **comunidad** trae **transformación**.

**SLIDE 7**
TEXTO: El talento crece a la velocidad de la **confianza**.

**SLIDE 8**
TEXTO: La **experiencia** construye el **camino**. Las nuevas generaciones descubren **nuevas rutas**.
(FOTO 4)

**SLIDE 9**
TEXTO: Una visión. **Dos generaciones.**

**SLIDE 10**
TEXTO: El **crecimiento** no ocurre cuando una generación reemplaza a otra. Ocurre cuando **trabajan juntas.**

**SLIDE 11**
TEXTO: Los jóvenes no son el futuro. Son el **presente** que muchas organizaciones aún no ven.

**SLIDE 12**
TEXTO: El **futuro** no se hereda. **Se construye.**
(FOTO 5)

**SLIDE 13** (FOTO 6)
QR con memorias (para móvil)
QR redes @centrodeeventosupb

---

## Appendix — sources consulted

- Unit page: https://juanferfranco.github.io/simulacion-2026-20/units/unit5/
- Client script: TED_TALK_BRASIL.docx (uploaded, reproduced in full in Section 8)
- ForumTEDTALK repo: https://github.com/juanferfranco/ForumTEDTALK
- ForumTEDTALK live: https://juanferfranco.github.io/ForumTEDTALK/
- ForumTEDTALK decisions doc: https://github.com/juanferfranco/ForumTEDTALK/blob/main/DECISIONES_SISTEMA_VISUAL.md
- ForumTEDTALK quick-changes guide: https://github.com/juanferfranco/ForumTEDTALK/blob/main/GUIA_CAMBIOS_RAPIDOS.md
- Memo Akten, *Forms*: https://memo.tv/projects/2011/forms/
- Nature of Code, ch. 4 (Particle Systems): https://natureofcode.com/particles/
- img2threejs: https://github.com/img2threejs/img2threejs
