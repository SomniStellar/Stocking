# WORKLOG

## 현재 기준 문서 경로
- 사용자 검토 시작: `docs/current/문서_마스터맵.md`
- Codex 참조 시작: `codex/REFERENCE.md`
- 본편: `docs/current/기능명세서.md`, `docs/current/화면별_UI_명세서.md`, `docs/current/시트_템플릿_설계서.md`
- 결정: `docs/decisions/지수비교_결정사항.md`, `docs/decisions/지수비교_미결정사항.md`, `docs/decisions/차트_라이브러리_검토.md`

## 운영 메모
- `docs/`는 사용자 검토용이다.
- `codex/`는 Codex 참조용이다.
- `docs/`에는 기능/설계/결정/가이드만 기록한다.
- `codex/`에는 작업 규칙/운영 메모만 기록한다.
- 문서 갱신 중 Codex용 메모가 보이면 `docs/`에 쓰지 않고 `codex/`로 분리한다.
- 지수비교 1차 결정: 직접지수 primary, 인덱스펀드/ETF fallback 후보, `resolved_ticker` 단일 조회, primary 2회 재시도 후 fallback 전환.
- 결정 완료 사항과 미결정 사항을 같은 문서에 섞지 않는다.
- 경로 변경 시 `docs/current/문서_마스터맵.md`와 `codex/REFERENCE.md`를 먼저 갱신한다.
- Git 작업은 병렬로 돌리지 않는다. `git add` -> `git status` -> `git commit` -> `git push` 순서로 처리한다.
- `multi_tool_use.parallel`로 git 단계들을 묶지 않는다.
- 커밋 직전에는 반드시 변경 예정 소스에 대해 코드 인스펙션을 먼저 수행하고, 명백한 결함이 없을 때만 커밋한다.
- 캡처 재생성, 이미지 열람, 프리뷰 이미지 확인은 사용자가 명시적으로 요청했을 때만 수행한다.
- 기본 검증은 build, test, 소스 인스펙션을 우선한다.
