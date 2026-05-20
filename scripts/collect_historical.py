"""
과거 아파트 전월세 실거래가 일괄 수집 스크립트

사용법:
  python scripts/collect_historical.py --start 2025-01-01
  python scripts/collect_historical.py --start 2025-01-01 --end 2025-03-31
  python scripts/collect_historical.py --start 2025-01-01 --force   # 기존 파일도 재수집

환경 변수: DATA_GO_KR_API_KEY, KAKAO_REST_API_KEY
"""

import os
import re
import sys
import json
import argparse
import requests
from datetime import date, timedelta
from pathlib import Path

API_KEY = os.environ["DATA_GO_KR_API_KEY"]
KAKAO_KEY = os.environ["KAKAO_REST_API_KEY"]

DATA_DIR = Path("public/data")
CACHE_FILE = DATA_DIR / "geocode-cache.json"
INDEX_FILE = DATA_DIR / "index.json"

SEOUL_DISTRICTS = {
    "11110": "종로구",  "11140": "중구",     "11170": "용산구",  "11200": "성동구",
    "11215": "광진구",  "11230": "동대문구", "11260": "중랑구",  "11290": "성북구",
    "11305": "강북구",  "11320": "도봉구",   "11350": "노원구",  "11380": "은평구",
    "11410": "서대문구","11440": "마포구",   "11470": "양천구",  "11500": "강서구",
    "11530": "구로구",  "11545": "금천구",   "11560": "영등포구","11590": "동작구",
    "11620": "관악구",  "11650": "서초구",   "11680": "강남구",  "11710": "송파구",
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
    clean = re.sub(r"[()（）\[\]{}·]", " ", apt_name).strip()
    resp = requests.get(GEOCODE_URL,
        headers={"Authorization": f"KakaoAK {KAKAO_KEY}"},
        params={"query": f"{gu} {clean}", "size": 1},
        timeout=10)
    resp.raise_for_status()
    docs = [d for d in resp.json().get("documents", []) if "서울" in d.get("address_name", "")]
    result = {"lat": float(docs[0]["y"]), "lng": float(docs[0]["x"])} if docs else None
    cache[cache_key] = result
    return result


def collect_month(year, month, target_days, cache):
    """월 전체를 한 번에 수집하고 날짜별로 분류해 반환."""
    deal_ymd = f"{year}{month:02d}"
    day_records: dict[int, list] = {d: [] for d in target_days}

    for lawd_cd, gu_name in SEOUL_DISTRICTS.items():
        try:
            for item in fetch_district(lawd_cd, deal_ymd):
                day = int(str(item.get("dealDay", "0")).strip() or "0")
                if day not in target_days:
                    continue

                monthly = str(item.get("monthlyRent", "0") or "0").replace(",", "").strip()
                monthly_val = int(monthly or "0")
                record_type = "월세" if monthly_val > 0 else "전세"

                dong = str(item.get("umdNm", "")).strip()
                apt_name = str(item.get("aptNm", "")).strip()
                geocode_key = f"서울특별시 {gu_name} {dong} {apt_name}"

                coords = geocode(geocode_key, gu_name, apt_name, cache)
                record = {
                    "date": f"{year}-{month:02d}-{day:02d}",
                    "type": record_type,
                    "gu": gu_name,
                    "dong": dong,
                    "apartment": apt_name,
                    "area": str(item.get("excluUseAr", "")).strip(),
                    "floor": str(item.get("floor", "")).strip(),
                    "deposit": str(item.get("deposit", "")).strip(),
                    "address": geocode_key,
                    "lat": coords["lat"] if coords else None,
                    "lng": coords["lng"] if coords else None,
                }
                if record_type == "월세":
                    record["monthlyRent"] = monthly
                day_records[day].append(record)
        except Exception as e:
            print(f"  오류 ({gu_name}): {e}")

    return day_records


def main():
    parser = argparse.ArgumentParser(description="과거 전월세 실거래가 일괄 수집")
    parser.add_argument("--start", required=True, help="시작 날짜 YYYY-MM-DD")
    parser.add_argument("--end", default=None, help="종료 날짜 YYYY-MM-DD (기본: 어제)")
    parser.add_argument("--force", action="store_true", help="이미 파일이 있는 날짜도 재수집")
    args = parser.parse_args()

    start = date.fromisoformat(args.start)
    end = date.fromisoformat(args.end) if args.end else date.today() - timedelta(days=1)

    if start > end:
        print("오류: --start 가 --end 보다 늦습니다.")
        sys.exit(1)

    print(f"수집 범위: {start} ~ {end}")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    cache = json.loads(CACHE_FILE.read_text(encoding="utf-8")) if CACHE_FILE.exists() else {}

    # 수집할 날짜를 월별로 그룹핑
    months: dict[tuple, list[int]] = {}
    d = start
    while d <= end:
        if not args.force and (DATA_DIR / f"{d.isoformat()}.json").exists():
            d += timedelta(days=1)
            continue
        months.setdefault((d.year, d.month), []).append(d.day)
        d += timedelta(days=1)

    if not months:
        print("수집할 날짜가 없습니다. (이미 모두 존재하거나 범위가 비어있음)")
        print("재수집하려면 --force 옵션을 사용하세요.")
        sys.exit(0)

    skipped = (end - start).days + 1 - sum(len(v) for v in months.values())
    if skipped:
        print(f"  → 기존 파일 {skipped}일치 건너뜀 (--force 로 재수집 가능)")

    all_saved = []
    for (year, month), days in sorted(months.items()):
        print(f"\n▶ {year}년 {month}월 ({len(days)}일치) 수집 중…")
        day_records = collect_month(year, month, set(days), cache)

        for day in sorted(days):
            date_str = f"{year}-{month:02d}-{day:02d}"
            records = day_records.get(day, [])
            (DATA_DIR / f"{date_str}.json").write_text(
                json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            print(f"  저장: {date_str}.json  ({len(records)}건)")
            all_saved.append(date_str)

        # 월 완료 후 캐시 저장 (중간에 중단돼도 캐시 유실 방지)
        CACHE_FILE.write_text(
            json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    # index.json 재생성
    existing = sorted(
        [f.stem for f in DATA_DIR.glob("????-??-??.json")],
        reverse=True,
    )
    INDEX_FILE.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n✅ 완료! 새로 수집 {len(all_saved)}일치 · index.json 업데이트 ({len(existing)}개 날짜 수록)")


if __name__ == "__main__":
    main()
