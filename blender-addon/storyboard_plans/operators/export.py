# SPDX-License-Identifier: GPL-3.0-or-later
"""Export de l'animatique : rendu viewport (OpenGL) du montage en MP4 H.264 + AAC."""

import datetime
import os

import bpy

from .. import utils

RENDER_SAVE = ("filepath", "use_file_extension", "use_sequencer", "use_stamp", "use_stamp_date",
               "use_stamp_time", "use_stamp_render_time", "use_stamp_frame", "use_stamp_frame_range",
               "use_stamp_memory", "use_stamp_hostname", "use_stamp_camera", "use_stamp_lens",
               "use_stamp_scene", "use_stamp_marker", "use_stamp_filename",
               "use_stamp_sequencer_strip", "use_stamp_note", "use_stamp_labels", "stamp_font_size")
IMAGE_SAVE = ("file_format", "color_mode")
FFMPEG_SAVE = ("format", "codec", "audio_codec", "audio_channels", "audio_mixrate", "audio_bitrate",
               "constant_rate_factor", "ffmpeg_preset", "gopsize", "use_max_b_frames")


def _save(obj, attrs):
    return {a: getattr(obj, a) for a in attrs}


def _restore(obj, values):
    for a, v in values.items():
        try:
            setattr(obj, a, v)
        except (AttributeError, TypeError, ValueError):
            pass


def output_path(settings):
    blend = bpy.data.filepath
    if settings.export_dir.startswith("//") and not blend:
        raise utils.SBError("Enregistrez d'abord le fichier .blend (le dossier « // » est relatif au fichier).")
    folder = bpy.path.abspath(settings.export_dir)
    name = os.path.splitext(os.path.basename(blend))[0] if blend else "sans_titre"
    stamp = datetime.datetime.now().strftime("%Y-%m-%d_%H%M")
    return os.path.join(folder, "%s_animatique_%s.mp4" % (name, stamp))


def configure(edit, path):
    r = edit.render
    r.filepath = path
    r.use_file_extension = True
    r.use_sequencer = True
    r.image_settings.file_format = 'FFMPEG'
    r.image_settings.color_mode = 'RGB'
    ff = r.ffmpeg
    ff.format = 'MPEG4'
    ff.codec = 'H264'
    ff.constant_rate_factor = 'HIGH'
    ff.ffmpeg_preset = 'GOOD'
    ff.gopsize = max(1, int(round(r.fps / r.fps_base)))
    ff.audio_codec = 'AAC'
    ff.audio_channels = 'STEREO'
    ff.audio_mixrate = 48000
    ff.audio_bitrate = 192
    # incrustation : nom du plan (strip), image, timecode, nom du fichier
    for a in RENDER_SAVE:
        if a.startswith("use_stamp_"):
            setattr(r, a, False)
    r.use_stamp = True
    r.use_stamp_sequencer_strip = True
    r.use_stamp_frame = True
    r.use_stamp_time = True
    r.use_stamp_filename = True
    r.use_stamp_labels = True
    r.stamp_font_size = max(12, int(r.resolution_y * r.resolution_percentage / 100 / 40))


def export_animatic(context, edit, path):
    """Rend l'animatique et restaure les réglages de rendu. Retourne le chemin."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    r = edit.render
    saved = (_save(r, RENDER_SAVE), _save(r.image_settings, IMAGE_SAVE), _save(r.ffmpeg, FFMPEG_SAVE))
    win = context.window or (context.window_manager.windows[0] if context.window_manager.windows else None)
    try:
        configure(edit, path)
        override = {"scene": edit, "view_layer": edit.view_layers[0]}
        if win is not None:
            override["window"] = win
        with context.temp_override(**override):
            bpy.ops.render.opengl(animation=True, sequencer=True)
    finally:
        _restore(r.image_settings, saved[1])
        _restore(r.ffmpeg, saved[2])
        _restore(r, saved[0])
    return path


class SB_OT_export_animatic(bpy.types.Operator):
    """Rendu viewport de tout le montage en MP4 (H.264 + AAC) avec incrustation du plan, de l'image et du timecode"""
    bl_idname = "sb.export_animatic"
    bl_label = "Exporter l'animatique"
    bl_options = {'REGISTER'}

    def execute(self, context):
        try:
            edit = utils.require_edit_scene()
            if not utils.plan_strips(edit):
                raise utils.SBError("Le montage ne contient aucun plan.")
            path = output_path(edit.sb_settings)
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        wm = context.window_manager
        wm.progress_begin(0, 1)
        try:
            export_animatic(context, edit, path)
        except (RuntimeError, OSError) as e:
            self.report({'WARNING'}, "Échec de l'export : %s" % e)
            return {'CANCELLED'}
        finally:
            wm.progress_end()
        if not os.path.isfile(path):
            self.report({'WARNING'}, "Le rendu est terminé mais le fichier est introuvable : %s" % path)
            return {'CANCELLED'}
        self.report({'INFO'}, "Animatique exportée : %s" % path)
        return {'FINISHED'}


class SB_OT_open_animatic_folder(bpy.types.Operator):
    """Ouvrir le dossier de sortie de l'animatique dans le Finder"""
    bl_idname = "sb.open_animatic_folder"
    bl_label = "Ouvrir le dossier"
    bl_options = {'REGISTER'}

    def execute(self, context):
        st = utils.get_settings()
        if st is None:
            self.report({'WARNING'}, "Aucune scène de montage.")
            return {'CANCELLED'}
        folder = bpy.path.abspath(st.export_dir)
        if not os.path.isdir(folder):
            self.report({'WARNING'}, "Le dossier n'existe pas encore : %s" % folder)
            return {'CANCELLED'}
        bpy.ops.wm.path_open(filepath=folder)
        return {'FINISHED'}


classes = (SB_OT_export_animatic, SB_OT_open_animatic_folder)
