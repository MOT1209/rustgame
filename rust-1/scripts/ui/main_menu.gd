extends Control
## Main menu screen. Starts the world scene.

const WORLD_SCENE := "res://scenes/world/world.tscn"

func _ready() -> void:
	%StartButton.pressed.connect(_on_start_pressed)

func _on_start_pressed() -> void:
	get_tree().change_scene_to_file(WORLD_SCENE)