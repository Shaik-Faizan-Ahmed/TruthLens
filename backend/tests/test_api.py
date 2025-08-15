import requests

# Change if running on a different port
BASE_URL = "http://127.0.0.1:8000"

def test_health_check():
    response = requests.get(f"{BASE_URL}/")
    print("Status Code:", response.status_code)
    print("Response JSON:", response.json())

if __name__ == "__main__":
    test_health_check()
