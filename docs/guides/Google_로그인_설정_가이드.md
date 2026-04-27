# Google 로그인 설정 가이드

## 목적
- Stocking에서 실제 Google 로그인을 사용하기 위한 외부 설정 절차를 정리한다.
- 현재 앱 기준 로그인, 시트 생성, 시트 연결까지 가능한 상태를 만드는 것이 목표다.

## 현재 앱 기준 확인 범위
- Google Identity Services 스크립트 로드
- 브라우저 기반 Google 로그인
- 로그인 후 사용자 프로필 조회
- Google Sheets 접근 토큰 요청
- 앱에서 새 시트 생성
- 기존 시트 연결

## 준비물
- Google 계정
- Google Cloud Console 접근 권한
- 로컬 개발 주소

권장 로컬 주소:
- `http://127.0.0.1:4173`
- 필요 시 `http://localhost:4173`

## 1. Google Cloud 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com/)에 접속한다.
2. 새 프로젝트를 만든다.
3. 프로젝트 이름은 예를 들어 `Stocking`으로 둔다.

## 2. Google Sheets API 활성화
1. `API 및 서비스`로 이동한다.
2. `라이브러리`에서 `Google Sheets API`를 찾는다.
3. `사용`으로 활성화한다.

## 3. OAuth 동의 화면 설정
1. `API 및 서비스` > `OAuth 동의 화면`으로 이동한다.
2. 사용자 유형은 보통 `외부`를 사용한다.
3. 앱 이름, 지원 이메일, 개발자 이메일을 입력한다.
4. 테스트 단계면 현재 사용할 Google 계정을 `테스트 사용자`에 추가한다.

## 4. OAuth 클라이언트 생성
1. `API 및 서비스` > `사용자 인증 정보`로 이동한다.
2. `사용자 인증 정보 만들기` > `OAuth 클라이언트 ID`를 선택한다.
3. 애플리케이션 유형은 `웹 애플리케이션`으로 둔다.

### Authorized JavaScript origins
최소 권장값:
- `http://127.0.0.1:4173`
- `http://localhost:4173`

주의:
- 포트가 다르면 다른 origin이다.
- 경로(`/Stocking/`)가 아니라 origin만 등록한다.

## 5. Client ID 확인
발급된 `Client ID`를 복사한다.

예시:
```text
123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

## 6. 로컬 환경변수 설정
프로젝트 루트의 `.env.local`에 아래 값을 넣는다.

```bash
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

주의:
- `.env.local`은 Git에 올리지 않는다.
- 값 변경 후에는 개발 서버를 재시작한다.

## 7. 앱에서 확인하는 순서
1. 개발 서버 실행
   ```powershell
   npm.cmd run dev
   ```
2. `#/login`으로 이동한다.
3. `Continue with Google`을 누른다.
4. 로그인 성공 후 `#/settings`로 이동한다.
5. `Create new sheet` 또는 `Connect existing`를 실행한다.
6. 필요하면 `Sync latest data`를 실행한다.
7. `#/dashboard`, `#/holdings`에서 실제 데이터 반영을 확인한다.

## 자주 발생하는 문제
### Client ID missing
원인:
- `.env.local` 누락
- `VITE_GOOGLE_CLIENT_ID` 오타
- 개발 서버 재시작 누락

조치:
- `.env.local` 확인
- 값 확인
- `npm.cmd run dev` 재시작

### origin_mismatch
원인:
- 현재 접속 주소가 Google Cloud Console에 등록되지 않음

조치:
- `Authorized JavaScript origins`에 현재 origin 추가
- 주소와 포트 재확인

### 테스트 사용자 문제
원인:
- OAuth 동의 화면이 테스트 상태인데 현재 계정이 테스트 사용자 목록에 없음

조치:
- `OAuth 동의 화면`에서 테스트 사용자 목록 확인
- 현재 로그인할 계정 추가

### 로그인은 되지만 시트 생성 또는 연결 실패
원인:
- `Google Sheets API` 미활성화
- 권한 승인 누락
- 잘못된 시트 ID 입력

조치:
- API 활성화 여부 확인
- 로그인 후 다시 시도
- 시트 ID 재확인
