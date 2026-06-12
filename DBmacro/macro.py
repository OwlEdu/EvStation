import os
from pymongo import MongoClient
import requests
import time

# ==================================
# 설정
# ==================================

MONGO_URI = os.environ.get("MONGO_URI")
PUBLIC_API_KEY = os.environ.get("PUBLIC_API_KEY")
KAKAO_REST_KEY = os.environ.get("KAKAO_REST_KEY")

API_URL = (
    "https://api.odcloud.kr/api/15086278/v1/"
    "uddi:616c301b-b2a5-4278-ba54-b6733d3702ed"
)

# ==================================
# MongoDB
# ==================================

client = MongoClient(MONGO_URI)

db = client["vibe_db"]

collection = db["charging_stations"]

# ==================================
# Kakao API
# ==================================

KAKAO_HEADERS = {
    "Authorization": f"KakaoAK {KAKAO_REST_KEY}"
}

# ==================================
# 검색 함수
# ==================================

def search_address(query):

    try:
        response = requests.get(
            "https://dapi.kakao.com/v2/local/search/address.json",
            params={"query": query},
            headers=KAKAO_HEADERS,
            timeout=10
        )

        docs = response.json().get("documents", [])

        if docs:
            return {
                "lat": float(docs[0]["y"]),
                "lng": float(docs[0]["x"])
            }

    except Exception as e:
        print("주소검색 오류:", e)

    return None


def search_keyword(query):

    try:
        response = requests.get(
            "https://dapi.kakao.com/v2/local/search/keyword.json",
            params={"query": query},
            headers=KAKAO_HEADERS,
            timeout=10
        )

        docs = response.json().get("documents", [])

        if docs:
            return {
                "lat": float(docs[0]["y"]),
                "lng": float(docs[0]["x"])
            }

    except Exception as e:
        print("키워드검색 오류:", e)

    return None


def geocode(address, station_name):

    # 1차 시도
    result = search_address(address)

    if result:
        return result

    # 2차 시도
    result = search_keyword(station_name)

    if result:
        print("충전소명으로 좌표 획득:", station_name)
        return result

    # 3차 시도
    result = search_keyword(
        f"{station_name} {address}"
    )

    if result:
        print("복합검색 성공:", station_name)
        return result

    print("좌표 변환 실패:", address)

    return None

# ==================================
# 공공데이터 API
# ==================================

def fetch_page(page):

    response = requests.get(
        API_URL,
        params={
            "page": page,
            "perPage": 100,
            "serviceKey": PUBLIC_API_KEY
        },
        timeout=20
    )

    response.raise_for_status()

    return response.json()

# ==================================
# 메인
# ==================================

def main():

    page = 1

    grouped = {}

    failed = []

    while True:

        print(f"\n페이지 조회: {page}")

        result = fetch_page(page)

        rows = result.get("data", [])

        if not rows:
            break

        for row in rows:

            station_name = str(
                row.get("충전소", "")
            ).strip()

            address = str(
                row.get("주소", "")
            ).strip()

            if not station_name:
                continue

            if not address:
                continue

            key = f"{station_name}|{address}"

            if key not in grouped:

                coords = geocode(
                    address,
                    station_name
                )

                if coords is None:

                    failed.append({
                        "name": station_name,
                        "address": address
                    })

                    continue

                charger_raw = str(
                    row.get("충전기타입", "")
                )

                grouped[key] = {
                    "name": station_name,
                    "address": address,
                    "lat": coords["lat"],
                    "lng": coords["lng"],
                    "chargerType": (
                        "급속"
                        if "DC" in charger_raw
                        else "완속"
                    ),
                    "operator": row.get("운영기관"),
                    "power": charger_raw,
                    "status": "available",
                    "totalChargers": 0,
                    "availableChargers": 0,
                    "pricePerKwh": 292
                }

                time.sleep(0.1)

            grouped[key]["totalChargers"] += 1
            grouped[key]["availableChargers"] += 1

        if len(rows) < 100:
            break

        page += 1

    print("\n충전소 수:", len(grouped))

    saved = 0

    for station in grouped.values():

        collection.update_one(
            {
                "name": station["name"],
                "address": station["address"]
            },
            {
                "$set": station
            },
            upsert=True
        )

        saved += 1

    print("\nMongoDB 저장 완료:", saved)

    if failed:

        print("\n===== 좌표 변환 실패 목록 =====")

        for item in failed:
            print(
                item["name"],
                "|",
                item["address"]
            )

        print(
            f"\n실패 건수: {len(failed)}"
        )

if __name__ == "__main__":
    main()