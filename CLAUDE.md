# Zzapbang — 서울 전세 실거래가 지도 서비스

## 프로젝트 개요
서울 전세 거래 기록을 매일 수집해 카카오맵 위에 시각화하는 정적 웹 서비스.
서버 없이 GitHub Actions + Vercel로 운영.

## 기술 스택
- **수집**: Python + 공공데이터 API (data.go.kr)
- **스케줄**: GitHub Actions cron (매일 KST 06:00)
- **저장**: JSON 파일 → GitHub 저장소 commit
- **지도**: 카카오맵 JavaScript API
- **프론트**: React (Vite)
- **호스팅**: Vercel

## 디렉토리 구조
```
zzapbang/
├── scripts/          # 데이터 수집 Python 스크립트
├── data/             # 수집된 JSON (날짜별 파일 + geocode 캐시)
├── src/              # React 앱
└── .github/workflows/
```

## 환경 변수 / GitHub Secrets
| 변수명 | 용도 |
|--------|------|
| `DATA_GO_KR_API_KEY` | 공공데이터포털 인증키 |
| `KAKAO_REST_API_KEY` | 카카오 REST API 키 (지오코딩, GitHub Actions에서 사용) |
| `VITE_KAKAO_JS_KEY` | 카카오 JavaScript 키 (지도 렌더링, 프론트엔드에서 사용) |

## 주요 API 엔드포인트
- 전세 실거래가: `https://apis.data.go.kr/1613000/RTMSDataSvcSHRent/getRTMSDataSvcSHRent`
- 카카오 지오코딩: `https://dapi.kakao.com/v2/local/search/address.json`

## 데이터 파일 규칙
- 일별 거래 데이터: `data/YYYY-MM-DD.json`
- 지오코딩 캐시: `data/geocode-cache.json` — 같은 주소 재호출 방지
- 데이터 인덱스: `data/index.json` — 프론트가 날짜 목록을 조회하는 파일

## 개발 규칙
- 지오코딩은 항상 캐시 우선 확인 후 API 호출
- GitHub Actions cron은 UTC 기준 (`0 21 * * *` = KST 06:00)
- React 앱 빌드 결과물은 Vercel이 자동 배포
