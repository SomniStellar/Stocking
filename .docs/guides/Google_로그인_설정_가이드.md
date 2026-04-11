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
- 실 로그인 성공 이후 앱 내 확인 절차

본 문서는 현재 구현된 브라우저 기반 `Google Identity Services` 로그인 흐름을 실제 동작 가능 상태로 만들기 위한 절차를 다룬다.

## 2. 현재 구현 상태

현재 프로젝트에는 아래 항목이 이미 구현되어 있다.

- Google Identity Services 스크립트 로드
- 브라우저 기반 Google 로그인 버튼
- 로그인 후 사용자 프로필 조회
- Google Sheets 접근 토큰 요청
- 앱에서 템플릿 Spreadsheet 자동 생성
- 생성된 Spreadsheet의 실제 탭 값 읽기

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

- 현재 구현은 Spreadsheet 생성과 읽기를 모두 수행하므로 읽기 전용이 아니라 쓰기 권한까지 실제로 사용한다.

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

중요:

- `액세스 차단됨: Stocking은(는) Google 인증 절차를 완료하지 않았습니다`가 뜨면 가장 먼저 이 화면의 `테스트 사용자` 등록 여부를 확인한다.
- 현재 로그인하려는 Google 계정이 테스트 사용자 목록에 없으면 로그인할 수 없다.

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
- Git에는 올리지 않는다.
- 실제 발급된 값을 그대로 입력한다.
- 값 앞뒤 공백이 들어가지 않도록 주의한다.
- 개발 서버가 이미 실행 중이면 재시작해야 한다.

## 10. 실 로그인 구현 절차

아래 순서대로 진행하면 된다.

1. Google Cloud 프로젝트 생성
2. Google Sheets API 활성화
3. OAuth 동의 화면 설정
4. 테스트 사용자 등록
5. OAuth 클라이언트 생성
6. Authorized JavaScript origins 등록
7. `.env.local`에 `VITE_GOOGLE_CLIENT_ID` 입력
8. 개발 서버 재시작
9. 로그인 페이지 접속
10. `Continue with Google` 클릭
11. Google 승인 화면 확인
12. 로그인 성공 후 앱 상단에 사용자 이메일 표시 확인
13. Settings에서 `Create template spreadsheet` 실행
14. 생성된 시트 URL 확인
15. `Refresh sheet data` 동작 확인

## 11. 로컬 테스트 절차

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
9. `Create template spreadsheet` 실행
10. 생성된 시트가 열리는지 확인
11. `Refresh sheet data` 실행

## 12. GitHub Pages 배포 환경 설정

배포 후 실제 로그인을 사용하려면 아래 Origin이 등록되어 있어야 한다.

권장값:

- `https://somnistellar.github.io`

주의:

- GitHub Pages는 경로가 있어도 Origin 등록은 루트 도메인 기준이다.
- 앱이 `/Stocking/` 경로에 배포되더라도 Origin은 `https://somnistellar.github.io`만 등록한다.

## 13. 자주 발생하는 문제

### 13.1 Client ID missing

원인:

- `.env.local`이 없음
- `VITE_GOOGLE_CLIENT_ID` 오타
- 개발 서버 재시작 누락

조치:

- `.env.local` 확인
- 값 확인
- `npm.cmd run dev` 재시작

### 13.2 origin_mismatch

원인:

- Google Cloud Console에 현재 접속 주소가 등록되지 않음

조치:

- `Authorized JavaScript origins`에 현재 origin 추가
- 로컬 주소와 포트 재확인
- 앱에서 표시되는 현재 origin과 Google 설정값이 같은지 비교

### 13.3 액세스 차단됨 / 테스트 사용자 문제

대표 메시지:

- `액세스 차단됨: Stocking은(는) Google 인증 절차를 완료하지 않았습니다`

원인:

- OAuth 동의 화면이 테스트 상태인데 현재 계정이 테스트 사용자 목록에 없음
- OAuth 동의 화면 기본 정보 저장이 완료되지 않음

가장 먼저 확인할 항목:

1. `API 및 서비스 > OAuth 동의 화면`
2. 앱 이름/이메일이 저장되어 있는지 확인
3. `테스트 사용자`에 현재 로그인 중인 Google 계정이 있는지 확인
4. 저장 후 1~2분 뒤 다시 시도

### 13.4 로그인은 되지만 시트 생성 실패

원인:

- `Google Sheets API` 미활성화
- OAuth 권한 승인 누락
- 정책상 승인 문제

조치:

- API 활성화 확인
- 다시 로그인하여 권한 재승인
- 오류 메시지 확인

### 13.5 로그인은 되지만 Sheets 연결 실패

원인:

- 잘못된 Spreadsheet ID
- 시트 접근 권한 부족
- 시트 구조 불일치

조치:

- 생성된 템플릿 시트를 우선 사용
- 시트 ID 재확인
- 필수 탭 존재 여부 확인

## 14. 완료 체크리스트

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
- 템플릿 시트 생성 확인
- 시트 데이터 새로고침 확인

## 15. 다음 단계 연결

이 문서 설정이 끝나면 다음 구현으로 넘어간다.

1. 실 로그인 성공 확인
2. 템플릿 시트 생성 성공 확인
3. 실데이터 읽기 검증
4. 이후 `Stocks / Holdings / Favorites / Ideas` CRUD 구현
