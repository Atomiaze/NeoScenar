# SPDX-License-Identifier: GPL-3.0-or-later
"""« Caméra depuis la vue » : caméra placée selon le viewport + marqueur lié."""

import bpy

from .. import utils

# Le viewport utilise un capteur de 36 mm avec un zoom x2 par rapport à une
# caméra : une focale de viewport de 50 mm correspond à une caméra de 25 mm.
VIEWPORT_ZOOM = 2.0
SENSOR = 36.0


def next_camera_name(scene):
    i = 1
    while True:
        name = "%s_CAM_%02d" % (scene.name, i)
        if name not in bpy.data.objects and name not in bpy.data.cameras:
            return name
        i += 1


def camera_from_view(scene, space, rv3d, frame=None):
    """Crée la caméra, la place et la lie à un marqueur. Retourne (objet, marqueur)."""
    coll = utils.ensure_cameras_collection(scene)
    name = next_camera_name(scene)
    src = scene.camera
    if rv3d.view_perspective == 'CAMERA' and src is not None and src.type == 'CAMERA':
        data = src.data.copy()
        data.name = name
        matrix = src.matrix_world.copy()
    else:
        data = bpy.data.cameras.new(name)
        matrix = rv3d.view_matrix.inverted()
        data.sensor_fit = 'AUTO'
        data.sensor_width = SENSOR
        if rv3d.view_perspective == 'ORTHO':
            data.type = 'ORTHO'
            data.ortho_scale = rv3d.view_distance * SENSOR / space.lens * VIEWPORT_ZOOM
        else:
            data.type = 'PERSP'
            data.lens = space.lens / VIEWPORT_ZOOM
        data.clip_start = space.clip_start
        data.clip_end = space.clip_end
    ob = bpy.data.objects.new(name, data)
    coll.objects.link(ob)
    ob.matrix_world = matrix
    frame = scene.frame_current if frame is None else frame
    marker = next((m for m in scene.timeline_markers if m.frame == frame), None)
    if marker is None:
        marker = scene.timeline_markers.new(name, frame=frame)
    marker.camera = ob
    # la caméra liée au marqueur de l'image courante est la caméra active
    scene.camera = ob
    return ob, marker


class SB_OT_camera_from_view(bpy.types.Operator):
    """Créer une caméra du plan à partir de la vue 3D actuelle et la lier à un marqueur à l'image courante"""
    bl_idname = "sb.camera_from_view"
    bl_label = "Caméra depuis la vue"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        scene = context.scene
        if not utils.is_plan(scene):
            self.report({'WARNING'}, "« Caméra depuis la vue » s'utilise dans une scène de plan.")
            return {'CANCELLED'}
        area = context.area
        if area is None or area.type != 'VIEW_3D':
            self.report({'WARNING'}, "Utilisez cette commande dans une vue 3D "
                                     "(raccourci Ctrl+Alt+V, souris au-dessus de la vue).")
            return {'CANCELLED'}
        space = area.spaces.active
        rv3d = space.region_3d
        ob, marker = camera_from_view(scene, space, rv3d)
        st = utils.get_settings() or scene.sb_settings
        if st.camera_view_after:
            rv3d.view_perspective = 'CAMERA'
        area.tag_redraw()
        self.report({'INFO'}, "Caméra %s créée, liée au marqueur « %s » (image %d)."
                    % (ob.name, marker.name, marker.frame))
        return {'FINISHED'}


classes = (SB_OT_camera_from_view,)
