# Google 로그인 설정 가이드 v1

## 1. 문서 목적

본 문서는 Stocking 프로젝트에서 실제 Google 로그인을 가능하게 하기 위한 외부 설정 절차를 정리한 개발 참조 문서이다.

대상 범위:

- Google Cloud 프로젝트 생성
- OAuth 동의 화면 설정
- OAuth 클라이언트 생성
- 로컬 및 배포 환경 Origin 등록
- `.env.local` 설정
- 개발 중 확인 포인트

본 문서는 현재 구현된 브라우저 기반 `Google Identity Services` 로그인 흐름을 실제 동작 가능 상태로 만들기 위한 절차를 다룬다.

## 2. 현재 구현 상태

현재 프로젝트에는 아래 항목이 이미 구현되어 있다.

- Google Identity Services 스크립트 로드
- 브라우저 기반 Google 로그인 버튼
- 로그인 후 사용자 프로필 조회
- Google Sheets 접근 토큰 요청
- Spreadsheet ID 기반 시트 연결 준비

즉, 애플리케이션 코드 측 준비는 되어 있으며, 실제 로그인을 위해 Google Cloud 설정이 추가로 필요하다.

## 3. 사전 준비물

필요 항목:

- Google 계정
- Google Cloud Console 접근 권한
- 로컬 개발 주소
- GitHub Pages 배포 주소

예상 사용 주소:

- 로컬 개발 주소: `http://127.0.0.1:4173`
- 배포 주소 예시: `https://somnistellar.github.io`
- 앱 경로 예시: `https://somnistellar.github.io/Stocking/`

주의:

- Google OAuth의 `Authorized JavaScript origins`에는 경로가 아닌 Origin만 입력한다.
- 따라서 GitHub Pages는 `/Stocking/` 경로가 아니라 `https://somnistellar.github.io`를 등록한다.

## 4. Google Cloud 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속한다.
2. 새 프로젝트를 생성한다.
3. 프로젝트 이름은 예를 들어 `Stocking`으로 지정한다.
4. 생성 후 해당 프로젝트가 선택된 상태인지 확인한다.

권장:

- 개인 테스트 단계에서는 별도 프로젝트로 분리하는 것이 관리에 편하다.

## 5. Google Sheets API 활성화

1. Google Cloud Console에서 `API 및 서비스`로 이동한다.
2. `라이브러리` 메뉴를 연다.
3. `Google Sheets API`를 검색한다.
4. `사용` 버튼을 눌러 활성화한다.

참고:

- 현재 구현은 `spreadsheets.readonly` 권한 기준이므로 읽기 테스트는 이 API 활성화가 필수다.

## 6. OAuth 동의 화면 설정

1. `API 및 서비스` > `OAuth 동의 화면`으로 이동한다.
2. 사용자 유형을 선택한다.
   - 개인 테스트 목적이면 일반적으로 `외부` 사용
3. 앱 이름 입력
   - 예: `Stocking`
4. 사용자 지원 이메일 입력
5. 개발자 연락처 이메일 입력
6. 저장 후 다음 단계로 이동한다.

테스트 단계 권장:

- 앱 게시 전에는 테스트 모드로 두는 것이 안전하다.
- 테스트 사용자에 본인 Google 계정을 추가한다.

## 7. OAuth 클라이언트 생성

1. `API 및 서비스` > `사용자 인증 정보`로 이동한다.
2. `사용자 인증 정보 만들기` 클릭
3. `OAuth 클라이언트 ID` 선택
4. 애플리케이션 유형은 `웹 애플리케이션` 선택
5. 이름 입력
   - 예: `Stocking Web`

### 7.1 Authorized JavaScript origins 등록

최소 등록 권장값:

- `http://127.0.0.1:4173`
- `http://localhost:4173`
- `https://somnistellar.github.io`

주의:

- 포트가 다르면 다른 origin으로 취급된다.
- 로컬 테스트 시 실제 사용하는 주소를 정확히 등록해야 한다.

### 7.2 Authorized redirect URIs

현재 구현은 GIS token model 기반 브라우저 방식이므로, 일반적인 코드 교환용 redirect URI 중심 구조는 아직 필수는 아니다.

다만 추후 code flow로 확장할 가능성을 고려하면 문서화는 해두는 것이 좋다.

현재 단계에서는 비워 두거나, 향후 정책에 맞춰 추가한다.

## 8. 발급된 Client ID 확인

OAuth 클라이언트 생성 후 발급된 `Client ID`를 복사한다.

예시 형식:

```text
123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

이 값을 로컬 환경변수에 넣어야 한다.

## 9. 로컬 환경변수 설정

프로젝트 루트에 `.env.local` 파일을 생성한다.

예시:

```bash
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

주의:

- `.env.local`은 개인 개발용 파일로 관리한다.
- 실제 발급된 값을 그대로 입력한다.
- 값 앞뒤 공백이 들어가지 않도록 주의한다.

## 10. 로컬 테스트 절차

1. `.env.local` 생성
2. `VITE_GOOGLE_CLIENT_ID` 입력
3. 개발 서버 실행

```bash
npm.cmd run dev
```

4. 브라우저에서 로그인 페이지 접속
5. `Continue with Google` 버튼 클릭
6. Google 로그인 팝업 또는 승인 흐름 확인
7. 로그인 성공 후 대시보드 진입 여부 확인
8. 설정 페이지에서 로그인 상태 확인

## 11. GitHub Pages 배포 환경 설정

배포 후 실제 로그인을 사용하려면 아래 Origin이 등록되어 있어야 한다.

권장값:

- `https://somnistellar.github.io`

주의:

- GitHub Pages는 경로가 있어도 Origin 등록은 루트 도메인 기준이다.
- 앱이 `/Stocking/` 경로에 배포되더라도 Origin은 `https://somnistellar.github.io`만 등록한다.

## 12. 자주 발생하는 문제

### 12.1 Client ID missing

원인:

- `.env.local`이 없음
- `VITE_GOOGLE_CLIENT_ID` 오타
- 개발 서버 재시작 누락

조치:

- `.env.local` 확인
- 값 확인
- `npm.cmd run dev` 재시작

### 12.2 origin_mismatch

원인:

- Google Cloud Console에 현재 접속 주소가 등록되지 않음

조치:

- `Authorized JavaScript origins`에 현재 origin 추가
- 로컬 주소와 포트 재확인

### 12.3 access blocked 또는 테스트 사용자 문제

원인:

- OAuth 동의 화면이 테스트 상태인데 현재 계정이 테스트 사용자 목록에 없음

조치:

- 테스트 사용자에 본인 계정 추가

### 12.4 로그인은 되지만 Sheets 연결 실패

원인:

- `Google Sheets API` 미활성화
- 시트 접근 권한 부족
- 잘못된 Spreadsheet ID

조치:

- API 활성화 확인
- 대상 시트 접근 권한 확인
- 시트 ID 재확인

## 13. 완료 체크리스트

실 로그인 가능 상태의 최소 기준:

- Google Cloud 프로젝트 생성 완료
- Google Sheets API 활성화 완료
- OAuth 동의 화면 설정 완료
- 테스트 사용자 등록 완료
- OAuth 클라이언트 생성 완료
- 로컬 origin 등록 완료
- 배포 origin 등록 완료
- `.env.local` 설정 완료
- 로그인 버튼 클릭 시 승인 화면 노출 확인
- 로그인 후 사용자 이메일 표시 확인

## 14. 다음 단계 연결

이 문서 설정이 끝나면 다음 구현으로 넘어간다.

1. 기존 Google Spreadsheet 연결
2. 시트 템플릿 구조 검증
3. 실제 시트 데이터 읽기 바인딩
4. 이후 CRUD 구현
