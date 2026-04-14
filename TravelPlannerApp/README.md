# ✈️ 여행 플래너 (Travel Planner)

여행 계획과 일기를 관리하고 AI(Gemini, Nova)로 여행지 추천과 일정 조언을 받는 풀스택 웹 애플리케이션

---

## 📁 프로젝트 구조

```
5.travel-planner/
├── client/              # React (CRA) 프론트엔드
│   ├── public/
│   ├── src/
│   │   ├── App.js       # 메인 컴포넌트 (상태 관리, API 호출)
│   │   ├── App.css      # 여행 테마 스타일 (청록/산호 계열)
│   │   ├── index.js     # 엔트리 포인트
│   │   └── index.css    # 글로벌 스타일
│   ├── .env.example
│   └── package.json
├── server/              # Express 백엔드 API 서버
│   ├── server.js        # Express 서버, 라우트, DB 연결, SHA-256 해싱
│   ├── .env.example
│   └── package.json
├── gemini-lambda/       # Gemini AI Lambda 함수 (Node.js)
│   ├── index.js         # Lambda 핸들러 (@google/generative-ai)
│   └── package.json
├── bedrock-lambda/      # Bedrock Nova AI Lambda 함수 (Python)
│   ├── lambda_function.py  # Lambda 핸들러 (boto3 + pymysql)
│   └── layer.md         # pymysql Lambda Layer 설정 가이드
├── README.md
└── DropTable.md
```

---

## ☁️ AWS 리소스 설명

| 리소스 | 용도 |
|--------|------|
| **EC2** | Express 서버 호스팅 (Port 80) |
| **RDS (MySQL)** | 여행 데이터 저장 (`trips` 테이블) |
| **Lambda (Gemini)** | Node.js 런타임, Google Gemini API를 호출하여 여행지 추천/정보 생성 |
| **Lambda (Bedrock)** | Python 런타임, Amazon Bedrock converse API를 호출하여 여행 일정 조언 생성 |
| **Amazon Bedrock** | Nova AI 모델 — 여행 일정 조언 제공 |

---

## 🚀 실행 방법

### Server (Express)

```bash
cd server
npm install
```

`.env` 파일을 생성하고 환경 변수를 설정합니다 (`.env.example` 참조):

```bash
cp .env.example .env
# .env 파일을 편집하여 실제 값 입력
```

서버 실행:

```bash
node server.js
```

### Client (React)

```bash
cd client
npm install
```

`.env` 파일을 생성하고 환경 변수를 설정합니다 (`.env.example` 참조):

```bash
cp .env.example .env
# .env 파일을 편집하여 실제 값 입력
```

클라이언트 실행:

```bash
npm start
```

### Lambda 배포

- **Gemini Lambda**: `gemini-lambda/` 디렉토리를 zip으로 압축하여 AWS Lambda에 배포 (Node.js 런타임). Lambda 환경 변수에 `GEMINI_API_KEY`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` 설정.
- **Bedrock Lambda**: `bedrock-lambda/lambda_function.py`를 AWS Lambda에 배포 (Python 런타임). pymysql Lambda Layer 추가 필요 (`layer.md` 참조). Lambda 환경 변수에 `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` 설정.

---

## 🔧 환경 변수 설정

### Server (`server/.env`)

```
DB_HOST=<RDS 엔드포인트>
DB_USER=<DB 사용자명>
DB_PASSWORD=<DB 비밀번호>
DB_NAME=<DB 이름>
GEMINI_LAMBDA_URL=<Gemini Lambda 함수 URL>
BEDROCK_LAMBDA_URL=<Bedrock Lambda 함수 URL>
```

### Client (`client/.env`)

```
REACT_APP_SERVER_URL=<서버 URL (예: http://EC2_IP:80)>
```

### Gemini Lambda (AWS Lambda 환경 변수)

```
GEMINI_API_KEY=<Google Gemini API 키>
DB_HOST=<RDS 엔드포인트>
DB_USER=<DB 사용자명>
DB_PASSWORD=<DB 비밀번호>
DB_NAME=<DB 이름>
```

### Bedrock Lambda (AWS Lambda 환경 변수)

```
DB_HOST=<RDS 엔드포인트>
DB_USER=<DB 사용자명>
DB_PASSWORD=<DB 비밀번호>
DB_NAME=<DB 이름>
```

---

## 🌟 주요 기능

- **Trip CRUD**: 여행 계획/일기 생성, 조회(최신순), 개별 삭제, 전체 삭제
- **Gemini 여행지 추천**: Google Gemini AI가 여행지 관련 추천 정보를 한국어로 제공
- **Nova 일정 조언**: Amazon Bedrock Nova AI가 효율적인 여행 일정 조언을 한국어로 제공
- **SHA-256 데이터 무결성 검증**: Trip 데이터(제목+여행지+내용)의 해시값을 저장하고, 조회 시 변조 여부를 검증 (✅ 검증됨 / ⚠️ 변조 의심)

---

## ⚠️ 보안 주의사항

- **`.env` 파일을 절대 Git에 커밋하지 마세요.** `.gitignore`에 `.env`가 포함되어 있는지 반드시 확인하세요.
- **API 키(Gemini API Key 등)를 소스 코드에 직접 작성하지 마세요.** 반드시 환경 변수로 관리하세요.
- DB 비밀번호, Lambda URL 등 민감 정보는 `.env` 파일 또는 AWS Lambda 환경 변수를 통해 관리합니다.
