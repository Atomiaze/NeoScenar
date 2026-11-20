# SPDX-License-Identifier: GPL-3.0-or-later
"""Import d'un découpage NeoScenar : paquet d'exemple de tests/donnees/export/."""

import json
import os
import shutil
import tempfile

import bpy

from helpers import BlenderTestCase, call, make_project, strip_names
from storyboard_plans import neoscenar, utils

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "donnees", "export")
BLEND = os.path.join("06_Blender", "Storyboard", "Mon_Film_d_ete_storyboard.blend")
NAMES = ["S_0010_P_0010", "S_0010_P_0010A", "S_0010_P_0020", "S_0020_P_0010", "S_0020_P_0020"]


class ImportTestCase(BlenderTestCase):
    """Le paquet d'exemple est copié dans un dossier de film temporaire."""

    def setUp(self):
        super().setUp()
        self.film = tempfile.mkdtemp(prefix="sb_film_")
        self.export = os.path.join(self.film, "neoscenar", "blender", "export")
        shutil.copytree(DATA, self.export)
        self.json = os.path.join(self.export, "decoupage.json")
        self.blend = os.path.join(self.film, BLEND)

    def tearDown(self):
        shutil.rmtree(self.film, ignore_errors=True)

    def edit_json(self, change):
        with open(self.json, encoding="utf-8") as f:
            data = json.load(f)
        change(data)
        with open(self.json, "w", encoding="utf-8") as f:
            json.dump(data, f)

    def do_import(self):
        return call(bpy.ops.sb.import_neoscenar, bpy.context.scene, filepath=self.json)


class TestImport(ImportTestCase):
    def setUp(self):
        super().setUp()
        self.assertEqual(self.do_import(), {'FINISHED'})
        self.edit = utils.get_edit_scene()

    def test_scene_modele(self):
        tpl = bpy.data.scenes["Modele"]
        self.assertEqual(self.edit.sb_settings.template_scene, tpl)
        r = tpl.render
        self.assertEqual((r.resolution_x, r.resolution_y, r.resolution_percentage), (640, 360, 100))
        self.assertEqual((r.fps, r.fps_base), (25, 1.0))
        self.assertEqual((tpl.frame_start, tpl.frame_end), (1, 50))
        self.assertNotIn("Cube", bpy.data.objects)
        self.assertIn("Light", tpl.objects)
        self.assertIn(tpl.camera.name, tpl.collection.objects)

    def test_scene_de_montage(self):
        st = self.edit.sb_settings
        self.assertTrue(self.edit.sb_plan.is_edit)
        self.assertEqual(st.naming_mode, utils.NAMING_NEOSCENAR)
        self.assertEqual(st.neoscenar_project_id, "projet-exemple")
        self.assertEqual(st.neoscenar_source, "//../../neoscenar/blender/export/decoupage.json")
        self.assertEqual(self.edit.camera.name, utils.EDIT_CAMERA)
        self.assertEqual((self.edit.render.resolution_x, self.edit.render.fps), (640, 25))

    def test_plans_dans_l_ordre_avec_leurs_durees(self):
        self.assertEqual(strip_names(self.edit), NAMES)
        strips = utils.plan_strips(self.edit)
        # 50 images = durée par défaut (2 s à 25 i/s) pour les plans sans durée
        self.assertEqual([s.frame_final_duration for s in strips], [88, 50, 50, 25, 50])
        self.assertEqual([s.frame_final_start for s in strips], [1, 89, 139, 189, 214])
        self.assertEqual((self.edit.frame_start, self.edit.frame_end), (1, 263))
        for sc in (s.scene for s in strips):
            self.assertEqual(sc.sb_plan.status_key, "STORYBOARD")
            self.assertEqual(sc.camera.name, "%s_CAM_01" % sc.name)

    def test_notes_et_identifiants(self):
        p = bpy.data.scenes["S_0010_P_0010"].sb_plan
        self.assertEqual((p.neoscenar_shot_id, p.neoscenar_scene_id), ("plan-1", "scene-1"))
        self.assertEqual(p.note_action, "Le réveil sur la table de nuit.")
        self.assertEqual(p.note_dialogue, "Sonnerie du réveil")
        self.assertEqual(p.note_camera, "Gros plan · Plan fixe · Plongée")
        text = p.notes_text.as_string()
        self.assertEqual(p.notes_text.name, "Notes_S_0010_P_0010")
        for line in ("Plan : Le réveil sonne", "Scène : S_0010 — INT. CHAMBRE - JOUR — Le réveil",
                     "Musique : Thème du matin"):
            self.assertIn(line, text)
        self.assertEqual(bpy.data.scenes["S_0010_P_0010A"].sb_plan.note_camera, "Panoramique")

    def test_reperes_de_scene(self):
        markers = sorted((m.frame, m.name) for m in self.edit.timeline_markers)
        self.assertEqual(markers, [(1, "S_0010 — INT. CHAMBRE - JOUR"),
                                   (189, "S_0020 — La cuisine")])

    def test_fichier_enregistre(self):
        self.assertTrue(os.path.isfile(self.blend))
        self.assertEqual(os.path.normpath(bpy.data.filepath), os.path.normpath(self.blend))
        # le fichier rouvert contient bien tout le storyboard
        bpy.ops.wm.open_mainfile(filepath=self.blend)
        self.assertEqual(strip_names(utils.get_edit_scene()), NAMES)


class TestRefus(ImportTestCase):
    def assert_refused(self, message, blend_existed=False):
        with self.assertRaises(utils.SBError) as ctx:
            neoscenar.import_package(bpy.context, self.json)
        self.assertIn(message, str(ctx.exception))
        if not blend_existed:
            self.assertFalse(os.path.exists(self.blend))
        self.assertIsNone(utils.get_edit_scene())

    def test_fichier_non_vide(self):
        make_project(plans=1)
        with self.assertRaises(utils.SBError) as ctx:
            neoscenar.import_package(bpy.context, self.json)
        self.assertIn("Importez dans un nouveau fichier", str(ctx.exception))
        self.assertFalse(os.path.exists(self.blend))

    def test_blend_existant(self):
        os.makedirs(os.path.dirname(self.blend))
        with open(self.blend, "wb") as f:
            f.write(b"travail")
        self.assert_refused("existe déjà", blend_existed=True)
        with open(self.blend, "rb") as f:
            self.assertEqual(f.read(), b"travail")

    def test_format_inconnu(self):
        self.edit_json(lambda d: d.update(format="autre-chose"))
        self.assert_refused("n'est pas un découpage exporté par NeoScenar")

    def test_version_trop_recente(self):
        self.edit_json(lambda d: d.update(formatVersion=2))
        self.assert_refused("version plus récente de NeoScenar")

    def test_fichier_illisible(self):
        with open(self.json, "w", encoding="utf-8") as f:
            f.write("pas du JSON")
        self.assert_refused("illisible")

    def test_operateur_signale_l_erreur(self):
        self.edit_json(lambda d: d.update(formatVersion=2))
        with self.assertRaises(RuntimeError):
            self.do_import()
