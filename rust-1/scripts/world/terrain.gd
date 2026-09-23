extends Node3D
## Procedural terrain (Phase 3). Generates a heightmap via FastNoiseLite FBM,
## matching the web version's terrain feel but in Godot.

@export var size := 200.0
@export var segments := 64
@export var height_scale := 4.0
@export var noise_scale := 0.06
@export var octaves := 4
@export var seed_value := 1337

var noise := FastNoiseLite.new()
var terrain_mesh: ArrayMesh
var terrain_shape: ConcavePolygonShape3D

func _ready() -> void:
	noise.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	noise.fractal_octaves = octaves
	noise.frequency = noise_scale
	noise.seed = seed_value
	_generate()

func _generate() -> void:
	var half := size * 0.5
	var step := size / segments

	var surface_tool := SurfaceTool.new()
	surface_tool.begin(Mesh.PRIMITIVE_TRIANGLES)

	for z in segments + 1:
		for x in segments + 1:
			var px := -half + x * step
			var pz := -half + z * step
			surface_tool.add_vertex(Vector3(px, _height_at(px, pz), pz))

	for z in segments:
		for x in segments:
			var i := z * (segments + 1) + x
			surface_tool.add_index(i + (segments + 1))
			surface_tool.add_index(i)
			surface_tool.add_index(i + 1)
			surface_tool.add_index(i + (segments + 1))
			surface_tool.add_index(i + 1)
			surface_tool.add_index(i + (segments + 1) + 1)

	surface_tool.generate_normals()
	terrain_mesh = surface_tool.commit()
	terrain_mesh.surface_set_material(0, _build_material())

	var mesh_instance := MeshInstance3D.new()
	mesh_instance.name = "TerrainMesh"
	mesh_instance.mesh = terrain_mesh
	add_child(mesh_instance)

	terrain_shape = ConcavePolygonShape3D.new()
	var faces := PackedVector3Array()
	for z in segments:
		for x in segments:
			var i := z * (segments + 1) + x
			var a := -half + (x) * step
			var b := -half + (z) * step
			var c := -half + (x + 1) * step
			var d := -half + (z + 1) * step
			var v00 := Vector3(a, _height_at(a, b), b)
			var v10 := Vector3(c, _height_at(c, b), b)
			var v11 := Vector3(c, _height_at(c, d), d)
			var v01 := Vector3(a, _height_at(a, d), d)
			faces.push_back(v00)
			faces.push_back(v10)
			faces.push_back(v11)
			faces.push_back(v00)
			faces.push_back(v11)
			faces.push_back(v01)
	terrain_shape.set_faces(faces)

	var body := StaticBody3D.new()
	body.name = "TerrainBody"
	body.collision_layer = 1
	body.collision_mask = 1
	var collision := CollisionShape3D.new()
	collision.shape = terrain_shape
	body.add_child(collision)
	add_child(body)

func _height_at(x: float, z: float) -> float:
	return noise.get_noise_2d(x, z) * height_scale

func _build_material() -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.36, 0.44, 0.28, 1)
	mat.roughness = 1.0
	return mat

func height_at(x: float, z: float) -> float:
	return _height_at(x, z)