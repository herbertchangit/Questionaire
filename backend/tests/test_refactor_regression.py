"""
Regression suite for the P1 refactor (server.py → core + models + routes/*).
Validates all endpoints across auth, user profile, catalog, quiz, leaderboard,
admin (questions/notices/users/reports), and a smoke check for /api/live.
"""
import io
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://quizpop-preview-1.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"


# ---------------- Fixtures ----------------

@pytest.fixture(scope="session")
def demo_token():
    r = requests.post(f"{API}/auth/login", json={"username": "demo", "password": "demo123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["token"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------------- Auth ----------------

class TestAuth:
    def test_login_demo(self, demo_token):
        assert demo_token

    def test_login_admin_role(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=_h(admin_token))
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={"username": "demo", "password": "wrong"})
        assert r.status_code == 401

    def test_register_new_user(self):
        suffix = uuid.uuid4().hex[:8]
        payload = {
            "username": f"test_{suffix}",
            "email": f"test_{suffix}@example.com",
            "password": "secret123",
            "full_name": "Test User",
            "school_name": "Test School",
            "town": "Kuala Lumpur",
            "current_grade": 3,
            "date_of_birth": "2010-05-01",
            "latest_marks": {"bm": 70, "sejarah": 60, "science": 80},
            "language": "en",
        }
        r = requests.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body and "user" in body
        assert body["user"]["username"] == f"test_{suffix}"
        assert "password" not in body["user"]


# ---------------- User profile ----------------

class TestUserProfile:
    def test_get_profile_clean(self, demo_token):
        r = requests.get(f"{API}/user/profile", headers=_h(demo_token))
        assert r.status_code == 200
        data = r.json()
        assert data["username"] == "demo"
        assert "_id" not in data and "password" not in data

    def test_language_toggle(self, demo_token):
        for lang in ["zh", "en"]:
            r = requests.put(
                f"{API}/user/language", headers=_h(demo_token), json={"language": lang}
            )
            assert r.status_code == 200
            assert r.json()["language"] == lang


# ---------------- Catalog ----------------

class TestCatalog:
    def test_subjects_16(self, demo_token):
        r = requests.get(f"{API}/subjects", headers=_h(demo_token))
        assert r.status_code == 200
        subjects = r.json()
        assert len(subjects) == 16, f"expected 16 got {len(subjects)}"

    def test_levels_5(self, demo_token):
        r = requests.get(f"{API}/levels", headers=_h(demo_token))
        assert r.status_code == 200
        levels = r.json()
        assert len(levels) == 5
        for lvl in levels:
            assert "is_unlocked" in lvl and "stages_completed" in lvl

    def test_level_1_stages(self, demo_token):
        r = requests.get(f"{API}/levels/1/stages", headers=_h(demo_token))
        assert r.status_code == 200
        body = r.json()
        assert "stages" in body and len(body["stages"]) > 0
        assert body["stages"][0]["is_unlocked"] is True


# ---------------- Quiz ----------------

class TestQuiz:
    @pytest.fixture(scope="class")
    def first_stage_id(self, demo_token):
        r = requests.get(f"{API}/levels/1/stages", headers=_h(demo_token))
        return r.json()["stages"][0]["id"]

    def test_stage_play_no_leak(self, demo_token, first_stage_id):
        r = requests.get(f"{API}/stages/{first_stage_id}/play", headers=_h(demo_token))
        assert r.status_code == 200
        body = r.json()
        assert "questions" in body
        for q in body["questions"]:
            assert "correct_answer" not in q

    def test_submit_stage(self, demo_token, first_stage_id):
        play = requests.get(
            f"{API}/stages/{first_stage_id}/play", headers=_h(demo_token)
        ).json()
        answers = {q["id"]: 0 for q in play["questions"]}
        r = requests.post(
            f"{API}/stages/{first_stage_id}/submit",
            headers=_h(demo_token),
            json={"answers": answers, "time_spent": 30},
        )
        assert r.status_code == 200
        body = r.json()
        assert "score" in body
        assert "progression" in body
        assert "difficulty_gained" in body

    def test_user_progression(self, demo_token):
        r = requests.get(f"{API}/user/progression", headers=_h(demo_token))
        assert r.status_code == 200
        assert isinstance(r.json(), dict)

    def test_progress_stats(self, demo_token):
        r = requests.get(f"{API}/progress/stats", headers=_h(demo_token))
        assert r.status_code == 200
        body = r.json()
        for k in ("total_points", "stages_completed", "completion_percentage", "level_stats"):
            assert k in body

    def test_progress_history_breakdown(self, demo_token):
        r = requests.get(f"{API}/progress/history?limit=5", headers=_h(demo_token))
        assert r.status_code == 200
        items = r.json()
        for it in items:
            assert "subject_breakdown" in it
            assert "results" not in it


# ---------------- Community ----------------

class TestCommunity:
    def test_leaderboard(self, demo_token):
        r = requests.get(f"{API}/leaderboard", headers=_h(demo_token))
        assert r.status_code == 200
        users = r.json()
        if users:
            assert users[0]["rank"] == 1

    def test_welcome_message(self, demo_token):
        r = requests.get(f"{API}/welcome-message", headers=_h(demo_token))
        assert r.status_code == 200
        assert r.json() is not None

    def test_notices(self):
        r = requests.get(f"{API}/notices")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------------- Admin guards ----------------

class TestAdminGuards:
    def test_non_admin_403(self, demo_token):
        for path in ["/admin/questions", "/admin/notices", "/admin/users", "/admin/reports"]:
            r = requests.get(f"{API}{path}", headers=_h(demo_token))
            assert r.status_code == 403, f"{path} returned {r.status_code}"


# ---------------- Admin CRUD ----------------

class TestAdminQuestions:
    def test_question_crud_and_sequence(self, admin_token):
        # CREATE
        payload = {
            "subject_id": "bm",
            "level_num": 1,
            "stage_num": 1,
            "text_en": "TEST_RR Question?",
            "text_zh": "TEST_RR 问题?",
            "options_en": ["A", "B", "C", "D"],
            "options_zh": ["甲", "乙", "丙", "丁"],
            "correct_answer": 0,
            "points": 10,
            "difficulty": "apprentice",
            "sequence_number": 999,
        }
        c = requests.post(f"{API}/admin/questions", headers=_h(admin_token), json=payload)
        assert c.status_code == 200, c.text
        qid = c.json()["id"]

        # UPDATE
        payload["text_en"] = "TEST_RR Updated?"
        u = requests.put(
            f"{API}/admin/questions/{qid}", headers=_h(admin_token), json=payload
        )
        assert u.status_code == 200

        # PATCH sequence
        s = requests.patch(
            f"{API}/admin/questions/{qid}/sequence",
            headers=_h(admin_token),
            json={"sequence_number": 1234},
        )
        assert s.status_code == 200
        assert s.json()["sequence_number"] == 1234

        # DELETE
        d = requests.delete(f"{API}/admin/questions/{qid}", headers=_h(admin_token))
        assert d.status_code == 200

    def test_bulk_delete_empty_400(self, admin_token):
        r = requests.post(
            f"{API}/admin/questions/bulk-delete", headers=_h(admin_token), json={"ids": []}
        )
        assert r.status_code == 400

    def test_bulk_delete_valid(self, admin_token):
        # create two, then bulk delete
        ids = []
        for i in range(2):
            payload = {
                "subject_id": "bm",
                "level_num": 1,
                "stage_num": 1,
                "text_en": f"TEST_RR_BD_{i}",
                "text_zh": f"TEST_RR_BD_{i}",
                "options_en": ["A", "B"],
                "options_zh": ["甲", "乙"],
                "correct_answer": 0,
                "difficulty": "apprentice",
            }
            r = requests.post(f"{API}/admin/questions", headers=_h(admin_token), json=payload)
            ids.append(r.json()["id"])
        r = requests.post(
            f"{API}/admin/questions/bulk-delete",
            headers=_h(admin_token),
            json={"ids": ids},
        )
        assert r.status_code == 200
        assert r.json()["deleted"] == 2

    def test_bulk_csv_upload_two_options_and_invalid_skip(self, admin_token):
        csv_content = (
            "subject_id,level_num,stage_num,text_en,text_zh,"
            "option_a_en,option_b_en,option_c_en,option_d_en,correct_answer,difficulty\n"
            "bm,1,1,TEST_RR_CSV Q1,TEST_RR_CSV Q1,Aopt,Bopt,,,0,apprentice\n"
            "bm,1,1,TEST_RR_CSV Q2,TEST_RR_CSV Q2,Aopt,Bopt,,,1,apprentice\n"
            "bm,1,1,TEST_RR_CSV Q3,TEST_RR_CSV Q3,Aopt,Bopt,,,0,apprentice\n"
            "bm,1,1,TEST_RR_CSV Bad,TEST_RR_CSV Bad,Aopt,Bopt,,,2,apprentice\n"
        )
        files = {"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        r = requests.post(
            f"{API}/admin/questions/bulk", headers=_h(admin_token), files=files
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["uploaded"] == 3
        assert body["error_count"] == 1
        # cleanup
        q = requests.get(
            f"{API}/admin/questions?subject_id=bm&level_num=1", headers=_h(admin_token)
        ).json()
        ids = [x["id"] for x in q if str(x.get("text_en", "")).startswith("TEST_RR_CSV")]
        if ids:
            requests.post(
                f"{API}/admin/questions/bulk-delete",
                headers=_h(admin_token),
                json={"ids": ids},
            )


class TestAdminNotices:
    def test_notice_round_trip(self, admin_token):
        payload = {
            "title_en": "TEST_RR Notice",
            "title_zh": "TEST_RR 通知",
            "content_en": "body",
            "content_zh": "内容",
            "type": "announcement",
        }
        c = requests.post(f"{API}/admin/notices", headers=_h(admin_token), json=payload)
        assert c.status_code == 200
        nid = c.json()["id"]
        g = requests.get(f"{API}/admin/notices", headers=_h(admin_token))
        assert g.status_code == 200
        assert any(n["id"] == nid for n in g.json())
        d = requests.delete(f"{API}/admin/notices/{nid}", headers=_h(admin_token))
        assert d.status_code == 200


class TestAdminUsers:
    def test_users_list_no_password(self, admin_token):
        r = requests.get(f"{API}/admin/users", headers=_h(admin_token))
        assert r.status_code == 200
        users = r.json()
        assert len(users) > 0
        for u in users:
            assert "password" not in u

    def test_user_detail_with_history(self, admin_token):
        users = requests.get(f"{API}/admin/users", headers=_h(admin_token)).json()
        demo = next(
            u for u in users
            if u.get("username") == "demo" or u.get("name") == "demo"
            or u.get("email") == "demo@quiz.com"
        )
        r = requests.get(f"{API}/admin/users/{demo['id']}", headers=_h(admin_token))
        assert r.status_code == 200
        body = r.json()
        assert "recent_quiz_history" in body


class TestAdminReports:
    def test_reports(self, admin_token):
        r = requests.get(f"{API}/admin/reports", headers=_h(admin_token))
        assert r.status_code == 200
        body = r.json()
        for k in ("total_users", "total_quizzes_completed", "active_users_7d", "subject_stats"):
            assert k in body


# ---------------- LIVE Competition smoke (regression) ----------------

class TestLiveRegression:
    def test_tournament_round_trip(self, admin_token, demo_token):
        from datetime import datetime, timedelta, timezone
        future_iso = (datetime.now(timezone.utc) + timedelta(minutes=3)).isoformat()
        payload = {
            "title_en": "TEST_RR Tournament",
            "title_zh": "TEST_RR 比赛",
            "description": "regression",
            "scheduled_at": future_iso,
            "level_num": 1,
            "stage_num": 1,
            "subject_id": "bm",
        }
        c = requests.post(
            f"{API}/live/admin/tournaments", headers=_h(admin_token), json=payload
        )
        assert c.status_code in (200, 201), c.text
        tid = c.json().get("id") or c.json().get("tournament", {}).get("id")
        assert tid

        # demo can list
        g = requests.get(f"{API}/live/tournaments", headers=_h(demo_token))
        assert g.status_code == 200
        assert any(t.get("id") == tid for t in g.json())

        # cleanup
        d = requests.delete(
            f"{API}/live/admin/tournaments/{tid}", headers=_h(admin_token)
        )
        assert d.status_code in (200, 204)
