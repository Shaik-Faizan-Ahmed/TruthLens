#!/usr/bin/env python3
import requests
import json

# Change this if your server is on a different host/port
BASE_URL = "http://127.0.0.1:8000"

def test_health():
    print("🔹 Testing /health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print("Status Code:", response.status_code)
        print("Response JSON:", response.json())
    except Exception as e:
        print("❌ /health test failed:", e)

def test_root():
    print("\n🔹 Testing / root endpoint...")
    try:
        response = requests.get(BASE_URL)
        print("Status Code:", response.status_code)
        print("Response JSON:", json.dumps(response.json(), indent=2))
    except Exception as e:
        print("❌ Root endpoint test failed:", e)

def test_analyze():
    print("\n🔹 Testing /analyze endpoint...")

    # Safe content example
    safe_content = {
        "content": "Today is a beautiful day for learning new technologies.",
        "content_type": "text"
    }

    # Scam content example
    scam_content = {
        "content": "Congratulations! You won 50 lakh rupees. Share your OTP immediately!",
        "content_type": "text"
    }

    for desc, payload in [("Safe content", safe_content), ("Scam content", scam_content)]:
        print(f"\nTesting: {desc}")
        try:
            response = requests.post(f"{BASE_URL}/analyze", json=payload)
            if response.status_code == 200:
                result = response.json()
                print("Result JSON:", json.dumps(result, indent=2))
                print("Risk Level:", result.get("risk_level", "Unknown"))
                if "detected_patterns" in result:
                    print("Detected Patterns:", result["detected_patterns"])
            else:
                print(f"❌ Failed with status code: {response.status_code}")
        except Exception as e:
            print("❌ Analyze test failed:", e)

def test_patterns():
    print("\n🔹 Testing /patterns endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/patterns")
        print("Status Code:", response.status_code)
        print("Response JSON:", json.dumps(response.json(), indent=2))
    except Exception as e:
        print("❌ /patterns test failed:", e)

if __name__ == "__main__":
    test_health()
    test_root()
    test_patterns()
    test_analyze()
    print("\n🎉 All tests complete!")
