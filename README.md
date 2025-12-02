**프로젝트 라인엔딩 정책 (Line Ending Policy)**

아래 지침은 팀 전체가 동일한 라인엔딩 규칙을 사용하여 불필요한 diff와 빌드 문제를 방지하기 위한 최소 권장 설정입니다.

- **원칙**: 소스 코드는 저장소에서 LF (\n)로 통일합니다. Windows 전용 스크립트(예: PowerShell)는 예외로 CRLF를 허용할 수 있습니다.
- **관리파일**: `.gitattributes` 파일을 통해 저장소 차원의 규칙을 설정합니다. 이 저장소는 이미 `.gitattributes`를 포함합니다.

**개발자 권장 로컬 Git 설정**

- Windows (권장): 커밋 시 CRLF를 LF로 변환하려면 아래를 실행하세요(working tree는 플랫폼 기본대로 유지):

```powershell
git config --global core.autocrlf input
```

- 또는 Windows에서 체크아웃 시 자동으로 CRLF를 사용하려면(기본값):

```powershell
git config --global core.autocrlf true
```

**저장소에 적용할 때(한 번만 실행)**

`.gitattributes`를 추가하거나 변경한 뒤, 모든 파일의 라인엔딩을 정규화하려면 프로젝트 루트에서 아래를 실행하세요:

```powershell
# 1) .gitattributes가 변경된 경우 추가
git add .gitattributes

# 2) 모든 파일 재정규화
git add --renormalize .

# 3) 변경사항 커밋
git commit -m "chore: normalize line endings and add .gitattributes"
```

**node_modules 예외**

`node_modules/` 폴더는 버전 관리 대상에서 제외되어야 하므로 `.gitignore`에 포함되어 있습니다. 만약 `node_modules`가 레포에 추적되고 있다면 아래로 캐시에서만 제거하세요(로컬 파일은 유지):

```powershell
git rm -r --cached node_modules
git add .gitignore
git commit -m "chore: remove node_modules from repo and add to .gitignore"
```

**비고**

- `.gitattributes`가 우선권을 갖습니다. 팀은 위 정책을 따르고, 중요한 변경(예: `.gitattributes` 수정)은 커밋 전에 팀과 공유하세요.
- 라인엔딩 관련 변경 커밋은 많은 파일이 변경된 것처럼 보일 수 있으니 PR/커밋 메시지에 목적을 명확히 표기하세요.

---

파일에 대해 수정하거나 팀 안내 문구를 다듬어 드리길 원하면 말씀해 주세요.
