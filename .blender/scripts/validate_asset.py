#!/usr/bin/env python
"""Read-only asset validation for RustGame. Run headless:

    blender.exe --background file.blend --python validate_asset.py -- \
        --object SM_Crate_A --budget 1500 --report report.json

Exit code 0 = PASS/WARN, 1 = FAIL. Never mutates the scene.
"""
import argparse
import json
import math
import os
import re
import sys

import bpy


def die(code):
    """Blender swallows sys.exit() in --background mode; force the code out."""
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(code)

PREFIXES = {
    "SM_": "static", "SK_": "skinned", "T_": "texture",
    "M_": "material", "UCX_": "collision",
}
NAME_RE = re.compile(r"^(SM_|SK_|T_|M_|UCX_)[A-Za-z0-9_]+$")
TEX_SUFFIXES = ("_BC", "_N", "_R", "_M", "_AO", "_H", "_E", "_ORM")
POT = (256, 512, 1024, 2048, 4096)
HERO_HINTS = ("viewmodel", "weapon", "hero", "player", "firstperson")
COLLECTION_NAMES = ("COLLISION", "LOD", "HIDDEN")


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--object", default="", help="object name or collection")
    p.add_argument("--budget", type=int, default=1500, help="max triangles")
    p.add_argument("--max-texture", type=int, default=1024)
    p.add_argument("--max-materials", type=int, default=2)
    p.add_argument("--require-lod", action="store_true")
    p.add_argument("--require-collision", action="store_true")
    p.add_argument("--report", default="")
    return p.parse_args(argv)


class Report:
    def __init__(self):
        self.findings = []

    def add(self, level, code, msg):
        self.findings.append({"level": level, "code": code, "message": msg})

    def ok(self, code, msg):
        self.add("PASS", code, msg)

    def warn(self, code, msg):
        self.add("WARNING", code, msg)

    def fail(self, code, msg):
        self.add("FAIL", code, msg)

    @property
    def failed(self):
        return any(f["level"] == "FAIL" for f in self.findings)

    @property
    def warned(self):
        return any(f["level"] == "WARNING" for f in self.findings)

    @property
    def verdict(self):
        if self.failed:
            return "FAIL"
        return "WARN" if self.warned else "PASS"


def gather(args):
    """Return (mesh_objects, collision_objects, all_objects)."""
    if args.object and args.object in bpy.data.objects:
        root = bpy.data.objects[args.object]
        objs = [root] + [c for c in root.children_recursive]
        meshes = [o for o in objs if o.type == "MESH"]
        cols = [o for o in meshes if o.name.startswith("UCX_")]
        return meshes, cols, objs
    if args.object and args.object in bpy.data.collections:
        col = bpy.data.collections[args.object]
        objs = list(col.all_objects)
        meshes = [o for o in objs if o.type == "MESH"]
        return meshes, [o for o in meshes if o.name.startswith("UCX_")], objs
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    return meshes, [o for o in meshes if o.name.startswith("UCX_")], list(bpy.data.objects)


def tris(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    me = obj.evaluated_get(dg).to_mesh()
    try:
        return sum(len(p.vertices) - 2 for p in me.polygons)
    finally:
        obj.evaluated_get(dg).to_mesh_clear()


def check_naming(rep, objs, meshes):
    bad = [o.name for o in objs if not NAME_RE.match(o.name)]
    if bad:
        rep.fail("NAME", "objects not following SM_/SK_/T_/M_/UCX_ naming: " + ", ".join(sorted(bad)))
    else:
        rep.ok("NAME", "all object names follow the convention")
    dups = [o.name for o in meshes if o.data.name != o.name]
    if dups:
        rep.warn("NAME", "object/mesh datablock names differ: " + ", ".join(sorted(dups)))


def check_transforms(rep, meshes):
    bad_scale, neg, unapplied = [], [], []
    for o in meshes:
        if tuple(round(v, 6) for v in o.scale) != (1.0, 1.0, 1.0):
            if any(abs(v - 1.0) > 1e-6 for v in o.scale):
                bad_scale.append("%s=%s" % (o.name, tuple(round(v, 4) for v in o.scale)))
        if any(v < 0 for v in o.scale):
            neg.append(o.name)
        if o.rotation_mode == "QUATERNION" or any(abs(a) > 1e-6 for a in o.rotation_euler):
            unapplied.append(o.name)
    if bad_scale:
        rep.fail("XFORM", "non-unit scale (apply transform): " + "; ".join(bad_scale))
    else:
        rep.ok("XFORM", "scale is (1,1,1) on every mesh")
    if neg:
        rep.fail("XFORM", "negative scale (mirrored normals): " + ", ".join(neg))
    if unapplied:
        rep.warn("XFORM", "rotation not applied: " + ", ".join(unapplied))


def check_scale(rep, meshes):
    for o in meshes:
        d = o.dimensions
        if not all(math.isfinite(v) for v in d) or max(d) <= 0:
            rep.fail("SCALE", "%s has degenerate dimensions %s" % (o.name, tuple(d)))
        elif max(d) > 500:
            rep.fail("SCALE", "%s is %s — wrong unit scale (expected meters)" % (o.name, tuple(round(v, 2) for v in d)))
        else:
            rep.ok("SCALE", "%s dims %.2f x %.2f x %.2f m" % (o.name, d.x, d.y, d.z))


def check_meshes(rep, meshes):
    import bmesh

    for o in meshes:
        me = o.data
        bm = bmesh.new()
        bm.from_mesh(me)
        try:
            non_manifold = sum(1 for e in bm.edges if not e.is_manifold)
            doubled = len(bm.verts) - len({v.co[:] for v in bm.verts})
            degenerate = sum(1 for f in bm.faces if len(f.verts) < 3)
        finally:
            bm.free()
        if non_manifold:
            rep.fail("MESH", "%s has %d non-manifold edges" % (o.name, non_manifold))
        if doubled > 0:
            rep.warn("MESH", "%s has ~%d doubled vertices" % (o.name, doubled))
        if degenerate:
            rep.fail("MESH", "%s has %d degenerate faces" % (o.name, degenerate))
        if not non_manifold and not doubled and not degenerate:
            rep.ok("MESH", "%s manifold, no loose/doubled verts" % o.name)


def check_normals(rep, meshes):
    for o in meshes:
        me = o.data
        me.update()
        flipped = 0
        for p in me.polygons:
            if p.normal.length < 1e-6:
                flipped += 1
        if flipped:
            rep.fail("NORMAL", "%s has %d zero-length normals" % (o.name, flipped))
        else:
            rep.ok("NORMAL", "%s normals valid" % o.name)


def check_uv(rep, meshes):
    for o in meshes:
        uvs = o.data.uv_layers
        if not uvs:
            rep.fail("UV", "%s has no UV map" % o.name)
            continue
        if len(uvs) > 1:
            rep.warn("UV", "%s has %d UV maps (%s)" % (o.name, len(uvs), uvs.active.name))
        uv = uvs.active.data
        outside = sum(1 for d in uv
                      if d.uv.x < -0.01 or d.uv.x > 1.01 or d.uv.y < -0.01 or d.uv.y > 1.01)
        if outside:
            rep.fail("UV", "%s has %d loops outside the 0-1 space" % (o.name, outside))
        else:
            rep.ok("UV", "%s UV inside 0-1" % o.name)


def check_materials(rep, meshes, args):
    for o in meshes:
        mats = [m for m in o.data.materials if m is not None]
        if not mats:
            rep.fail("MAT", "%s has no material" % o.name)
            continue
        if len(mats) > args.max_materials:
            rep.fail("MAT", "%s uses %d materials (max %d)" % (o.name, len(mats), args.max_materials))
        else:
            rep.ok("MAT", "%s uses %d material(s)" % (o.name, len(mats)))
        for m in mats:
            for n in m.node_tree.nodes if m.node_tree else []:
                if n.type == "TEX_IMAGE" and n.image and n.image.source == "FILE":
                    name = n.image.name
                    srgb = bool(n.image.colorspace_settings.name == "sRGB")
                    if name.endswith("_N") and srgb:
                        rep.fail("MAT", "%s: %s is normal map but uses sRGB (must be Non-Color)" % (m.name, name))
                    if name.endswith("_BC") and not srgb:
                        rep.warn("MAT", "%s: %s base colour is not sRGB" % (m.name, name))
    unused = [m.name for m in bpy.data.materials if m.users == 0]
    if unused:
        rep.warn("MAT", "unused materials in file: " + ", ".join(unused))


def check_textures(rep, meshes, args):
    hero = any(h in m.lower() for m in ([o.name.lower() for o in meshes]) for h in HERO_HINTS)
    limit = max(args.max_texture, 2048) if hero else args.max_texture
    seen = set()
    for o in meshes:
        for slot in o.data.materials:
            if not slot or not slot.node_tree:
                continue
            for n in slot.node_tree.nodes:
                if n.type != "TEX_IMAGE" or not n.image or n.image.name in seen:
                    continue
                seen.add(n.image.name)
                w, h = n.image.size
                if w not in POT or h not in POT:
                    rep.fail("TEX", "%s is %dx%d — not power-of-two" % (n.image.name, w, h))
                elif max(w, h) > limit:
                    rep.fail("TEX", "%s is %dx%d over the %dpx budget" % (n.image.name, w, h, limit))
                else:
                    rep.ok("TEX", "%s %dx%d within budget" % (n.image.name, w, h))
                if n.image.packed_file is None and n.image.filepath and not bpy.path.abspath(n.image.filepath).replace("\\", "/").startswith("//"):
                    rep.warn("TEX", "%s is an external absolute path — pack it" % n.image.name)
    if not seen:
        rep.warn("TEX", "no image textures found on this asset")


def check_tris(rep, meshes, args):
    total = 0
    for o in meshes:
        if o.name.startswith("UCX_"):
            t = tris(o)
            if t > 64:
                rep.fail("COL", "%s collision mesh is %d tris (max 64)" % (o.name, t))
            continue
        t = tris(o)
        total += t
    if total > args.budget * 1.2:
        rep.fail("TRI", "%d tris over budget %d" % (total, args.budget))
    elif total > args.budget:
        rep.warn("TRI", "%d tris over budget %d" % (total, args.budget))
    else:
        rep.ok("TRI", "%d tris within budget %d" % (total, args.budget))


def check_lod(rep, all_objects, args):
    names = {o.name for o in all_objects}
    lods = {n for n in names if re.search(r"_LOD\d$", n)}
    if not lods and (args.require_lod or len(names) > 1):
        if args.require_lod:
            rep.fail("LOD", "no _LOD0..n chain found")
        else:
            rep.warn("LOD", "no LOD variants (qualifying assets need them)")
    elif lods:
        rep.ok("LOD", "LOD chain: " + ", ".join(sorted(lods)))
    # pivot consistency across LODs
    bases = {}
    for n in lods:
        base = re.sub(r"_LOD\d$", "", n)
        bases.setdefault(base, []).append(n)
    for base, group in bases.items():
        if len(group) < 2:
            rep.warn("LOD", "%s has a single LOD level" % base)
            continue
        origins = {bpy.data.objects[n].location[:] for n in group}
        if len(origins) > 1:
            rep.fail("LOD", "%s LODs do not share an origin — they will pop" % base)
        else:
            rep.ok("LOD", "%s LOD origins match" % base)


def check_collision(rep, collision, all_objects, args):
    if not collision:
        rep.fail("COL", "no UCX_ collision object") if args.require_collision else rep.warn("COL", "no UCX_ collision object")
        return
    for c in collision:
        rep.ok("COL", "%s present (%d tris)" % (c.name, tris(c)))


def check_hygiene(rep, all_objects):
    hidden = [o.name for o in all_objects if o.hide_render or o.hide_viewport]
    if hidden:
        rep.fail("HIDDEN", "hidden objects will export: " + ", ".join(sorted(hidden)))
    else:
        rep.ok("HIDDEN", "no hidden objects")
    loose_meshes = [d.name for d in bpy.data.meshes if d.users == 0]
    if loose_meshes:
        rep.warn("HIDDEN", "orphan mesh data: " + ", ".join(loose_meshes))
    for o in all_objects:
        mods = [m.name for m in o.modifiers if not m.show_render]
        if mods:
            rep.warn("MOD", "%s has disabled modifiers: %s" % (o.name, ", ".join(mods)))


def check_skin(rep, all_objects):
    for o in all_objects:
        if o.type != "MESH" or not o.vertex_groups:
            continue
        me = o.data
        over = 0
        for v in me.vertices:
            if sum(1 for g in v.groups if g.weight > 0.001) > 4:
                over += 1
        if over:
            rep.fail("SKIN", "%s: %d vertices exceed 4 influences" % (o.name, over))
        else:
            rep.ok("SKIN", "%s ≤4 influences per vertex" % o.name)
    arm = [o for o in all_objects if o.type == "ARMATURE"]
    for a in arm:
        n = len(a.data.bones)
        if n > 70:
            rep.fail("SKIN", "%s has %d bones (max 70)" % (a.name, n))
        else:
            rep.ok("SKIN", "%s has %d bones" % (a.name, n))


def main():
    args = parse_args()
    rep = Report()
    meshes, collision, all_objects = gather(args)
    meshes = [m for m in meshes if not m.name.startswith("UCX_")]

    if not meshes:
        rep.fail("MESH", "no mesh objects found for target '%s'" % (args.object or "<file>"))
    else:
        check_naming(rep, all_objects, meshes)
        check_transforms(rep, meshes)
        check_scale(rep, meshes)
        check_meshes(rep, meshes)
        check_normals(rep, meshes)
        check_uv(rep, meshes)
        check_materials(rep, meshes, args)
        check_textures(rep, meshes, args)
        check_tris(rep, meshes, args)
        check_lod(rep, all_objects, args)
        check_collision(rep, collision, all_objects, args)
        check_hygiene(rep, all_objects)
        check_skin(rep, all_objects)

    order = {"FAIL": 0, "WARNING": 1, "PASS": 2}
    for f in sorted(rep.findings, key=lambda f: (order[f["level"]], f["code"])):
        print("[%s] %-8s %s" % (f["level"], f["code"], f["message"]))

    counts = {k: sum(1 for f in rep.findings if f["level"] == k)
              for k in ("FAIL", "WARNING", "PASS")}
    print("\n%d fail / %d warning / %d pass" % (counts["FAIL"], counts["WARNING"], counts["PASS"]))
    print("RESULT: %s" % rep.verdict)

    if args.report:
        with open(args.report, "w", encoding="utf-8") as fh:
            json.dump({"verdict": rep.verdict, "findings": rep.findings,
                       "counts": counts}, fh, indent=2)

    die(1 if rep.failed else 0)


if __name__ == "__main__":
    main()
