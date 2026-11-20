# SPDX-License-Identifier: GPL-3.0-or-later
"""Aller-retour entre la scène de montage et les scènes de plan."""

import bpy
from bpy.props import StringProperty

from .. import utils


def open_plan(context, edit, strip, frame=None):
    """Bascule la fenêtre sur le plan du strip, à l'image correspondante, avec le son."""
    scene = strip.scene
    if frame is None:
        frame = utils.edit_to_plan_frame(strip, scene, edit.frame_current)
    count, skipped = utils.import_edit_sound(edit, scene, strip)
    if context.window is not None:
        context.window.scene = scene
    scene.frame_current = frame
    utils.tag_redraw()
    return count, skipped


def _report_sound(op, scene, count, skipped):
    msg = "Plan %s ouvert" % scene.name
    if count:
        msg += " (%d strip(s) son importé(s))" % count
    if skipped:
        op.report({'WARNING'}, msg + " — %d son(s) introuvable(s) ignoré(s)." % skipped)
    else:
        op.report({'INFO'}, msg + ".")


class SB_OT_open_plan(bpy.types.Operator):
    """Ouvrir le plan du strip actif, à l'image correspondant à la tête de lecture du montage"""
    bl_idname = "sb.open_plan"
    bl_label = "Ouvrir le plan"
    bl_options = {'REGISTER', 'UNDO'}

    plan: StringProperty(name="Plan", default="", options={'SKIP_SAVE'},
                         description="Nom de la scène du plan (vide = strip actif)")

    def execute(self, context):
        try:
            edit = utils.require_edit_scene()
            if self.plan:
                scene = bpy.data.scenes.get(self.plan)
                if not utils.is_plan(scene):
                    raise utils.SBError("« %s » n'est pas un plan." % self.plan)
                strip = utils.strip_for_plan(edit, scene)
                if strip is None:
                    raise utils.SBError("Le plan %s n'a pas de strip dans le montage." % scene.name)
                utils.select_only(edit, strip)
                frame = utils.first_useful_frame(strip, scene)
                if strip.frame_final_start <= edit.frame_current < strip.frame_final_end:
                    frame = None
            else:
                if context.scene != edit:
                    raise utils.SBError("« Ouvrir le plan » s'utilise depuis la scène de montage.")
                strip = edit.sequence_editor.active_strip
                if strip is None:
                    raise utils.SBError("Aucun strip actif : sélectionnez un plan dans le montage.")
                if strip.type != 'SCENE' or not utils.is_plan(strip.scene):
                    raise utils.SBError("Le strip actif n'est pas un plan.")
                frame = None
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        count, skipped = open_plan(context, edit, strip, frame)
        _report_sound(self, strip.scene, count, skipped)
        return {'FINISHED'}


class SB_OT_back_to_edit(bpy.types.Operator):
    """Revenir à la scène de montage, à l'image correspondant à l'image courante du plan"""
    bl_idname = "sb.back_to_edit"
    bl_label = "Retour au montage"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        try:
            edit = utils.require_edit_scene()
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        scene = context.scene
        if scene == edit:
            self.report({'INFO'}, "Vous êtes déjà dans la scène de montage.")
            return {'CANCELLED'}
        strip = utils.strip_for_plan(edit, scene) if utils.is_plan(scene) else None
        context.window.scene = edit
        if strip is not None:
            edit.frame_current = utils.plan_to_edit_frame(strip, scene, scene.frame_current)
            utils.select_only(edit, strip)
        elif utils.is_plan(scene):
            self.report({'WARNING'}, "Le plan %s n'a pas de strip dans le montage." % scene.name)
        utils.tag_redraw()
        return {'FINISHED'}


class _SB_StepPlan:
    step = 1

    def execute(self, context):
        try:
            edit = utils.require_edit_scene()
            scene = context.scene
            strips = utils.plan_strips(edit)
            if not strips:
                raise utils.SBError("Le montage ne contient aucun plan.")
            if utils.is_plan(scene):
                cur = utils.strip_for_plan(edit, scene)
                if cur is None:
                    raise utils.SBError("Ce plan n'a pas de strip dans le montage.")
                idx = strips.index(cur) + self.step
            elif scene == edit:
                act = edit.sequence_editor.active_strip
                idx = strips.index(act) + self.step if act in strips else 0
            else:
                raise utils.SBError("Cette scène n'est pas gérée par le plugin Storyboard.")
            # saute les strips d'un même plan
            while 0 <= idx < len(strips) and strips[idx].scene == scene:
                idx += self.step
            if not (0 <= idx < len(strips)):
                raise utils.SBError("Dernier plan du montage." if self.step > 0
                                    else "Premier plan du montage.")
        except utils.SBError as e:
            self.report({'WARNING'}, str(e))
            return {'CANCELLED'}
        strip = strips[idx]
        utils.select_only(edit, strip)
        edit.frame_current = strip.frame_final_start
        count, skipped = open_plan(context, edit, strip, utils.first_useful_frame(strip, strip.scene))
        _report_sound(self, strip.scene, count, skipped)
        return {'FINISHED'}


class SB_OT_next_plan(_SB_StepPlan, bpy.types.Operator):
    """Passer au plan suivant dans l'ordre du montage (première image utile, son importé)"""
    bl_idname = "sb.next_plan"
    bl_label = "Plan suivant"
    bl_options = {'REGISTER', 'UNDO'}
    step = 1


class SB_OT_prev_plan(_SB_StepPlan, bpy.types.Operator):
    """Passer au plan précédent dans l'ordre du montage (première image utile, son importé)"""
    bl_idname = "sb.prev_plan"
    bl_label = "Plan précédent"
    bl_options = {'REGISTER', 'UNDO'}
    step = -1


classes = (SB_OT_open_plan, SB_OT_back_to_edit, SB_OT_next_plan, SB_OT_prev_plan)
