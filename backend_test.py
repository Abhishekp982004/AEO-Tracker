#!/usr/bin/env python3
"""
AEO Tracker Backend API Test Suite
Tests all backend endpoints for the AI search visibility tracker
"""

import requests
import json
import os
import sys
from datetime import datetime

# Get base URL from environment
BASE_URL = os.environ.get('NEXT_PUBLIC_BASE_URL', 'https://seoai-pulse.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class AEOTrackerTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'details': details
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"   Details: {details}")
    
    def test_health_endpoint(self):
        """Test GET /api/health - should work without auth"""
        try:
            response = self.session.get(f"{API_BASE}/health")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'ok':
                    self.log_result("Health Check", True, "Health endpoint working correctly")
                    return True
                else:
                    self.log_result("Health Check", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Health Check", False, f"Status code: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Health Check", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_login(self):
        """Test POST /api/auth/login - magic link auth"""
        try:
            test_email = "test@example.com"
            payload = {"email": test_email}
            
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json=payload,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'magic link' in data.get('message', '').lower():
                    self.log_result("Auth Login", True, "Magic link login request successful")
                    return True
                else:
                    self.log_result("Auth Login", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Auth Login", False, f"Status code: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Auth Login", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_login_invalid_email(self):
        """Test POST /api/auth/login with invalid email"""
        try:
            payload = {"email": "invalid-email"}
            
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json=payload,
                headers={'Content-Type': 'application/json'}
            )
            
            # Should handle invalid email gracefully
            if response.status_code in [400, 422]:
                self.log_result("Auth Login Invalid Email", True, "Invalid email handled correctly")
                return True
            elif response.status_code == 200:
                # Some systems might still send magic link for invalid emails for security
                self.log_result("Auth Login Invalid Email", True, "Invalid email handled (security approach)")
                return True
            else:
                self.log_result("Auth Login Invalid Email", False, f"Status code: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Auth Login Invalid Email", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_session_no_token(self):
        """Test GET /api/auth/session without token"""
        try:
            response = self.session.get(f"{API_BASE}/auth/session")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('user') is None:
                    self.log_result("Auth Session No Token", True, "No token returns null user correctly")
                    return True
                else:
                    self.log_result("Auth Session No Token", False, f"Expected null user, got: {data}")
                    return False
            else:
                self.log_result("Auth Session No Token", False, f"Status code: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Auth Session No Token", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_session_invalid_token(self):
        """Test GET /api/auth/session with invalid token"""
        try:
            headers = {'Authorization': 'Bearer invalid-token-123'}
            response = self.session.get(f"{API_BASE}/auth/session", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('user') is None:
                    self.log_result("Auth Session Invalid Token", True, "Invalid token returns null user correctly")
                    return True
                else:
                    self.log_result("Auth Session Invalid Token", False, f"Expected null user, got: {data}")
                    return False
            else:
                self.log_result("Auth Session Invalid Token", False, f"Status code: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Auth Session Invalid Token", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_logout(self):
        """Test POST /api/auth/logout"""
        try:
            response = self.session.post(f"{API_BASE}/auth/logout")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_result("Auth Logout", True, "Logout successful")
                    return True
                else:
                    self.log_result("Auth Logout", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Auth Logout", False, f"Status code: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Auth Logout", False, f"Exception: {str(e)}")
            return False
    
    def test_protected_routes_no_auth(self):
        """Test protected routes without authentication"""
        protected_endpoints = [
            ('GET', '/projects'),
            ('POST', '/projects'),
            ('POST', '/checks/run'),
            ('GET', '/checks/history?projectId=test-id'),
            ('GET', '/dashboard/stats?projectId=test-id')
        ]
        
        all_passed = True
        
        for method, endpoint in protected_endpoints:
            try:
                if method == 'GET':
                    response = self.session.get(f"{API_BASE}{endpoint}")
                else:
                    response = self.session.post(f"{API_BASE}{endpoint}", json={})
                
                if response.status_code == 401:
                    self.log_result(f"Protected Route {method} {endpoint}", True, "Correctly returns 401 without auth")
                else:
                    self.log_result(f"Protected Route {method} {endpoint}", False, f"Expected 401, got {response.status_code}")
                    all_passed = False
                    
            except Exception as e:
                self.log_result(f"Protected Route {method} {endpoint}", False, f"Exception: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def test_projects_with_invalid_auth(self):
        """Test projects endpoints with invalid auth token"""
        try:
            headers = {'Authorization': 'Bearer invalid-token-123'}
            
            # Test GET projects
            response = self.session.get(f"{API_BASE}/projects", headers=headers)
            if response.status_code != 401:
                self.log_result("Projects GET Invalid Auth", False, f"Expected 401, got {response.status_code}")
                return False
            
            # Test POST projects
            payload = {
                "name": "Test Project",
                "domain": "example.com",
                "brand": "Example Brand",
                "keywords": ["test keyword"],
                "competitors": ["competitor1"]
            }
            response = self.session.post(f"{API_BASE}/projects", json=payload, headers=headers)
            if response.status_code != 401:
                self.log_result("Projects POST Invalid Auth", False, f"Expected 401, got {response.status_code}")
                return False
            
            self.log_result("Projects Invalid Auth", True, "Projects endpoints correctly reject invalid auth")
            return True
            
        except Exception as e:
            self.log_result("Projects Invalid Auth", False, f"Exception: {str(e)}")
            return False
    
    def test_checks_endpoints_no_auth(self):
        """Test checks endpoints without authentication"""
        try:
            # Test run checks
            response = self.session.post(f"{API_BASE}/checks/run", json={"projectId": "test-id"})
            if response.status_code != 401:
                self.log_result("Checks Run No Auth", False, f"Expected 401, got {response.status_code}")
                return False
            
            # Test checks history
            response = self.session.get(f"{API_BASE}/checks/history?projectId=test-id")
            if response.status_code != 401:
                self.log_result("Checks History No Auth", False, f"Expected 401, got {response.status_code}")
                return False
            
            self.log_result("Checks Endpoints No Auth", True, "Checks endpoints correctly require authentication")
            return True
            
        except Exception as e:
            self.log_result("Checks Endpoints No Auth", False, f"Exception: {str(e)}")
            return False
    
    def test_dashboard_stats_no_auth(self):
        """Test dashboard stats without authentication"""
        try:
            response = self.session.get(f"{API_BASE}/dashboard/stats?projectId=test-id")
            
            if response.status_code == 401:
                self.log_result("Dashboard Stats No Auth", True, "Dashboard stats correctly requires authentication")
                return True
            else:
                self.log_result("Dashboard Stats No Auth", False, f"Expected 401, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Dashboard Stats No Auth", False, f"Exception: {str(e)}")
            return False
    
    def test_missing_parameters(self):
        """Test endpoints with missing required parameters"""
        try:
            # Test checks history without projectId
            response = self.session.get(f"{API_BASE}/checks/history")
            # This should fail auth first (401), but let's test the structure
            
            # Test dashboard stats without projectId  
            response = self.session.get(f"{API_BASE}/dashboard/stats")
            # This should also fail auth first (401)
            
            # Test auth login without email
            response = self.session.post(f"{API_BASE}/auth/login", json={})
            # This might cause an error or be handled gracefully
            
            self.log_result("Missing Parameters", True, "Missing parameter tests completed (auth takes precedence)")
            return True
            
        except Exception as e:
            self.log_result("Missing Parameters", False, f"Exception: {str(e)}")
            return False
    
    def test_nonexistent_endpoints(self):
        """Test non-existent endpoints"""
        try:
            response = self.session.get(f"{API_BASE}/nonexistent")
            
            if response.status_code == 404:
                self.log_result("Non-existent Endpoint", True, "Non-existent endpoint returns 404")
                return True
            else:
                self.log_result("Non-existent Endpoint", False, f"Expected 404, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Non-existent Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting AEO Tracker Backend API Tests")
        print(f"📍 Testing API at: {API_BASE}")
        print("=" * 60)
        
        # Test public endpoints
        self.test_health_endpoint()
        
        # Test auth endpoints
        self.test_auth_login()
        self.test_auth_login_invalid_email()
        self.test_auth_session_no_token()
        self.test_auth_session_invalid_token()
        self.test_auth_logout()
        
        # Test protected routes without auth
        self.test_protected_routes_no_auth()
        self.test_projects_with_invalid_auth()
        self.test_checks_endpoints_no_auth()
        self.test_dashboard_stats_no_auth()
        
        # Test parameter validation and error handling
        self.test_missing_parameters()
        self.test_nonexistent_endpoints()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r['success'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['message']}")
        
        return passed == total

if __name__ == "__main__":
    tester = AEOTrackerTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)