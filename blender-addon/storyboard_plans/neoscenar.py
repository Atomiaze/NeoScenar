# SPDX-License-Identifier: GPL-3.0-or-later
"""Import d'un découpage NeoScenar (paquet d'échange decoupage.json + vignettes/).

Format : Documentation/specs/format-echange-blender.md du dépôt NeoScenar.
Le projet storyboard est construit avec les fonctions habituelles de l'extension
(scène modèle, scène de montage, création de plans), puis enregistré sous `targetBlend`.
"""

import json
import os
import shutil

import bpy

from . import utils

EXCHANGE_FORMAT = "neoscenar-blender"
EXCHANGE_VERSION = 1
TEMPLATE_NAME = "Modele"
DEFAULT_DURATION_SECONDS = 2
DEFAULT_OBJECTS = {("Cube", 'MESH'), ("Light", 'LIGHT'), ("Camera", 'CAMERA')}
CAMERA_SEPARATOR = " · "
THUMBNAILS_FOLDER = "vignettes"
# La vignette est placée tout au fond du champ de la caméra : le dessin et les objets de la
# scène passent toujours devant.
THUMBNAIL_DEPTH = 0.9


# ---------------------------------------------------------------------------
# Lecture et vérifications
# ---------------------------------------------------------------------------

def read_package(filepath):
    """Contenu vérifié de decoupage.json ; SBError au message clair sinon."""
    try:
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, UnicodeDecodeError, ValueError):
        raise utils.SBError("Le fichier %s est illisible : choisissez le decoupage.json "
                            "exporté par NeoScenar." % os.path.basename(filepath))
    if not isinstance(data, dict) or data.get("format") != EXCHANGE_FORMAT:
        raise utils.SBError("Ce fichier n'est pas un découpage exporté par NeoScenar.")
    version = data.get("formatVersion")
    if not isinstance(version, int) or version < 1:
        raise utils.SBError("Ce découpage NeoScenar est incomplet (formatVersion).")
    if version > EXCHANGE_VERSION:
        raise utils.SBError("Ce découpage vient d'une version plus récente de NeoScenar : "
                            "mettez à jour l'extension Storyboard.")
    try:
        _check_structure(data)
    except (KeyError, TypeError, ValueError):
        raise utils.SBError("Ce découpage NeoScenar est incomplet ou abîmé : exportez-le à nouveau.")
    return data


def _check_structure(data):
    settings = data["settings"]
    for key in ("width", "height", "fps"):
        if not isinstance(settings[key], int) or settings[key] < 1:
            raise ValueError(key)
    if not isinstance(data["targetBlend"], str) or not data["targetBlend"]:
        raise ValueError("targetBlend")
    for scene in data["scenes"]:
        str(scene["label"])
        for shot in scene["shots"]:
            if utils.parse_plan_name(shot["fullLabel"], utils.NAMING_NEOSCENAR) is None:
                raise ValueError(shot["fullLabel"])
            frames = shot["durationFrames"]
            if frames is not None and (not isinstance(frames, int) or frames < 1):
                raise ValueError("durationFrames")


def target_path(filepath, data):
    """Chemin absolu du .blend visé (targetBlend est relatif à decoupage.json)."""
    folder = os.path.dirname(os.path.abspath(filepath))
    return os.path.normpath(os.path.join(folder, *data["targetBlend"].split("/")))


def check_can_import(filepath, data):
    """Fichier courant vide de tout storyboard, .blend visé encore libre."""
    if utils.get_edit_scene() is not None or any(utils.is_plan(s) for s in bpy.data.scenes):
        raise utils.SBError("Ce fichier contient déjà un storyboard. Importez dans un nouveau "
                            "fichier (Fichier > Nouveau > Général).")
    target = target_path(filepath, data)
    if os.path.exists(target):
        raise utils.SBError("Le fichier %s existe déjà : rien n'a été fait, pour ne pas écraser "
                            "le travail fait dans Blender. Exportez à nouveau depuis NeoScenar "
                            "avec un autre nom." % target)
    return target


# ---------------------------------------------------------------------------
# Construction
# ---------------------------------------------------------------------------

def _move_to_master_collection(scene, ob):
    if ob.name not in scene.collection.objects:
        scene.collection.objects.link(ob)
    for coll in scene.collection.children_recursive:
        if ob.name in coll.objects:
            coll.objects.unlink(ob)


def prepare_template(scene, settings):
    """La scène courante devient la scène modèle « Modele », au format du projet."""
    scene.name = TEMPLATE_NAME
    r = scene.render
    r.resolution_x = settings["width"]
    r.resolution_y = settings["height"]
    r.resolution_percentage = 100
    r.fps = settings["fps"]
    r.fps_base = 1.0
    scene.frame_start = 1
    scene.frame_end = DEFAULT_DURATION_SECONDS * settings["fps"]
    scene.frame_current = 1
    if {(o.name, o.type) for o in scene.objects} == DEFAULT_OBJECTS:
        cube = bpy.data.objects["Cube"]
        mesh = cube.data
        bpy.data.objects.remove(cube)
        if mesh is not None and mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    cam = scene.camera if scene.camera is not None and scene.camera.type == 'CAMERA' else None
    if cam is None:
        cam = next((o for o in scene.objects if o.type == 'CAMERA'), None)
    if cam is None:
        cam = bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
        cam.location = (7.3589, -6.9258, 4.9583)  # position de la caméra du fichier par défaut
        cam.rotation_euler = (1.1093, 0.0, 0.8149)
    # dans la Scene Collection : jamais partagée entre les plans, quel que soit le mode de copie
    _move_to_master_collection(scene, cam)
    scene.camera = cam
    # Vignettes affichées telles quelles : couleurs sans transformation (au lieu d'AgX), et
    # aperçu Solid du Sequencer (animatique) avec textures et sans ombrage. Les plans,
    # copiés de ce modèle, héritent de ces réglages.
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.display.shading.light = 'FLAT'
    scene.display.shading.color_type = 'TEXTURE'
    return scene


def _blender_relpath(path, start_dir):
    """Chemin relatif au style Blender (« //… »), avec des « / »."""
    rel = os.path.relpath(path, start_dir)
    return "//" + rel.replace(os.sep, "/")


def notes_text(scene_data, shot, note_camera):
    """Notes détaillées lisibles du plan."""
    heading = scene_data.get("heading") or ""
    scene_line = " — ".join(x for x in (scene_data["label"], heading, scene_data.get("name") or "") if x)
    lines = [
        "# Notes %s" % shot["fullLabel"],
        "",
        "Plan : %s" % (shot.get("name") or ""),
        "Scène : %s" % scene_line,
        "Musique : %s" % (shot.get("music") or ""),
        "",
        "Action : %s" % (shot.get("description") or ""),
        "Dialogue : %s" % (shot.get("sounds") or ""),
        "Caméra : %s" % note_camera,
        "",
    ]
    return "\n".join(lines)


def fill_plan(scene, scene_data, shot):
    """Statut (déjà le premier), identifiants et notes d'un plan importé."""
    p = scene.sb_plan
    p.neoscenar_shot_id = shot.get("id") or ""
    p.neoscenar_scene_id = scene_data.get("id") or ""
    p.note_action = shot.get("description") or ""
    p.note_dialogue = shot.get("sounds") or ""
    p.note_camera = CAMERA_SEPARATOR.join(
        x for x in (shot.get("scale"), shot.get("movement"), shot.get("angle")) if x)
    name = "Notes_%s" % scene.name
    txt = bpy.data.texts.get(name) or bpy.data.texts.new(name)
    txt.from_string(notes_text(scene_data, shot, p.note_camera))
    p.notes_text = txt


# ---------------------------------------------------------------------------
# Vignettes
# ---------------------------------------------------------------------------

def camera_frame(scene, cam, distance):
    """Les 4 coins du champ de la caméra à `distance` devant elle, dans le repère de la caméra.
    Blender les calcule lui-même (focale, capteur et son ajustement, décalage, format)."""
    corners = cam.data.view_frame(scene=scene)
    if cam.data.type == 'ORTHO':
        return [(c.x, c.y, -distance) for c in corners]
    scale = distance / abs(corners[0].z)
    return [(c.x * scale, c.y * scale, -distance) for c in corners]


def _thumbnail_material(name, image):
    """Matériau non éclairé : l'image telle quelle, quelle que soit la lumière."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.extension = 'EXTEND'  # pas de mosaïque : les bords ne se mélangent pas au bord opposé
    tex.location = (-400, 0)
    emit = nodes.new("ShaderNodeEmission")
    emit.location = (-150, 0)
    out = nodes.new("ShaderNodeOutputMaterial")
    out.location = (100, 0)
    links = mat.node_tree.links
    links.new(tex.outputs["Color"], emit.inputs["Color"])
    links.new(emit.outputs["Emission"], out.inputs["Surface"])
    nodes.active = tex  # image montée en mode Solid « Texture »
    return mat


def add_thumbnail(scene, image_path):
    """Plan 3D <plan>_Vignette portant l'image, rattaché à la caméra du plan et remplissant
    exactement son champ, dans la collection <plan>_Vignette du plan."""
    cam = scene.camera
    if cam is None or cam.type != 'CAMERA':
        raise utils.SBError("Le plan %s n'a pas de caméra pour sa vignette." % scene.name)
    name = "%s_Vignette" % scene.name
    image = bpy.data.images.load(image_path, check_existing=True)
    image.name = os.path.basename(image_path)

    distance = cam.data.clip_end * THUMBNAIL_DEPTH
    corners = camera_frame(scene, cam, distance)
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(corners, [], [(0, 1, 2, 3)])
    uv = mesh.uv_layers.new(name="UVMap")
    for loop in mesh.loops:
        x, y, _z = corners[loop.vertex_index]
        uv.data[loop.index].uv = (1.0 if x > 0 else 0.0, 1.0 if y > 0 else 0.0)
    # la face doit regarder la caméra (vers +Z dans le repère de la caméra)
    if mesh.polygons[0].normal.z < 0:
        mesh.flip_normals()
    mesh.materials.append(_thumbnail_material(name, image))

    ob = bpy.data.objects.new(name, mesh)
    ob.parent = cam  # suit la caméra ; coins calculés dans son repère
    ob.hide_select = True  # jamais déplacée par erreur
    ob.visible_shadow = False
    coll = bpy.data.collections.new(name)
    scene.collection.children.link(coll)
    coll.objects.link(ob)
    scene.sb_plan.thumbnail_collection = coll
    return ob


def copy_thumbnail(json_dir, blend_dir, shot):
    """Copie la vignette du paquet dans vignettes/ à côté du .blend ; None si absente."""
    if not shot.get("thumbnail"):
        return None
    source = os.path.join(json_dir, *shot["thumbnail"].split("/"))
    if not os.path.isfile(source):
        return None
    folder = os.path.join(blend_dir, THUMBNAILS_FOLDER)
    os.makedirs(folder, exist_ok=True)
    target = os.path.join(folder, "%s.png" % shot["fullLabel"])
    shutil.copyfile(source, target)
    return target


def show_textures_in_3d_views():
    """Mode Solid des vues 3D : textures affichées, pour voir la vignette par la caméra."""
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.shading.color_type = 'TEXTURE'


def scene_marker_name(scene_data):
    title = scene_data.get("heading") or scene_data.get("name") or ""
    return "%s — %s" % (scene_data["label"], title) if title else scene_data["label"]


def show_edit_scene(context, edit):
    """Affiche la scène de montage, avec un Sequencer à la place de la Timeline si besoin."""
    win = context.window or utils._window()
    if win is None:
        return
    win.scene = edit
    utils.set_viewports_camera(win)
    areas = win.screen.areas
    if any(a.type == 'SEQUENCE_EDITOR' for a in areas):
        return
    for area in areas:
        if area.type == 'DOPESHEET_EDITOR' and area.ui_type == 'TIMELINE':
            area.ui_type = 'SEQUENCE_EDITOR'
            return


class _Progress:
    def __init__(self, total):
        self.wm = bpy.context.window_manager
        self.total = max(total, 1)
        if self.wm is not None:
            self.wm.progress_begin(0, self.total)

    def update(self, value):
        if self.wm is not None:
            self.wm.progress_update(value)

    def end(self):
        if self.wm is not None:
            self.wm.progress_end()


def import_package(context, filepath):
    """Construit le projet storyboard et l'enregistre. Retourne le message de fin."""
    filepath = os.path.abspath(filepath)
    data = read_package(filepath)
    target = check_can_import(filepath, data)
    shots = [(sc, sh) for sc in data["scenes"] for sh in sc["shots"]]

    win = context.window or utils._window()
    template = prepare_template(win.scene if win is not None else context.scene, data["settings"])
    edit, _cam = utils.create_edit_scene(template)
    st = edit.sb_settings
    st.naming_mode = utils.NAMING_NEOSCENAR
    st.neoscenar_project_id = data["project"].get("id") or ""
    st.neoscenar_source = _blender_relpath(filepath, os.path.dirname(target))

    json_dir = os.path.dirname(filepath)
    blend_dir = os.path.dirname(target)
    progress = _Progress(len(shots))
    try:
        first_frames = {}
        for i, (scene_data, shot) in enumerate(shots):
            scene = utils.create_plan_scene(context, edit, shot["fullLabel"], shot["durationFrames"])
            fill_plan(scene, scene_data, shot)
            image = copy_thumbnail(json_dir, blend_dir, shot)
            if image is not None:
                add_thumbnail(scene, image)
            strip = utils.add_plan_strip(edit, scene, utils.plans_end(edit))
            first_frames.setdefault(scene_data["label"], (scene_data, strip.frame_final_start))
            progress.update(i + 1)
    finally:
        progress.end()

    for scene_data, frame in first_frames.values():
        edit.timeline_markers.new(scene_marker_name(scene_data), frame=frame)
    utils.update_edit_range(edit)
    show_textures_in_3d_views()
    show_edit_scene(context, edit)

    os.makedirs(os.path.dirname(target), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=target, relative_remap=True)
    bpy.ops.file.make_paths_relative()
    bpy.ops.wm.save_mainfile()

    n_scenes = len(data["scenes"])
    return "%d plan%s importé%s dans %d scène%s." % (
        len(shots), "s" if len(shots) > 1 else "", "s" if len(shots) > 1 else "",
        n_scenes, "s" if n_scenes > 1 else "")
