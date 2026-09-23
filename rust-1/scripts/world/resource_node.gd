extends StaticBody3D
## Harvestable resource node (Phase 5): tree or rock.
## Types add inventory on gather, then get consumed over hits.

enum Kind { TREE, ROCK }

@export var kind: Kind = Kind.TREE

var hits_left := 3
var drops: Dictionary = {}

const TREE_DROPS := {"wood": 3}
const ROCK_DROPS := {"stone": 2}

@onready var mesh_root: Node3D = $MeshRoot

func _ready() -> void:
	drops = TREE_DROPS if kind == Kind.TREE else ROCK_DROPS
	hits_left = 3 if kind == Kind.TREE else 4
	_build_mesh()

func _build_mesh() -> void:
	for child in mesh_root.get_children():
		child.queue_free()
	if kind == Kind.TREE:
		_build_tree()
	else:
		_build_rock()

func _add_box(parent: Node3D, size: Vector3, pos: Vector3, color: Color) -> void:
	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mi.mesh = mesh
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.9
	mi.material_override = mat
	mi.position = pos
	parent.add_child(mi)

func _build_tree() -> void:
	var trunk_scale := 1.0 - float(hits_left - 1) / 3.0 * 0.5
	_add_box(mesh_root, Vector3(0.4 * trunk_scale, 1.6 * trunk_scale, 0.4 * trunk_scale), Vector3(0, 0.8 * trunk_scale, 0), Color(0.42, 0.3, 0.16))
	var foliage_scale := 1.0 - float(hits_left - 1) / 3.0 * 0.4
	_add_box(mesh_root, Vector3(1.6 * foliage_scale, 1.4 * foliage_scale, 1.6 * foliage_scale), Vector3(0, 2.2 * foliage_scale, 0), Color(0.2, 0.45, 0.15))

func _build_rock() -> void:
	var scale := 1.0 - float(hits_left - 1) / 4.0 * 0.5
	_add_box(mesh_root, Vector3(1.4 * scale, 1.2 * scale, 1.4 * scale), Vector3(0, 0.6 * scale, 0), Color(0.5, 0.5, 0.52))

func gather(power: int = 1) -> Dictionary:
	hits_left -= power
	_build_mesh()
	if hits_left <= 0:
		var label := "Tree" if kind == Kind.TREE else "Rock"
		GameEvents.show_message(label + " harvested.")
		queue_free()
		return drops
	return drops