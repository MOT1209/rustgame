---
name: composition
description: Shapes RustGame scenes for instant readability — focal point, foreground/midground/background, rule of thirds, leading lines, framing, value hierarchy, silhouette and sightline control — verified from the camera at player eye height. Use when reviewing, blocking or fixing how a scene reads, or when the user mentions composition, focal point, hierarchy, framing, leading lines, silhouette, depth, clutter, symmetry, readability or sightline.
---

# composition

## Purpose
Make every environment readable in one glance: the eye lands where gameplay wants it, depth is legible, and the scene stays clear at eye height 1.8 m — because in a game, readability outranks prettiness.

## When to use
- Reviewing or blocking any scene, vista, interior or landmark before and after `environment-art` and `lighting` passes.
- When a scene feels flat, cluttered, empty, confusing, or the player walks past the important thing.
- When a screenshot needs to be judged objectively rather than "it looks fine".

## Inputs
- The scene (`.blend` or in-game) plus its gameplay purpose: what must the player notice, avoid, and understand within 3 seconds?
- Player camera parameters: eye 1.8 m standing, 1.2 m crouched, game FOV (lens ~24 mm equivalent), movement direction and spawn/approach vectors.
- Reference frames with a deliberate composition to emulate or avoid, matched to the project art direction (`3d-art-director`).

## Workflow
1. **Define the read**: one sentence — "the player sees X first, then Y, then understands Z." If you cannot write it, the scene is not composed yet.
2. **Player camera**: add a camera at Z = 1.8, clip start 0.05, lens 24 mm; duplicate at Z = 1.2 for interiors and doorways. All checks are done through this camera, never through an arbitrary viewport angle.
3. **Focal point**: place the single dominant subject first (a burning vehicle, a lit doorway, a towering ruin). Block it with a primitive before any dressing exists.
4. **Rule of thirds**: Viewport Overlays -> Composition Guides -> Rule of Thirds; put the focal on an intersection line, not dead center — center only for intentional symmetry statements (and those are rare).
5. **Layer the depth**: verify foreground (0-5 m), midground (5-30 m), background (30 m+) overlap each other; overlap plus haze over distant `terrain` is the cheapest depth cue and costs nothing on mobile.
6. **Leading lines**: roads, fences, pipes, roof lines, light shafts must converge toward the focal. Check by screenshotting and tracing — if two strong lines exit the frame away from the focal, rotate or delete one.
7. **Framing**: use archways, doorways, broken walls, branches and vehicle hulks as a frame around the focal; model the frame from existing geometry, do not add a new asset for it.
8. **Value hierarchy**: render clay (single grey material, one light) and desaturate (Compositor -> Hue/Saturation/Value, Saturation 0). The lightest area of the frame must be the focal; if a white wall wins, darken it or brighten the subject.
9. **Silhouette check**: render the focal with a flat black material over a white background — it must be identifiable without interior detail.
10. **Color temperature separation**: warm focal against cool background (or reversed at night) — a 1500-2500 K difference is enough; verify with the light/material pass from `lighting`.
11. **Negative space and clutter audit**: keep at least one calm area covering ~20% of the frame; delete props that do not support the read — clustered detail, never evenly spread noise.
12. **Sightline control**: from spawn and from every main path, walk the camera forward and confirm the focal stays visible or is revealed deliberately; block dead-ends with value/contrast/vertical accents so the player knows where to go.
13. **Gameplay readability pass**: interactable/loot items must sit against a contrasting value and never inside a dark silhouette; hazards must be visible before the player is inside them.
14. **Record**: save the review frames per angle into the asset log for the checklist below.

## Rules
1. Gameplay readability trumps aesthetics — if a beautiful rock hides the exit, move the rock.
2. One focal per view; competing equals of interest cancel each other out.
3. Value hierarchy: lightest = most important. Color and contrast follow value, they do not replace it.
4. Depth is carried by overlap, scale reference and haze — not by adding more props.
5. No perfectly symmetrical layouts unless the location is institutional by nature (and even then, break it with decay).
6. No clutter noise: props cluster where people worked and rested; empty ground stays empty.
7. Everything is judged from eye height 1.8 m (and 1.2 m for interiors) at game FOV — a composition that only works from a cinematic angle does not exist.
8. Silhouettes of gameplay-critical elements must read against sky, ground and each other.

## Quality standards
- 3-second test: a fresh viewer names the subject and the intended next step without prompting.
- Clay/desaturated render: one clear brightest zone, three readable depth layers, focal on a thirds line.
- Focal silhouette identifiable in pure black-over-white.
- Walking the approach, the scene never presents two competing bright zones at once.
- No frame where the player can miss an exit, a threat or a loot source.

## Output
Marked-up review frames (player eye camera, 24 mm, Z = 1.8 / 1.2), a written read statement per view, and a fix list for `environment-art` / `lighting` (which props to move, which values to change).

## Validation
Render the review set from Blender:
`blender -b scene.blend -o //review/comp_#### -F PNG -f 0` (camera must be the eye-height one), plus
`blender -b scene.blend --python .blender/scripts/validate_asset.py -- --check camera` (asserts camera Z = 1.8 or 1.2, lens 24 mm, focal object in frame).
Manual checklist:
- [ ] Read statement written and confirmed by someone who did not build the scene
- [ ] Focal on a thirds intersection; rule-of-thirds overlay enabled during check
- [ ] Foreground/midground/background all present and overlapping in the frame
- [ ] Two or more leading lines reach the focal; no strong line exits away from it
- [ ] Clay + desaturated render: brightest zone = focal
- [ ] Black-over-white silhouette test passes for the focal
- [ ] Approaches walked at Z = 1.8 and 1.2: no missed exit/threat/loot, no dead empty frames
- [ ] Clutter clusters justified; one negative space area ~20% of frame
- [ ] Symmetry broken; values contrast; no two competing bright zones

## Common mistakes
- Composing from a free viewport angle the player can never occupy.
- Two or three "focal" subjects competing -> eye bounces, nothing is read.
- Detail added to fix a flat composition that needs value contrast instead.
- Judging with textures and lighting on -> cannot see the value hierarchy.
- Perfectly symmetric building frontage -> dead, unmotivated layout.
- Evenly distributed clutter -> noise that swallows gameplay cues.
- Leading lines that point off-frame or at each other instead of the subject.
- Skipping eye-height verification -> scene works in stills, fails while walking.
