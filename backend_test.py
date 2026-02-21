import requests
import sys
import json
from datetime import datetime
from time import sleep

class QuizAppAPITester:
    def __init__(self, base_url="https://quiz-hub-pro.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.quiz_id = None
        self.question_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text[:200]}...")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else {}

        except requests.exceptions.RequestException as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_data = {
            "name": f"Test User {timestamp}",
            "email": f"testuser{timestamp}@test.com",
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "api/auth/register",
            200,
            data=test_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"✅ User registered successfully, token acquired")
            return True
        return False

    def test_user_login(self, email="demo@quiz.com", password="demo123"):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"✅ User logged in successfully, token acquired")
            return True
        return False

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": "admin@quiz.com", "password": "admin123"}
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"✅ Admin logged in successfully, token acquired")
            return True
        return False

    def test_get_user_profile(self):
        """Test get current user profile"""
        if not self.token:
            print("❌ No user token available")
            return False
            
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "api/auth/me",
            200,
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        if success and 'email' in response:
            print(f"✅ User profile retrieved: {response.get('name', 'N/A')}")
            return True
        return False

    def test_get_user_stats(self):
        """Test get user statistics"""
        if not self.token:
            print("❌ No user token available")
            return False
            
        success, response = self.run_test(
            "Get User Statistics",
            "GET",
            "api/users/stats",
            200,
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        if success:
            print(f"✅ User stats: Level {response.get('level', 0)}, Points {response.get('points', 0)}")
            return True
        return False

    def test_get_categories(self):
        """Test get categories"""
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "api/categories",
            200
        )
        
        if success:
            print(f"✅ Categories retrieved: {len(response)} categories")
            return True
        return False

    def test_get_quizzes(self):
        """Test get available quizzes for user"""
        if not self.token:
            print("❌ No user token available")
            return False
            
        success, response = self.run_test(
            "Get Available Quizzes",
            "GET",
            "api/quizzes",
            200,
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        if success:
            print(f"✅ Available quizzes: {len(response)} quizzes")
            if response:
                self.quiz_id = response[0]['id']
                print(f"✅ Using quiz ID for testing: {self.quiz_id}")
            return True
        return False

    def test_get_quiz_details(self):
        """Test get quiz details"""
        if not self.token or not self.quiz_id:
            print("❌ No user token or quiz ID available")
            return False
            
        success, response = self.run_test(
            "Get Quiz Details",
            "GET",
            f"api/quizzes/{self.quiz_id}",
            200,
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        if success and 'questions' in response:
            print(f"✅ Quiz details retrieved with {len(response['questions'])} questions")
            return True
        return False

    def test_submit_quiz(self):
        """Test quiz submission"""
        if not self.token or not self.quiz_id:
            print("❌ No user token or quiz ID available")
            return False

        # Get quiz details first to create proper answers
        quiz_response = requests.get(
            f"{self.base_url}/api/quizzes/{self.quiz_id}",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        if quiz_response.status_code != 200:
            print("❌ Failed to get quiz details for submission")
            return False
            
        quiz_data = quiz_response.json()
        questions = quiz_data.get('questions', [])
        
        # Create answers (selecting first option for all questions)
        answers = {question['id']: 0 for question in questions}
        
        submission_data = {
            "quiz_id": self.quiz_id,
            "answers": answers,
            "time_taken": 120
        }
            
        success, response = self.run_test(
            "Submit Quiz",
            "POST",
            f"api/quizzes/{self.quiz_id}/submit",
            200,
            data=submission_data,
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        if success:
            print(f"✅ Quiz submitted successfully")
            if response.get('level_up'):
                print(f"🎉 Level up achieved! New level: {response.get('new_level')}")
            return True
        return False

    def test_admin_create_quiz(self):
        """Test admin quiz creation"""
        if not self.admin_token:
            print("❌ No admin token available")
            return False
            
        quiz_data = {
            "title": f"Test Quiz {datetime.now().strftime('%H%M%S')}",
            "description": "A test quiz created by automated testing",
            "category": "Testing",
            "level_required": 1,
            "duration_minutes": 5
        }
            
        success, response = self.run_test(
            "Admin Create Quiz",
            "POST",
            "api/admin/quizzes",
            200,
            data=quiz_data,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if success and 'id' in response:
            self.quiz_id = response['id']
            print(f"✅ Quiz created successfully with ID: {self.quiz_id}")
            return True
        return False

    def test_admin_get_quizzes(self):
        """Test admin get all quizzes"""
        if not self.admin_token:
            print("❌ No admin token available")
            return False
            
        success, response = self.run_test(
            "Admin Get Quizzes",
            "GET",
            "api/admin/quizzes",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if success:
            print(f"✅ Admin quizzes retrieved: {len(response)} quizzes")
            return True
        return False

    def test_admin_create_question(self):
        """Test admin question creation"""
        if not self.admin_token or not self.quiz_id:
            print("❌ No admin token or quiz ID available")
            return False
            
        question_data = {
            "quiz_id": self.quiz_id,
            "text": "What is the capital of France?",
            "type": "text",
            "options": ["London", "Berlin", "Paris", "Madrid"],
            "correct_answer": 2,
            "points": 10
        }
            
        success, response = self.run_test(
            "Admin Create Question",
            "POST",
            "api/admin/questions",
            200,
            data=question_data,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if success and 'id' in response:
            self.question_id = response['id']
            print(f"✅ Question created successfully with ID: {self.question_id}")
            return True
        return False

    def test_admin_get_questions(self):
        """Test admin get questions for quiz"""
        if not self.admin_token or not self.quiz_id:
            print("❌ No admin token or quiz ID available")
            return False
            
        success, response = self.run_test(
            "Admin Get Questions",
            "GET",
            f"api/admin/questions/{self.quiz_id}",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if success:
            print(f"✅ Questions retrieved: {len(response)} questions")
            return True
        return False

    def test_tts_generation(self):
        """Test TTS audio generation"""
        if not self.admin_token:
            print("❌ No admin token available")
            return False
            
        tts_data = {
            "text": "This is a test question for TTS generation",
            "voice": "alloy"
        }
            
        success, response = self.run_test(
            "TTS Audio Generation",
            "POST",
            "api/admin/questions/tts",
            200,
            data=tts_data,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if success and 'audio_data' in response:
            print(f"✅ TTS audio generated successfully")
            return True
        return False

    def test_admin_delete_question(self):
        """Test admin delete question"""
        if not self.admin_token or not self.question_id:
            print("❌ No admin token or question ID available")
            return False
            
        success, response = self.run_test(
            "Admin Delete Question",
            "DELETE",
            f"api/admin/questions/{self.question_id}",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if success:
            print(f"✅ Question deleted successfully")
            return True
        return False

    def test_admin_delete_quiz(self):
        """Test admin delete quiz"""
        if not self.admin_token or not self.quiz_id:
            print("❌ No admin token or quiz ID available")
            return False
            
        success, response = self.run_test(
            "Admin Delete Quiz",
            "DELETE",
            f"api/admin/quizzes/{self.quiz_id}",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if success:
            print(f"✅ Quiz deleted successfully")
            return True
        return False

def main():
    """Main test execution"""
    print("🚀 Starting QuizPop API Testing...")
    print(f"Testing against: https://quiz-hub-pro.preview.emergentagent.com")
    
    tester = QuizAppAPITester()
    
    # Test sequence
    tests = [
        # User Authentication Tests
        ("User Registration", tester.test_user_registration),
        ("Demo User Login", lambda: tester.test_user_login("demo@quiz.com", "demo123")),
        ("Get User Profile", tester.test_get_user_profile),
        ("Get User Stats", tester.test_get_user_stats),
        
        # Public API Tests
        ("Get Categories", tester.test_get_categories),
        ("Get Available Quizzes", tester.test_get_quizzes),
        ("Get Quiz Details", tester.test_quiz_details),
        ("Submit Quiz", tester.test_submit_quiz),
        
        # Admin Authentication Tests
        ("Admin Login", tester.test_admin_login),
        ("Admin Get Quizzes", tester.test_admin_get_quizzes),
        
        # Admin CRUD Tests
        ("Admin Create Quiz", tester.test_admin_create_quiz),
        ("Admin Create Question", tester.test_admin_create_question),
        ("Admin Get Questions", tester.test_admin_get_questions),
        
        # TTS Integration Test
        ("TTS Audio Generation", tester.test_tts_generation),
        
        # Cleanup Tests
        ("Admin Delete Question", tester.test_admin_delete_question),
        ("Admin Delete Quiz", tester.test_admin_delete_quiz)
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            if not result:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print final results
    print(f"\n" + "="*60)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed Tests:")
        for test in failed_tests:
            print(f"  • {test}")
    else:
        print(f"\n🎉 All tests passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)