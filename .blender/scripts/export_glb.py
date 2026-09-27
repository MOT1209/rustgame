#!/usr/bin/env python
"""Validated GLB export for RustGame.

    blender.exe --background file.blend --python export_glb.py -- \
        --object SM_Crate_A --output ../../public/assets/models/SM_Crate_A.glb

Runs validate_asset.py first; refuses to export on FAIL unless --force.
"""
import argparse
import os
import subprocess
import sys

import bpy


def die(code=0, msg=""):
    """Blender swallows sys.exit() in --background mode; force the code out."""
    if msg:
        print(msg, file=sys.stderr)
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(code)

HERE = os.path.dirname(os.path.abspath(__file__))
VALIDATOR = os.path.join(HERE, "validate_asset.py")


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--object", required=True, help="object or collection to export")
    p.add_argument("--output", required=True, help="destination .glb path")
    p.add_argument("--budget", type=int, default=1500)
    p.add_argument("--require-lod", action="store_true")
    p.add_argument("--require-collision", action="store_true")
    p.add_argument("--force", action="store_true", help="export even if validation FAILs")
    p.add_argument("--apply-transforms", action="store_true", default=True)
    p.add_argument("--draco", action="store_true",
                   help="needs the meshopt/Draco decoder wired into GLTFLoader")
    return p.parse_args(argv)


def select_target(name):
    bpy.ops.object.select_all(action="DESELECT")
    if name in bpy.data.objects:
        obj = bpy.data.objects[name]
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        return "OBJECT", obj
    if name in bpy.data.collections:
        col = bpy.data.collections[name]
        for o in col.all_objects:
            if o.name in bpy.context.view_layer.objects:
                o.select_set(True)
                if o.type == "MESH":
                    bpy.context.view_layer.objects.active = o
        return "COLLECTION", col
    die(1, "target '%s' not found in scene" % name)


def validate(args):
    cmd = [bpy.app.binary_path, "--background", bpy.data.filepath,
           "--python", VALIDATOR, "--",
           "--object", args.object, "--budget", str(args.budget)]
    if args.require_lod:
        cmd.append("--require-lod")
    if args.require_collision:
        cmd.append("--require-collision")
    proc = subprocess.run(cmd, capture_output=True, text=True)
    print(proc.stdout)
    if proc.returncode != 0:
        print(proc.stderr, file=sys.stderr)
        if not args.force:
            die(1, "validation FAILED — fix the asset or pass --force")
        print("!! validation FAILED but --force given — exporting anyway")
    return proc.returncode


def export(args, selection_type):
    out = os.path.abspath(args.output)
    os.makedirs(os.path.dirname(out), exist_ok=True)

    kwargs = dict(
        filepath=out,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=args.apply_transforms,
        export_materials="EXPORT",
        export_texture_dir="",
        export_extras=True,
        export_cameras=False,
        export_lights=False,
        export_animations=(args.object.startswith("SK_")),
        export_skins=(args.object.startswith("SK_")),
    )
    if args.draco:
        try:
            kwargs.update(export_draco=True, export_draco_mesh_compression_level=6)
        except TypeError:
            print("!! Draco not supported by this Blender build — exporting uncompressed")

    if selection_type == "COLLECTION":
        bpy.ops.export_scene.gltf(**kwargs)
    else:
        bpy.ops.export_scene.gltf(**kwargs)

    size = os.path.getsize(out)
    print("EXPORTED %s (%.1f KB)" % (out, size / 1024.0))
    if size > 8 * 1024 * 1024:
        print("!! warning: GLB over 8 MB — check texture budget / LOD")
    if size == 0:
        die(1, "export produced an empty file")


def main():
    args = parse_args()
    if not bpy.data.is_saved:
        die(1, "save the .blend before exporting")
    validate(args)
    selection_type, _ = select_target(args.object)
    export(args, selection_type)
    print("EXPORT_OK")


if __name__ == "__main__":
    main()
