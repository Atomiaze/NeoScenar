# SPDX-License-Identifier: GPL-3.0-or-later
"""Son du montage dans le plan."""

import os

import bpy
from bpy.props import StringProperty
from bpy_extras.io_utils import ImportHelper

from .. import utils


class SB_OT_update_plan_sound(bpy.types.Operator):
    """Réimporter dans ce plan les strips son du montage qui le chevauchent (calés à la bonne image)"""
    bl_idname = "sb.update_plan_sound"
    bl_label = "Mettre à jour le son du plan"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        scene = context.scene
        if not utils.is_plan(scene):
            self.report({'WARNING'}, "La scène courante n'est pas un plan.")
            return {'CANCELLED'}
        try:
            edit = utils.require_edit_scene()
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        strip = utils.strip_for_plan(edit, scene)
        if strip is None:
            self.report({'WARNING'}, "Ce plan n'a pas de strip dans le montage.")
            return {'CANCELLED'}
        count, skipped = utils.import_edit_sound(edit, scene, strip)
        if skipped:
            self.report({'WARNING'}, "%d strip(s) son importé(s), %d introuvable(s)." % (count, skipped))
        else:
            self.report({'INFO'}, "%d strip(s) son importé(s)." % count)
        return {'FINISHED'}


class SB_OT_add_edit_sound(bpy.types.Operator, ImportHelper):
    """Ajouter un fichier son au montage, sur le canal du son, à la tête de lecture"""
    bl_idname = "sb.add_edit_sound"
    bl_label = "Ajouter un son au montage"
    bl_options = {'REGISTER', 'UNDO'}

    filter_glob: StringProperty(default="*.wav;*.mp3;*.ogg;*.flac;*.aif;*.aiff;*.m4a;*.aac",
                                options={'HIDDEN'})

    def execute(self, context):
        try:
            edit = utils.require_edit_scene()
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        path = self.filepath
        if not os.path.isfile(path):
            self.report({'WARNING'}, "Fichier introuvable : %s" % path)
            return {'CANCELLED'}
        ed = edit.sequence_editor
        try:
            s = ed.strips.new_sound(name=os.path.basename(path), filepath=path,
                                    channel=edit.sb_settings.sound_channel,
                                    frame_start=edit.frame_current)
        except RuntimeError:
            self.report({'WARNING'}, "Impossible de lire ce fichier son.")
            return {'CANCELLED'}
        self.report({'INFO'}, "Son « %s » ajouté au canal %d." % (s.name, s.channel))
        return {'FINISHED'}


classes = (SB_OT_update_plan_sound, SB_OT_add_edit_sound)
