# SPDX-License-Identifier: GPL-3.0-or-later
"""Interface : onglet « Storyboard » dans la barre latérale du Sequencer et de la vue 3D."""

import bpy

from . import utils
from .operators import check

_strip_cache = {}


def _fps(scene):
    return scene.render.fps / scene.render.fps_base


def fmt_duration(frames, scene):
    sec = frames / _fps(scene)
    return "%d im · %.1f s" % (frames, sec)


def fmt_mmss(frames, scene):
    sec = int(round(frames / _fps(scene)))
    return "%02d:%02d" % (sec // 60, sec % 60)


def camera_count(scene):
    coll = scene.sb_plan.cameras_collection
    if coll is None:
        return 0
    return sum(1 for o in coll.all_objects if o.type == 'CAMERA')


# ---------------------------------------------------------------------------
# Liste des plans
# ---------------------------------------------------------------------------

class SB_UL_plans(bpy.types.UIList):
    """Plans du film dans l'ordre du montage"""
    bl_idname = "SB_UL_plans"

    def draw_item(self, context, layout, data, item, icon, active_data, active_propname, index):
        sc = item
        strip = _strip_cache.get(sc.name)
        row = layout.row(align=True)
        row.prop(sc.sb_plan, "status", text="", icon_only=True, emboss=False)
        split = row.split(factor=0.38, align=True)
        split.label(text=sc.name if strip else sc.name + " (hors montage)")
        sub = split.split(factor=0.62, align=True)
        frames = strip.frame_final_duration if strip else utils.useful_duration(sc)
        sub.label(text=fmt_duration(frames, sc))
        sub.label(text=str(camera_count(sc)), icon='OUTLINER_OB_CAMERA')
        op = row.operator("sb.open_plan", text="", icon='FORWARD', emboss=False)
        op.plan = sc.name

    def filter_items(self, context, data, propname):
        scenes = getattr(data, propname)
        edit = utils.get_edit_scene()
        _strip_cache.clear()
        order = {}
        if edit is not None:
            for s in utils.plan_strips(edit):
                if s.scene.name not in _strip_cache:
                    _strip_cache[s.scene.name] = s
                    order[s.scene.name] = len(order)
        flags, keys = [], []
        needle = self.filter_name.lower()
        for sc in scenes:
            ok = utils.is_plan(sc) and (not needle or needle in sc.name.lower())
            flags.append(self.bitflag_filter_item if ok else 0)
            keys.append((0, order[sc.name], "") if sc.name in order else (1, 0, sc.name))
        ranked = sorted(range(len(keys)), key=lambda i: keys[i])
        neworder = [0] * len(keys)
        for rank, i in enumerate(ranked):
            neworder[i] = rank
        return flags, neworder


# ---------------------------------------------------------------------------
# Fonctions de dessin
# ---------------------------------------------------------------------------

def _scene_kind(context):
    edit = utils.get_edit_scene()
    sc = context.scene
    if edit is not None and sc == edit:
        return 'EDIT', edit
    if utils.is_plan(sc):
        return 'PLAN', edit
    return 'OTHER', edit


def draw_main_header(self, context):
    self.layout.operator("sb.open_prefs", text="", icon='PREFERENCES', emboss=False)


def draw_main(self, context):
    layout = self.layout
    kind, edit = _scene_kind(context)
    if edit is None:
        layout.label(text="Aucune scène de montage.", icon='INFO')
        layout.operator("sb.create_edit_scene", icon='SEQUENCE')
        layout.operator("sb.import_neoscenar", icon='IMPORT')
        return
    if edit.sb_settings.naming_mode == utils.NAMING_NEOSCENAR and kind in {'EDIT', 'PLAN'}:
        layout.prop(edit.sb_settings, "show_neoscenar_thumbnails", icon='IMAGE_DATA')
    if kind == 'EDIT':
        st = edit.sb_settings
        if st.template_scene is None:
            box = layout.box()
            box.label(text="Choisissez la scène modèle :", icon='ERROR')
            box.prop(st, "template_scene", text="")
        col = layout.column(align=True)
        col.scale_y = 1.4
        col.operator("sb.new_plan", icon='ADD')
        row = layout.row(align=True)
        row.operator("sb.insert_plan", icon='NLA_PUSHDOWN')
        row.prop(st, "shift_sound", text="", icon='SOUND', toggle=True)
        row = layout.row(align=True)
        row.operator("sb.open_plan", icon='FORWARD')
        row.operator("sb.renumber", text="Renuméroter", icon='LINENUMBERS_ON')
        layout.operator("sb.add_edit_sound", icon='SOUND')
    elif kind == 'PLAN':
        sc = context.scene
        box = layout.box()
        row = box.row()
        row.label(text=sc.name, icon='SCENE_DATA')
        row.label(text=utils.plan_label(sc.name))
        col = layout.column(align=True)
        col.scale_y = 1.4
        col.operator("sb.back_to_edit", icon='LOOP_BACK')
        row = layout.row(align=True)
        row.operator("sb.prev_plan", text="Précédent", icon='TRIA_LEFT')
        row.operator("sb.next_plan", text="Suivant", icon='TRIA_RIGHT')
    else:
        box = layout.box()
        box.label(text="Cette scène n'est pas gérée", icon='INFO')
        box.label(text="par le plugin Storyboard.")
        if context.scene == edit.sb_settings.template_scene:
            box.label(text="(c'est la scène modèle)", icon='LOCKED')
        layout.operator("sb.back_to_edit", icon='LOOP_BACK')


def draw_settings(self, context):
    layout = self.layout
    layout.use_property_split = True
    layout.use_property_decorate = False
    edit = utils.get_edit_scene()
    st = edit.sb_settings
    layout.prop(st, "edit_scene")
    layout.prop(st, "template_scene")
    layout.prop(st, "copy_mode")
    row = layout.row()
    row.enabled = False  # réglé par l'import NeoScenar, jamais à la main
    row.prop(st, "naming_mode")
    tpl = st.template_scene
    if st.copy_mode == 'EMPTY':
        box = layout.box()
        if tpl is None or not tpl.collection.children:
            box.label(text="La scène modèle n'a pas de collection.", icon='INFO')
        else:
            box.label(text="Collections à lier dans chaque plan :")
            for coll in tpl.collection.children:
                box.prop(coll, "sb_link_in_plans", text=coll.name)
    layout.prop(st, "plan_channel")
    layout.prop(st, "sound_channel")
    layout.prop(st, "handles", text="Poignées (images)")
    layout.prop(st, "duration_mode")
    if st.duration_mode == 'CUSTOM':
        layout.prop(st, "custom_duration")
    elif tpl is not None:
        row = layout.row()
        row.enabled = False
        row.label(text="Modèle : " + fmt_duration(tpl.frame_end - tpl.frame_start + 1, tpl))
    layout.prop(st, "open_after_create")
    layout.prop(st, "auto_sync")
    box = layout.box()
    box.label(text="Couleurs des statuts dans le montage :", icon='COLOR')
    col = box.column(align=True)
    col.use_property_split = False
    col.prop(st, "use_strip_color")
    col.prop(st, "show_color_bands")
    if not st.use_strip_color and not st.show_color_bands:
        col.label(text="Aucune couleur de statut affichée.", icon='INFO')
    row = box.row()
    row.operator("sb.open_prefs", text="Modifier les statuts…", icon='PREFERENCES')


def draw_plans(self, context):
    layout = self.layout
    edit = utils.get_edit_scene()
    st = edit.sb_settings
    layout.template_list("SB_UL_plans", "", bpy.data, "scenes", st, "plan_index", rows=6)
    strips = utils.plan_strips(edit)
    if strips:
        start = strips[0].frame_final_start
        end = max(s.frame_final_end for s in strips)
        frames = end - start
        layout.label(text="Durée totale : %d images (%s) — %d plan(s)"
                     % (frames, fmt_mmss(frames, edit), len(utils.plan_order(edit))), icon='TIME')
    idx = st.plan_index
    if 0 <= idx < len(bpy.data.scenes) and utils.is_plan(bpy.data.scenes[idx]):
        sc = bpy.data.scenes[idx]
        box = layout.box()
        row = box.row()
        row.label(text=sc.name)
        row.prop(sc.sb_plan, "status", text="")
        box.prop(sc.sb_plan, "note_action", text="Action")


def draw_sync(self, context):
    layout = self.layout
    st = utils.get_edit_scene().sb_settings
    layout.prop(st, "auto_sync")
    col = layout.column(align=True)
    col.operator("sb.sync_durations", text="Montage → plans", icon='SEQ_STRIP_DUPLICATE')
    col.operator("sb.apply_scene_duration", text="Plan → strip actif", icon='SCENE_DATA')
    col.operator("sb.close_gaps", icon='SNAP_ON')


def draw_animatic(self, context):
    layout = self.layout
    edit = utils.get_edit_scene()
    st = edit.sb_settings
    layout.prop(st, "export_dir", text="")
    layout.prop(edit.render, "sequencer_gl_preview", text="Ombrage")
    layout.label(text="Images %d à %d" % (edit.frame_start, edit.frame_end))
    row = layout.row(align=True)
    row.scale_y = 1.3
    row.operator("sb.export_animatic", icon='RENDER_ANIMATION')
    row.operator("sb.open_animatic_folder", text="", icon='FILE_FOLDER')


def draw_check(self, context):
    layout = self.layout
    layout.operator("sb.check_project", icon='VIEWZOOM')
    wm = context.window_manager
    if wm.sb_checked:
        check.draw_issues(layout, wm, max_items=15)


def draw_plan_info(self, context):
    layout = self.layout
    sc = context.scene
    p = sc.sb_plan
    layout.prop(p, "status")
    layout.prop(p, "handles", text="Poignées (images)")
    useful = utils.useful_duration(sc)
    layout.label(text="Durée utile : " + fmt_duration(useful, sc), icon='TIME')
    layout.label(text="Scène : images %d à %d" % (sc.frame_start, sc.frame_end))
    edit = utils.get_edit_scene()
    strip = utils.strip_for_plan(edit, sc) if edit else None
    if strip is None:
        layout.label(text="Pas de strip dans le montage.", icon='ERROR')
    else:
        layout.label(text="Montage : images %d à %d" % (strip.frame_final_start, strip.frame_final_end - 1))
        if strip.frame_final_duration != useful:
            layout.label(text="Durée différente du strip (%d im)." % strip.frame_final_duration, icon='ERROR')
        layout.operator("sb.apply_scene_duration", icon='SEQ_STRIP_DUPLICATE')


def draw_plan_notes(self, context):
    layout = self.layout
    p = context.scene.sb_plan
    layout.prop(p, "note_action")
    layout.prop(p, "note_dialogue")
    layout.prop(p, "note_camera")
    layout.operator("sb.notes_text", icon='TEXT')


def draw_plan_cameras(self, context):
    layout = self.layout
    sc = context.scene
    col = layout.column(align=True)
    col.scale_y = 1.3
    col.operator("sb.camera_from_view", icon='VIEW_CAMERA')
    st = utils.get_settings()
    if st is not None:
        layout.prop(st, "camera_view_after")
    markers = sorted((m for m in sc.timeline_markers if m.camera), key=lambda m: m.frame)
    if markers:
        box = layout.box()
        for m in markers:
            row = box.row()
            row.label(text="Image %d" % m.frame, icon='MARKER_HLT')
            row.label(text=m.camera.name, icon='OUTLINER_OB_CAMERA')
    else:
        layout.label(text="Aucune caméra liée à un marqueur.", icon='INFO')


def draw_plan_sound(self, context):
    layout = self.layout
    sc = context.scene
    layout.operator("sb.update_plan_sound", icon='FILE_REFRESH')
    n = 0
    if sc.sequence_editor is not None:
        n = sum(1 for s in sc.sequence_editor.strips if s.get(utils.AUDIO_KEY))
    layout.label(text="%d strip(s) son du montage" % n, icon='SOUND')
    layout.prop(sc, "sync_mode", text="Lecture")


# ---------------------------------------------------------------------------
# Fabrique de panneaux (Sequencer + vue 3D)
# ---------------------------------------------------------------------------

def _poll_edit(cls, context):
    edit = utils.get_edit_scene()
    return edit is not None and context.scene == edit


def _poll_plan(cls, context):
    return utils.is_plan(context.scene)


PANELS = [
    # (suffixe, libellé, parent, poll, draw, options)
    ("main", "Storyboard", None, None, draw_main, set()),
    ("settings", "Réglages", "main", _poll_edit, draw_settings, {'DEFAULT_CLOSED'}),
    ("plans", "Liste des plans", "main", _poll_edit, draw_plans, set()),
    ("sync", "Synchronisation", "main", _poll_edit, draw_sync, {'DEFAULT_CLOSED'}),
    ("animatic", "Animatique", "main", _poll_edit, draw_animatic, set()),
    ("check", "Vérifier le projet", "main", _poll_edit, draw_check, {'DEFAULT_CLOSED'}),
    ("plan_info", "Plan", "main", _poll_plan, draw_plan_info, set()),
    ("plan_cameras", "Caméras", "main", _poll_plan, draw_plan_cameras, set()),
    ("plan_notes", "Notes", "main", _poll_plan, draw_plan_notes, set()),
    ("plan_sound", "Son", "main", _poll_plan, draw_plan_sound, {'DEFAULT_CLOSED'}),
]

SPACES = (("SEQUENCE_EDITOR", "seq"), ("VIEW_3D", "v3d"))


def _make_panels():
    out = []
    for space, tag in SPACES:
        for suffix, label, parent, poll, draw, opts in PANELS:
            attrs = {
                "bl_idname": "SB_PT_%s_%s" % (suffix, tag),
                "bl_label": label,
                "bl_space_type": space,
                "bl_region_type": 'UI',
                "bl_category": "Storyboard",
                "bl_options": opts,
                "draw": draw,
            }
            if parent:
                attrs["bl_parent_id"] = "SB_PT_%s_%s" % (parent, tag)
            if poll:
                attrs["poll"] = classmethod(poll)
            if suffix == "main":
                attrs["draw_header_preset"] = draw_main_header
            out.append(type(attrs["bl_idname"], (bpy.types.Panel,), attrs))
    return out


classes = (SB_UL_plans,) + tuple(_make_panels())
