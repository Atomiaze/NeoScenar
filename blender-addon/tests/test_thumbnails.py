# SPDX-License-Identifier: GPL-3.0-or-later
"""Vignettes NeoScenar plaquées devant les caméras des plans."""

import os
import shutil
import tempfile

import bpy
from bpy_extras.object_utils import world_to_camera_view

from helpers import call
from storyboard_plans import utils
from test_import import BLEND, ImportTestCase


def frame_coords(scene, ob):
    """Position des coins de l'objet dans le cadre de la caméra (0 à 1), et leur profondeur."""
    scene.view_layers[0].update()  # positions recalculées après le rattachement à la caméra
    return [world_to_camera_view(scene, scene.camera, ob.matrix_world @ v.co)
            for v in ob.data.vertices]


class TestThumbnails(ImportTestCase):
    def setUp(self):
        super().setUp()
        self.assertEqual(self.do_import(), {'FINISHED'})
        self.scene = bpy.data.scenes["S_0010_P_0010"]
        self.ob = bpy.data.objects["S_0010_P_0010_Vignette"]

    def test_image_copiee_a_cote_du_blend_avec_chemin_relatif(self):
        copied = os.path.join(os.path.dirname(self.blend), "vignettes", "S_0010_P_0010.png")
        self.assertTrue(os.path.isfile(copied))
        image = self.ob.active_material.node_tree.nodes.active.image
        self.assertEqual(image.filepath, "//vignettes/S_0010_P_0010.png")

    def test_objet_rattache_a_la_camera_dans_sa_collection(self):
        coll = self.scene.sb_plan.thumbnail_collection
        self.assertEqual(coll.name, "S_0010_P_0010_Vignette")
        self.assertIn(coll.name, self.scene.collection.children)
        self.assertIn(self.ob.name, coll.objects)
        self.assertEqual(self.ob.parent, self.scene.camera)
        self.assertTrue(self.ob.hide_select)

    def test_remplit_exactement_le_champ_de_la_camera(self):
        coords = frame_coords(self.scene, self.ob)
        corners = sorted((round(c.x, 4), round(c.y, 4)) for c in coords)
        self.assertEqual(corners, [(0.0, 0.0), (0.0, 1.0), (1.0, 0.0), (1.0, 1.0)])
        # tout au fond du champ : la caméra voit l'objet (devant elle, avant clip_end)
        cam = self.scene.camera.data
        for c in coords:
            self.assertGreater(c.z, cam.clip_start)
            self.assertLess(c.z, cam.clip_end)

    def test_remplit_le_champ_avec_un_autre_capteur(self):
        cam = self.scene.camera.data
        cam.lens = 35
        cam.sensor_fit = 'VERTICAL'
        cam.sensor_height = 18
        bpy.data.objects.remove(self.ob)
        from storyboard_plans import neoscenar
        image = os.path.join(os.path.dirname(self.blend), "vignettes", "S_0010_P_0010.png")
        ob = neoscenar.add_thumbnail(self.scene, image)
        corners = sorted((round(c.x, 4), round(c.y, 4)) for c in frame_coords(self.scene, ob))
        self.assertEqual(corners, [(0.0, 0.0), (0.0, 1.0), (1.0, 0.0), (1.0, 1.0)])

    def test_le_dessin_reste_devant(self):
        cam = self.scene.camera
        draw = self.scene.sb_plan.draw_object
        depth_drawing = world_to_camera_view(self.scene, cam, draw.matrix_world.translation).z
        depth_thumbnail = frame_coords(self.scene, self.ob)[0].z
        self.assertLess(depth_drawing, depth_thumbnail)

    def test_materiau_non_eclaire(self):
        nodes = self.ob.active_material.node_tree.nodes
        self.assertTrue(any(n.type == 'EMISSION' for n in nodes))
        self.assertFalse(any(n.type == 'BSDF_PRINCIPLED' for n in nodes))
        self.assertEqual(nodes.active.extension, 'EXTEND')

    def test_affichage_des_textures_et_couleurs_exactes(self):
        for sc in (bpy.data.scenes["Modele"], self.scene):
            self.assertEqual(sc.display.shading.color_type, 'TEXTURE')
            self.assertEqual(sc.display.shading.light, 'FLAT')
            self.assertEqual(sc.view_settings.view_transform, 'Standard')

    def test_plans_sans_vignette(self):
        self.assertIsNone(bpy.data.scenes["S_0010_P_0010A"].sb_plan.thumbnail_collection)
        self.assertEqual(sorted(o.name for o in bpy.data.objects if o.name.endswith("_Vignette")),
                         ["S_0010_P_0010_Vignette", "S_0010_P_0020_Vignette"])

    def test_case_afficher_les_vignettes(self):
        st = utils.get_edit_scene().sb_settings
        st.show_neoscenar_thumbnails = False
        coll = self.scene.sb_plan.thumbnail_collection
        self.assertTrue(coll.hide_viewport and coll.hide_render)
        st.show_neoscenar_thumbnails = True
        self.assertFalse(coll.hide_viewport or coll.hide_render)

    def test_renumerotation_renomme_la_vignette(self):
        edit = utils.get_edit_scene()
        call(bpy.ops.sb.renumber, edit)  # S_0010 : P_0010, P_0010A, P_0020 → 10, 20, 30
        scene = bpy.data.scenes["S_0010_P_0030"]
        coll = scene.sb_plan.thumbnail_collection
        self.assertEqual(coll.name, "S_0010_P_0030_Vignette")
        self.assertEqual([o.name for o in coll.objects], ["S_0010_P_0030_Vignette"])


class TestDossierDeplace(ImportTestCase):
    def test_le_blend_retrouve_ses_vignettes(self):
        self.do_import()
        moved = tempfile.mkdtemp(prefix="sb_deplace_")
        try:
            film = os.path.join(moved, "Film copié")
            shutil.copytree(self.film, film)
            shutil.rmtree(self.film)
            bpy.ops.wm.open_mainfile(filepath=os.path.join(film, BLEND))
            for image in bpy.data.images:
                if image.filepath.startswith("//vignettes/"):
                    path = bpy.path.abspath(image.filepath)
                    self.assertTrue(path.startswith(film), path)
                    self.assertTrue(os.path.isfile(path), path)
        finally:
            shutil.rmtree(moved, ignore_errors=True)
