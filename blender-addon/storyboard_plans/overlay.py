# SPDX-License-Identifier: GPL-3.0-or-later
"""Bande de la couleur exacte du statut dessinée sur chaque strip de plan (Sequencer)."""

import bpy
import gpu
from gpu_extras.batch import batch_for_shader

from . import utils

BAND_BOTTOM = 0.05   # bas du strip dans le canal (Blender : SEQ_STRIP_OFSBOTTOM)
BAND_HEIGHT = 0.20   # hauteur de la bande, en fraction de canal

_handle = None


def _draw():
    try:
        ctx = bpy.context
        space = ctx.space_data
        if space is None or space.view_type not in {'SEQUENCER', 'SEQUENCER_PREVIEW'}:
            return
        edit = utils.get_edit_scene()
        if edit is None or ctx.scene != edit or edit.sequence_editor is None:
            return
        if not edit.sb_settings.show_color_bands:
            return
        groups = {}
        for s in utils.plan_strips(edit):
            if s.frame_final_duration < 1:
                continue
            rgb = utils.status_info(s.scene)[3]
            if rgb is None:
                continue
            x0, x1 = s.frame_final_start, s.frame_final_end
            y0 = s.channel + BAND_BOTTOM
            y1 = y0 + BAND_HEIGHT
            groups.setdefault(tuple(rgb), []).extend(((x0, y0), (x1, y0), (x1, y1),
                                                      (x0, y0), (x1, y1), (x0, y1)))
        if not groups:
            return
        shader = gpu.shader.from_builtin('UNIFORM_COLOR')
        gpu.state.blend_set('ALPHA')
        for rgb, verts in groups.items():
            batch = batch_for_shader(shader, 'TRIS', {"pos": verts})
            shader.uniform_float("color", (rgb[0], rgb[1], rgb[2], 1.0))
            batch.draw(shader)
        gpu.state.blend_set('NONE')
    except Exception:  # un callback de dessin ne doit jamais bloquer l'interface
        pass


def register():
    global _handle
    if _handle is None and not bpy.app.background:
        _handle = bpy.types.SpaceSequenceEditor.draw_handler_add(_draw, (), 'WINDOW', 'POST_VIEW')


def unregister():
    global _handle
    if _handle is not None:
        bpy.types.SpaceSequenceEditor.draw_handler_remove(_handle, 'WINDOW')
        _handle = None
