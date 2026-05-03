"""
Backend API Tests for Analytics Feature
Tests the analytics summary and detailed endpoints for the Online Quiz App
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@quiz.com"
ADMIN_PASSWORD = "admin123"
DEMO_EMAIL = "demo@quiz.com"
DEMO_PASSWORD = "demo123"


class TestAuthAndSetup:
    """Authentication tests to ensure we can access admin endpoints"""
    
    def test_admin_login_success(self):
        """Test admin login returns token and user data"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["role"] == "admin", "User is not admin"
        assert data["user"]["email"] == ADMIN_EMAIL
    
    def test_demo_user_login_success(self):
        """Test demo user login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200, f"Demo login failed: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "user"
    
    def test_invalid_login(self):
        """Test invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


@pytest.fixture
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def user_token():
    """Get regular user authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DEMO_EMAIL,
        "password": DEMO_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("User authentication failed")


class TestAnalyticsSummaryAPI:
    """Tests for /api/admin/analytics/summary endpoint"""
    
    def test_summary_returns_200_for_admin(self, admin_token):
        """Test analytics summary endpoint returns 200 for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Summary API failed: {response.text}"
    
    def test_summary_contains_required_fields(self, admin_token):
        """Test summary response contains DAU, completion_rate, avg_score, retention_7d"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Check all required fields exist
        assert "dau" in data, "DAU field missing"
        assert "completion_rate" in data, "completion_rate field missing"
        assert "avg_score" in data, "avg_score field missing"
        assert "retention_7d" in data, "retention_7d field missing"
        assert "total_users" in data, "total_users field missing"
    
    def test_summary_field_types(self, admin_token):
        """Test summary fields have correct types"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        # DAU should be integer
        assert isinstance(data["dau"], int), f"DAU should be int, got {type(data['dau'])}"
        # completion_rate should be numeric
        assert isinstance(data["completion_rate"], (int, float)), "completion_rate should be numeric"
        # avg_score should be numeric
        assert isinstance(data["avg_score"], (int, float)), "avg_score should be numeric"
        # retention_7d should be numeric
        assert isinstance(data["retention_7d"], (int, float)), "retention_7d should be numeric"
    
    def test_summary_requires_admin_role(self, user_token):
        """Test that regular users cannot access analytics summary"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/summary",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403, "Non-admin should get 403"
    
    def test_summary_requires_authentication(self):
        """Test that unauthenticated requests are rejected"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/summary")
        assert response.status_code in [401, 403], "Unauthenticated should be rejected"


class TestAnalyticsDetailedAPI:
    """Tests for /api/admin/analytics/detailed endpoint"""
    
    def test_detailed_returns_200_for_admin(self, admin_token):
        """Test analytics detailed endpoint returns 200 for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/detailed",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Detailed API failed: {response.text}"
    
    def test_detailed_contains_required_fields(self, admin_token):
        """Test detailed response contains dau_trend, completion_trend, score_trend, retention, category_performance"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/detailed",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Check all required fields exist
        assert "dau_trend" in data, "dau_trend field missing"
        assert "completion_trend" in data, "completion_trend field missing"
        assert "score_trend" in data, "score_trend field missing"
        assert "retention" in data, "retention field missing"
        assert "category_performance" in data, "category_performance field missing"
        assert "avg_improvement" in data, "avg_improvement field missing"
    
    def test_dau_trend_structure(self, admin_token):
        """Test DAU trend has correct structure (14 days of data)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/detailed",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        dau_trend = data["dau_trend"]
        assert isinstance(dau_trend, list), "dau_trend should be a list"
        assert len(dau_trend) == 14, f"dau_trend should have 14 days, got {len(dau_trend)}"
        
        # Check each entry has date and users
        for entry in dau_trend:
            assert "date" in entry, "Each dau_trend entry should have 'date'"
            assert "users" in entry, "Each dau_trend entry should have 'users'"
            assert isinstance(entry["users"], int), "users should be integer"
    
    def test_completion_trend_structure(self, admin_token):
        """Test completion trend has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/detailed",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        completion_trend = data["completion_trend"]
        assert isinstance(completion_trend, list), "completion_trend should be a list"
        assert len(completion_trend) == 14, f"completion_trend should have 14 days"
        
        for entry in completion_trend:
            assert "date" in entry, "Each entry should have 'date'"
            assert "completions" in entry, "Each entry should have 'completions'"
    
    def test_score_trend_structure(self, admin_token):
        """Test score trend has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/detailed",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        score_trend = data["score_trend"]
        assert isinstance(score_trend, list), "score_trend should be a list"
        assert len(score_trend) == 14, f"score_trend should have 14 days"
        
        for entry in score_trend:
            assert "date" in entry, "Each entry should have 'date'"
            assert "avgScore" in entry, "Each entry should have 'avgScore'"
    
    def test_retention_structure(self, admin_token):
        """Test retention has day3 and day7 fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/detailed",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        retention = data["retention"]
        assert isinstance(retention, dict), "retention should be a dict"
        assert "day3" in retention, "retention should have 'day3'"
        assert "day7" in retention, "retention should have 'day7'"
        assert isinstance(retention["day3"], (int, float)), "day3 should be numeric"
        assert isinstance(retention["day7"], (int, float)), "day7 should be numeric"
    
    def test_category_performance_structure(self, admin_token):
        """Test category performance has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/detailed",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        category_performance = data["category_performance"]
        assert isinstance(category_performance, list), "category_performance should be a list"
        
        # If there's data, check structure
        if len(category_performance) > 0:
            for entry in category_performance:
                assert "category" in entry, "Each entry should have 'category'"
                assert "avgScore" in entry, "Each entry should have 'avgScore'"
                assert "attempts" in entry, "Each entry should have 'attempts'"
    
    def test_detailed_requires_admin_role(self, user_token):
        """Test that regular users cannot access detailed analytics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/detailed",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403, "Non-admin should get 403"
    
    def test_detailed_requires_authentication(self):
        """Test that unauthenticated requests are rejected"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/detailed")
        assert response.status_code in [401, 403], "Unauthenticated should be rejected"


class TestActivityLogging:
    """Tests for activity logging functionality"""
    
    def test_login_logs_activity(self, admin_token):
        """Test that login creates activity log entry (verified by DAU count)"""
        # Login should have been logged, so DAU should be at least 1
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        # After login, DAU should be at least 1
        assert data["dau"] >= 1, "DAU should be at least 1 after login"


class TestAdminDashboardEndpoints:
    """Tests for admin dashboard related endpoints"""
    
    def test_admin_quizzes_endpoint(self, admin_token):
        """Test admin can get all quizzes"""
        response = requests.get(
            f"{BASE_URL}/api/admin/quizzes",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_admin_users_endpoint(self, admin_token):
        """Test admin can get all users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
