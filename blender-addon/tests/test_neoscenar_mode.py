# SPDX-License-Identifier: GPL-3.0-or-later
"""Mode de nommage « NeoScenar » : S_0010_P_0010, S_0010_P_0010A."""

import bpy

from helpers import (TEMPLATE_FRAMES, BlenderTestCase, call, make_neoscenar_project, make_project,
                     plan_names, select_strip, strip_names)
from storyboard_plans import utils
from storyboard_plans.operators.check import collect_issues
from storyboard_plans.utils import NAMING_NEOSCENAR as NEO
from storyboard_plans.utils import NAMING_PLAN as PLAN
from storyboard_plans.utils import PlanKey


class TestNames(BlenderTestCase):
    def test_lecture(self):
        self.assertEqual(utils.parse_plan_name("S_0010_P_0020", NEO), (10, "", 20, ""))
        self.assertEqual(utils.parse_plan_name("S_0010A_P_0020B", NEO), (10, "A", 20, "B"))
        for bad in ("Plan_0010", "S_10_P_0010", "S_0010_P_0010AB", "s_0010_p_0010"):
            self.assertIsNone(utils.parse_plan_name(bad, NEO), bad)
        # chaque mode ne reconnaît que ses noms
        self.assertIsNone(utils.parse_plan_name("S_0010_P_0010", PLAN))
        self.assertEqual(utils.parse_plan_name("Plan_0010", PLAN).number, 10)

    def test_fabrication(self):
        self.assertEqual(utils.format_plan_name(PlanKey(10, "", 20, ""), NEO), "S_0010_P_0020")
        self.assertEqual(utils.format_plan_name(PlanKey(10, "A", 20, "B"), NEO), "S_0010A_P_0020B")
        self.assertEqual(utils.format_plan_name(PlanKey(0, "", 20, ""), PLAN), "Plan_0020")

    def test_tri(self):
        names = ["S_0020_P_0010", "Truc", "S_0010_P_0010A", "S_0010A_P_0010", "S_0010_P_0010"]
        names.sort(key=lambda n: utils.plan_sort_key(n, NEO))
        self.assertEqual(names, ["S_0010_P_0010", "S_0010_P_0010A", "S_0010A_P_0010",
                                 "S_0020_P_0010", "Truc"])


class TestAllocation(BlenderTestCase):
    def k(self, number, letter=""):
        return PlanKey(10, "", number, letter)

    def test_fin_de_scene(self):
        self.assertEqual(utils.allocate_after(self.k(10), None), (20, ""))
        self.assertEqual(utils.allocate_after(self.k(15, "A"), None), (20, ""))

    def test_numero_intermediaire_puis_lettre(self):
        self.assertEqual(utils.allocate_after(self.k(10), self.k(20)), (15, ""))
        self.assertEqual(utils.allocate_after(self.k(10), self.k(11)), (10, "A"))
        self.assertEqual(utils.allocate_after(self.k(10, "A"), self.k(11)), (10, "B"))
        self.assertEqual(utils.allocate_after(self.k(10, "A"), self.k(10, "C")), (10, "B"))

    def test_plus_de_place(self):
        for prev, nxt in ((self.k(10), self.k(10, "A")), (self.k(10, "Z"), self.k(11))):
            with self.assertRaises(utils.SBError):
                utils.allocate_after(prev, nxt)


SCENES = ["S_0010_P_0010", "S_0010_P_0020", "S_0020_P_0010"]


class TestNewPlan(BlenderTestCase):
    def test_fin_de_la_scene_du_strip_selectionne(self):
        edit = make_neoscenar_project(SCENES)
        select_strip(edit, "S_0010_P_0010")
        self.assertEqual(call(bpy.ops.sb.new_plan, edit), {'FINISHED'})
        self.assertEqual(strip_names(edit), ["S_0010_P_0010", "S_0010_P_0020", "S_0010_P_0030",
                                             "S_0020_P_0010"])
        starts = [s.frame_final_start for s in utils.plan_strips(edit)]
        self.assertEqual(starts, [1, 49, 97, 145])

    def test_sans_selection_fin_de_la_derniere_scene(self):
        edit = make_neoscenar_project(SCENES)
        utils.select_only(edit, None)
        call(bpy.ops.sb.new_plan, edit)
        self.assertEqual(strip_names(edit)[-1], "S_0020_P_0020")

    def test_noms_derives(self):
        edit = make_neoscenar_project(SCENES)
        utils.select_only(edit, None)
        call(bpy.ops.sb.new_plan, edit)
        sc = bpy.data.scenes["S_0020_P_0020"]
        self.assertEqual(sc.sb_plan.cameras_collection.name, "S_0020_P_0020_Cameras")
        self.assertEqual(sc.camera.name, "S_0020_P_0020_CAM_01")
        self.assertEqual(sc.sb_plan.draw_object.name, "S_0020_P_0020_Dessin")
        self.assertEqual(sc.sb_plan.neoscenar_shot_id, "")


class TestInsert(BlenderTestCase):
    def insert_after(self, edit, name):
        select_strip(edit, name)
        return call(bpy.ops.sb.insert_plan, edit)

    def test_numero_intermediaire(self):
        edit = make_neoscenar_project(SCENES)
        self.insert_after(edit, "S_0010_P_0010")
        self.assertEqual(strip_names(edit), ["S_0010_P_0010", "S_0010_P_0015", "S_0010_P_0020",
                                             "S_0020_P_0010"])

    def test_lettre_quand_plus_de_numero(self):
        edit = make_neoscenar_project(["S_0010_P_0010", "S_0010_P_0011"])
        self.insert_after(edit, "S_0010_P_0010")
        self.insert_after(edit, "S_0010_P_0010A")
        self.assertEqual(strip_names(edit), ["S_0010_P_0010", "S_0010_P_0010A", "S_0010_P_0010B",
                                             "S_0010_P_0011"])

    def test_apres_le_dernier_plan_d_une_scene(self):
        edit = make_neoscenar_project(SCENES)
        self.insert_after(edit, "S_0010_P_0020")
        self.assertEqual(strip_names(edit), ["S_0010_P_0010", "S_0010_P_0020", "S_0010_P_0030",
                                             "S_0020_P_0010"])

    def test_plus_de_place(self):
        edit = make_neoscenar_project(["S_0010_P_0010", "S_0010_P_0010A"])
        self.assertEqual(self.insert_after(edit, "S_0010_P_0010"), {'CANCELLED'})
        self.assertEqual(len(utils.plan_strips(edit)), 2)


class TestRenumber(BlenderTestCase):
    def test_par_scene(self):
        edit = make_neoscenar_project(["S_0010_P_0010", "S_0010_P_0015", "S_0010_P_0020A",
                                       "S_0020_P_0030"])
        bpy.data.scenes["S_0010_P_0015"].sb_plan.neoscenar_shot_id = "id-du-plan"
        call(bpy.ops.sb.renumber, edit)
        self.assertEqual(strip_names(edit), ["S_0010_P_0010", "S_0010_P_0020", "S_0010_P_0030",
                                             "S_0020_P_0010"])
        sc = bpy.data.scenes["S_0010_P_0020"]
        self.assertEqual(sc.sb_plan.neoscenar_shot_id, "id-du-plan")
        self.assertEqual(sc.sb_plan.cameras_collection.name, "S_0010_P_0020_Cameras")
        self.assertEqual(sc.camera.name, "S_0010_P_0020_CAM_01")
        self.assertEqual(sc.sb_plan.draw_object.name, "S_0010_P_0020_Dessin")

    def test_noms_non_conformes_inchanges(self):
        edit = make_neoscenar_project(["S_0010_P_0015"])
        bpy.data.scenes["S_0010_P_0015"].name = "Essai"
        call(bpy.ops.sb.renumber, edit)
        self.assertEqual(plan_names(), ["Essai"])


class TestCheck(BlenderTestCase):
    def issues(self, edit, kind):
        return [i for i in collect_issues(edit) if i["kind"] == kind]

    def test_noms_du_mode_acceptes(self):
        edit = make_neoscenar_project(SCENES + ["S_0020_P_0010A"])
        self.assertEqual(self.issues(edit, "NAME"), [])
        self.assertEqual(self.issues(edit, "ORDER"), [])

    def test_nom_d_un_autre_mode_signale(self):
        edit = make_neoscenar_project(SCENES)
        bpy.data.scenes["S_0020_P_0010"].name = "Plan_0030"
        names = self.issues(edit, "NAME")
        self.assertEqual(len(names), 1)
        self.assertIn("attendu S_0010_P_0010", names[0]["message"])
        self.assertFalse(names[0]["fixable"])

    def test_mode_plan_refuse_les_noms_neoscenar(self):
        edit = make_project(plans=1)
        bpy.data.scenes["Plan_0010"].name = "S_0010_P_0010"
        self.assertEqual(len(self.issues(edit, "NAME")), 1)


class TestPlanDuration(BlenderTestCase):
    def test_duree_du_modele(self):
        edit = make_neoscenar_project(["S_0010_P_0010"])
        self.assertEqual(utils.plan_strips(edit)[0].frame_final_duration, TEMPLATE_FRAMES)
