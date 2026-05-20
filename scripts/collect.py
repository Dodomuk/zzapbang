import os
import json
import requests
from datetime import datetime, timedelta
from pathlib import Path

API_KEY = os.environ["DATA_GO_KR_API_KEY"]
KAKAO_KEY = os.environ["KAKAO_REST_API_KEY"]

DATA_DIR = Path("public/data")
CACHE_FILE = DATA_DIR / "geocode-cache.json"
INDEX_FILE = DATA_DIR / "index.json"

# 서울 25개 자치구 법정동 코드
SEOUL_DISTRICTS = {
    "11110": "종로구", "11140": "중구",    "11170": "용산구", "11200": "성동구",
    "11215": "광진구", "11230": "동대문구", "11260": "중랑구", "11290": "성북구",
    "11305": "강북구", "11320": "도봉구",  "11350": "노원구", "11380": "은평구",
    "11410": "서대문구","11440": "마포구",  "11470": "양천구", "11500": "강서구",
    "11530": "구로구", "11545": "금천구",  "11560": "영등포구","11590": "동작구",
    "11620": "관악구", "11650": "서초구",  "11680": "강남구", "11710": "송파구",
    "11740": "강동구",
}

API_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent"
GEOCODE_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"


def fetch_district(lawd_cd, deal_ymd):
    items = []
    page = 1
    while True:
        resp = requests.get(API_URL, params={
            "serviceKey": API_KEY,
            "LAWD_CD": lawd_cd,
            "DEAL_YMD": deal_ymd,
            "numOfRows": 100,
            "pageNo": page,
            "_type": "json",
        }, timeout=30)
        resp.raise_for_status()
        body = resp.json().get("response", {}).get("body", {})
        raw = body.get("items", {})
        if not raw:
            break
        batch = raw.get("item", [])
        if isinstance(batch, dict):
            batch = [batch]
        items.extend(batch)
        if len(items) >= int(body.get("totalCount", 0)):
            break
        page += 1
    return items


def geocode(cache_key, gu, apt_name, cache):
    if cache_key in cache:
        return cache[cache_key]
    import re
    clean = re.sub(r"[()（）\[\]{}·]", " ", apt_name).strip()
    query = f"{gu} {clean}"
    resp = requests.get(GEOCODE_URL,
        headers={"Authorization": f"KakaoAK {KAKAO_KEY}"},
        params={"query": query, "size": 1},
        timeout=10)
    resp.raise_for_status()
    docs = resp.json().get("documents", [])
    docs = [d for d in docs if "서울" in d.get("address_name", "")]
    result = {"lat": float(docs[0]["y"]), "lng": float(docs[0]["x"])} if docs else None
    cache[cache_key] = result
    return result


def main():
    yesterday = datetime.now() - timedelta(days=1)
    target_date = yesterday.strftime("%Y-%m-%d")
    deal_ymd = yesterday.strftime("%Y%m")
    target_day = str(int(yesterday.strftime("%d")))  # "01" → "1"

    cache = json.loads(CACHE_FILE.read_text(encoding="utf-8")) if CACHE_FILE.exists() else {}
    records = []

    for lawd_cd, gu_name in SEOUL_DISTRICTS.items():
        print(f"수집 중: {gu_name}")
        try:
            for item in fetch_district(lawd_cd, deal_ymd):
                # 날짜 필터: 어제 계약 건만
                if str(item.get("dealDay", "")).strip() != target_day:
                    continue
                # 전세만 (monthlyRent = 0)
                monthly = str(item.get("monthlyRent", "0") or "0").replace(",", "").strip()
                if int(monthly or "0") != 0:
                    continue

                dong = str(item.get("umdNm", "")).strip()
                apt_name = str(item.get("aptNm", "")).strip()
                # 아파트명으로 지오코딩하는 게 주소보다 정확도 높음
                geocode_key = f"서울특별시 {gu_name} {dong} {apt_name}"

                coords = geocode(geocode_key, gu_name, apt_name, cache)
                records.append({
                    "date": target_date,
                    "gu": gu_name,
                    "dong": dong,
                    "apartment": apt_name,
                    "area": str(item.get("excluUseAr", "")).strip(),
                    "floor": str(item.get("floor", "")).strip(),
                    "deposit": str(item.get("deposit", "")).strip(),
                    "address": geocode_key,
                    "lat": coords["lat"] if coords else None,
                    "lng": coords["lng"] if coords else None,
                })
        except Exception as e:
            print(f"오류 ({gu_name}): {e}")

    print(f"수집 완료: {len(records)}건")

    # 일별 파일 저장
    (DATA_DIR / f"{target_date}.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # 지오코딩 캐시 저장
    CACHE_FILE.write_text(
        json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # index.json 업데이트
    index = json.loads(INDEX_FILE.read_text(encoding="utf-8")) if INDEX_FILE.exists() else []
    if target_date not in index:
        index = sorted(set(index) | {target_date}, reverse=True)
        INDEX_FILE.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"저장: data/{target_date}.json")


if __name__ == "__main__":
    main()
