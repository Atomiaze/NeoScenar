# SPDX-License-Identifier: GPL-3.0-or-later
"""Mode « Plan_0010 » : comportement de la version 1.7.1, qui doit rester identique
(les élèves ont des projets en cours)."""

import bpy

from helpers import (TEMPLATE_FRAMES, BlenderTestCase, call, make_project, plan_names,
                     select_strip, strip_names)
from storyboard_plans import utils
from storyboard_plans.operators.check import collect_issues


class TestNames(BlenderTestCase):
    def test_lecture_et_fabrication(self):
        self.assertEqual(utils.plan_number("Plan_0010"), 10)
        self.assertEqual(utils.plan_number("Plan_0015"), 15)
        self.assertIsNone(utils.plan_number("Plan_10"))
        self.assertIsNone(utils.plan_number("S_0010_P_0010"))
        self.assertEqual(utils.plan_name(10), "Plan_0010")

    def test_numero_intermediaire(self):
        make_project(plans=2)
        self.assertEqual(utils.insert_number(10, 20), 15)
        self.assertEqual(utils.insert_number(20, None), 30)
        with self.assertRaises(utils.SBError):
            utils.insert_number(10, 11)


class TestCreation(BlenderTestCase):
    def test_nouveaux_plans(self):
        edit = make_project(plans=3)
        self.assertEqual(strip_names(edit), ["Plan_0010", "Plan_0020", "Plan_0030"])
        strips = utils.plan_strips(edit)
        self.assertEqual([s.frame_final_duration for s in strips], [TEMPLATE_FRAMES] * 3)
        self.assertEqual([s.frame_final_start for s in strips], [1, 49, 97])
        sc = bpy.data.scenes["Plan_0010"]
        self.assertTrue(sc.sb_plan.is_plan)
        self.assertEqual(sc.sb_plan.status_key, "STORYBOARD")
        self.assertEqual(sc.sb_plan.cameras_collection.name, "Plan_0010_Cameras")
        self.assertEqual(sc.camera.name, "Plan_0010_CAM_01")
        self.assertEqual(sc.sb_plan.draw_object.name, "Plan_0010_Dessin")

    def test_insertion_entre_deux_plans(self):
        edit = make_project(plans=2)
        select_strip(edit, "Plan_0010")
        self.assertEqual(call(bpy.ops.sb.insert_plan, edit), {'FINISHED'})
        self.assertEqual(strip_names(edit), ["Plan_0010", "Plan_0015", "Plan_0020"])
        starts = [s.frame_final_start for s in utils.plan_strips(edit)]
        self.assertEqual(starts, [1, 49, 97])

    def test_insertion_apres_le_dernier(self):
        edit = make_project(plans=2)
        select_strip(edit, "Plan_0020")
        call(bpy.ops.sb.insert_plan, edit)
        self.assertEqual(strip_names(edit), ["Plan_0010", "Plan_0020", "Plan_0030"])

    def test_insertion_sans_numero_libre(self):
        edit = make_project(plans=2)
        bpy.data.scenes["Plan_0020"].name = "Plan_0011"
        select_strip(edit, "Plan_0010")
        self.assertEqual(call(bpy.ops.sb.insert_plan, edit), {'CANCELLED'})
        self.assertEqual(len(utils.plan_strips(edit)), 2)


class TestRenumber(BlenderTestCase):
    def test_renumerotation_et_noms_derives(self):
        edit = make_project(plans=2)
        select_strip(edit, "Plan_0010")
        call(bpy.ops.sb.insert_plan, edit)
        call(bpy.ops.sb.renumber, edit)
        self.assertEqual(strip_names(edit), ["Plan_0010", "Plan_0020", "Plan_0030"])
        self.assertEqual(plan_names(), ["Plan_0010", "Plan_0020", "Plan_0030"])
        # l'ancien Plan_0020 est devenu Plan_0030, avec tous ses noms dérivés
        sc = bpy.data.scenes["Plan_0030"]
        self.assertEqual(sc.sb_plan.cameras_collection.name, "Plan_0030_Cameras")
        self.assertEqual(sc.camera.name, "Plan_0030_CAM_01")
        self.assertEqual(sc.sb_plan.draw_object.name, "Plan_0030_Dessin")


class TestCheck(BlenderTestCase):
    def kinds(self, edit):
        return {i["kind"] for i in collect_issues(edit)}

    def test_projet_propre(self):
        edit = make_project(plans=2)
        self.assertFalse(self.kinds(edit) & {"NAME", "ORDER"})

    def test_nom_non_conforme(self):
        edit = make_project(plans=2)
        bpy.data.scenes["Plan_0020"].name = "Truc"
        self.assertIn("NAME", self.kinds(edit))

    def test_ordre(self):
        edit = make_project(plans=2)
        bpy.data.scenes["Plan_0010"].name = "Plan_0030"
        self.assertIn("ORDER", self.kinds(edit))
