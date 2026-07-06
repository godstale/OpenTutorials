# Open Tutorials Course Bundler Protocol Specification

**Version:** 1.0.0  
**Status:** Active  
**Scope:** Open Tutorials Course Packaging & local execution

---

## 1. 개요 (Introduction)

본 문서는 Open Tutorials 플랫폼에 강좌(Course Package)를 등록하고 배포하기 위한 통합 번들 ZIP 파일 구조 및 각 항목의 역할, 정합성 검증 규칙을 규정합니다. 

이 프로토콜은 온디바이스 로컬 실행 환경(`db.json` 및 `public/courses`)과의 완벽한 호환을 보장하며, AI Agent 기반의 자동 강좌 제작 프로젝트에서 참조하여 강좌 파일을 무결성 있게 제작하기 위한 공식 가이드라인입니다.

---

## 2. 강좌 등록 및 처리 프로세스 (Registration Workflow)

Open Tutorials 플랫폼에서 강좌 번들이 처리되고 데이터베이스에 등록되는 단계는 다음과 같습니다.

1. **메타데이터 및 콘텐츠 기획**:
   - 강좌 카테고리, 대상 연령대, 학습 순서 제어 방식 등을 결정합니다.
   - 메인 지식베이스가 될 `wiki.md`와 개별 학습 카드(`cards/*.md`)의 마크다운 및 동영상 콘텐츠를 설계합니다.
2. **패키지 매니페스트(`package-manifest.json`) 작성**:
   - 필수 프로토콜 항목(`bundler_protocol_version`, `target_age`, `category`)을 설정하고 제목 및 기본 정보를 정의합니다. (더 이상 개별 하위 강좌 리스트 `courses`는 지정하지 않습니다.)
3. **패키지 구성 및 config.json 작성**:
   - 루트 경로에 `config.json`, `wiki.md`, `cards/` 디렉토리를 생성합니다.
   - `config.json` 내부에 학습 카드 파일 목록과 목차(TOC) 트리 구조를 정의합니다.
4. **단일 강좌 패키지 ZIP 압축**:
   - 루트에 `package-manifest.json`, `config.json`, `wiki.md`, `thumbnail.png`(선택), `cards/` 및 `images/` (마크다운에서 참조하는 이미지 리소스 폴더, 선택)를 두고 최종 하나의 ZIP 파일로 압축합니다.
5. **대시보드 업로드 및 정합성 검증**:
   - 사용자가 플랫폼 내 업로드 UI를 통해 ZIP 파일을 등록하면 브라우저단에서 JSZip을 이용하여 필수 파일 구성, JSON 문법 포맷, TOC와 파일명의 1:1 매칭 등을 사전 검증합니다.
6. **로컬 데이터베이스 반영**:
   - 검증이 완료된 데이터는 서버 API(`/api/admin/packages/upload`)로 전송되어 `db.json`에 `course_packages` 레코드로 영구 저장되며(TOC 및 cards 데이터도 메타데이터 컬럼으로 통합), 정적 리소스는 `public/courses/[slug]/` 하위에 직접 압축 해제되어 저장됩니다.

---

## 3. 강좌 패키지 ZIP 파일 구조 (Directory Structure)

강좌 패키지 ZIP 파일의 루트와 하위 경로는 반드시 아래와 같은 구조를 준수해야 합니다. 압축 해제 시 최상위 루트에 공백 폴더가 없어야 하며, 즉시 아래 항목들이 존재해야 합니다.

```text
[강좌 패키지 ZIP 파일]
├── package-manifest.json           # 통합 강좌 및 패키지 메타데이터 (필수)
├── config.json                     # 목차 및 카드 목록 스키마 설정 (필수)
├── wiki.md                         # 강좌 지식베이스 마크다운 파일 (필수)
├── thumbnail.png                   # 대표 썸네일 이미지 (선택, package-manifest.json에 매핑 가능)
├── cards/                          # 강의 카드 디렉토리 (필수)
│   ├── 01_intro.md                 # 마크다운 강의 카드
│   └── 02_video.json               # 동영상 강의 카드 (JSON)
└── images/                         # 마크다운 카드 내에서 참조하는 이미지 파일 폴더 (선택)
    └── schema.png
```

---

## 4. 메타데이터 스키마 및 속성 명세 (Schema Specification)

### 4.1 package-manifest.json (패키지 메타데이터)

| 필드명 | 타입 | 필수 여부 | 설명 | 예시 |
| :--- | :--- | :---: | :--- | :--- |
| `title` | String | **Mandatory** | 강좌 패키지의 공식 명칭 | `"마케팅 에이전트 마스터"` |
| `slug` | String | Optional | 플랫폼 URL 경로로 활용될 고유 키 (누락 시 Title 기반 자동변환) | `"marketing-integrated-course"` |
| `description` | String | Optional | 강좌 패키지에 대한 종합 설명 | `"초급부터 고급까지 다루는 종합 마케팅 과정"` |
| `thumbnail` | String | Optional | 대표 이미지 경로 | `"./thumbnail.png"` |
| `published` | Boolean | Optional | 즉시 공개 여부 (기본값: `true`) | `true` |
| `sequential_play` | Boolean | Optional | 카드들의 순차 수강 강제 여부 (기본값: `false`) | `false` |
| `force_checkpoint` | Boolean | Optional | 특정 체크포인트를 지나야만 다음 단계 활성화 (기본값: `false`) | `false` |
| `version` | String | Optional | 강좌 패키지 자체의 배포 버전 (기본값: `"1.0.0"`) | `"1.2.0"` |
| `changelog` | String | Optional | 버전별 주요 변경 사항 (기본값: `"최초 릴리즈"`) | `"TOC 구조 최적화 및 3장 실습 추가"` |
| `bundler_protocol_version` | String | **Mandatory** | 이 번들이 준수한 번들러 프로토콜 명세 버전 | `"1.0.0"` |
| `target_age` | String | **Mandatory** | 강좌 수강에 권장되는 대상 연령대 | `"전연령"`, `"초등학생"`, `"10대"`, `"성인"` |
| `category` | String | **Mandatory** | 강좌의 대분류 카테고리 | `"Programming"`, `"Design"`, `"Marketing"`, `"Math"` |

---

### 4.2 패키지 루트의 config.json (목차 및 카드 목록)

패키지 루트에 위치하는 `config.json`은 강좌의 상세 목차(TOC) 트리와 연결되는 마크다운 및 동영상 파일들의 목록을 기술합니다.

```json
{
  "cards": [
    "01_intro.md",
    "02_concept.md"
  ],
  "toc": [
    {
      "type": "chapter",
      "title": "1장. 마케팅 입문",
      "description": "마케팅의 기초 정의와 시장 구조를 파악합니다.",
      "children": [
        {
          "type": "section",
          "title": "마케팅의 정의",
          "description": "고객 가치를 창출하는 핵심 프로세스 이해",
          "filename": "01_intro.md"
        }
      ]
    }
  ]
}
```

#### TOC 노드 필드 명세

| 필드명 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :---: | :--- |
| `type` | String | **Mandatory** | 노드의 성격 (`chapter`, `section`, `subsection` 중 하나) |
| `title` | String | **Mandatory** | 목차에 렌더링될 실제 한글/외국어 제목 (파일명과 달라야 함) |
| `description` | String | **Mandatory** | 해당 단원의 요약 설명 (기본 템플릿 값 방치 금지) |
| `filename` | String | Conditional | 말단 노드(`section` 또는 `subsection`)인 경우 연결될 학습 카드 파일명. 마크다운(`.md`/`.mdx`) 또는 동영상 카드(`.json`) 형식 지원. (예: `"01_intro.md"`, `"02_video.json"`) |
| `children` | Array | Conditional | 상위 노드(`chapter` 등)인 경우 하위 TOC 노드 배열 |

---

### 4.3 동영상 카드 JSON 스펙 (`cards/*.json`)
학습 카드가 동영상일 경우, 기존 마크다운 파일 대신 구조화된 JSON 형식을 사용합니다. 파일의 필수 스키마는 다음과 같습니다.

```json
{
  "title": "개념 설명 영상",
  "type": "video",
  "video_info": {
    "provider": "youtube",
    "video_id": "dQw4w9WgXcQ",
    "duration_seconds": 212,
    "subtitles": [
      {
        "start": 0.0,
        "end": 5.5,
        "text": "안녕하세요! 이번 시간에는 리액트의 기본 원리에 대해 알아보겠습니다."
      },
      {
        "start": 5.6,
        "end": 12.0,
        "text": "먼저 컴포넌트란 무엇인지 정의부터 살펴볼까요?"
      }
    ]
  }
}
```

##### 필드 상세 정보
- `title`: 카드의 제목입니다.
- `type`: 카드의 물리 타입으로 반드시 `"video"` 여야 합니다.
- `video_info`: 동영상 상세 정보 객체입니다.
  - `provider`: 영상 제공 플랫폼 (현재 `"youtube"` 고정)
  - `video_id`: 유튜브 영상 고유 ID (예: `dQw4w9WgXcQ`)
  - `duration_seconds`: (선택) 동영상 전체 길이(초)
  - `subtitles`: (선택) 시간별 자막 정보 배열
    - `start`: 자막 노출 시작 시점 (초 단위 실수)
    - `end`: 자막 노출 종료 시점 (초 단위 실수)
    - `text`: 해당 구간의 자막 텍스트

---

## 5. 제작 예시 (Implementation Example)

### 5.1 package-manifest.json 예시

```json
{
  "title": "AI 튜터 기반 파이썬 프로그래밍",
  "slug": "ai-tutor-python-course",
  "description": "AI 튜터와 대화하며 배우는 파이썬 기초부터 활용까지",
  "thumbnail": "./thumbnail.png",
  "published": true,
  "sequential_play": true,
  "force_checkpoint": false,
  "version": "1.0.0",
  "changelog": "최초 릴리즈",
  "bundler_protocol_version": "1.0.0",
  "target_age": "10대 이상",
  "category": "Programming"
}
```

---

## 6. 제작 시 주의사항 및 검증 규칙 (Strict Validation Rules)

강좌 번들 작성 시 다음 항목 중 하나라도 위배되면 플랫폼 내 업로드 단계에서 검증 오류가 발생하여 등록이 거부됩니다.

1. **상위 디렉토리 미포함 (Flat ZIP)**:
   - ZIP 파일 압축 시, 최상위 경로에 단일 폴더가 있고 그 안에 `package-manifest.json`이 들어있는 이중 레이어 구조는 금지됩니다. ZIP 파일을 열었을 때 바로 `package-manifest.json`, `config.json`, `wiki.md`, `cards/`가 최상위 루트에 존재해야 합니다.
2. **TOC-Card 1:1 매칭 및 파일 정합성**:
   - `config.json`의 `cards` 배열 내 모든 파일명은 실제 ZIP 안의 `cards/` 폴더 내에 정확히 존재해야 하며, 대소문자까지 일치해야 합니다. (마크다운 `.md`, `.mdx` 및 동영상 카드 `.json` 확장자 포함)
   - `toc` 트리에서 `filename`이 명시된 노드는 반드시 `cards` 배열에 있는 파일명 중 하나여야 하며, `cards` 배열에 나열된 모든 파일이 `toc` 트리 어딘가에 한 번씩만 매핑되어야 합니다.
3. **무성의한 기본 텍스트 방치 금지**:
   - `toc` 노드의 `title`이 파일명과 완전히 동일(예: title이 `01_intro`인 경우)하면 안 됩니다. 사용자가 읽기 좋은 언어(예: `1강. 오리엔테이션 및 입문 가이드`)로 설정되어야 합니다.
   - `toc` 노드의 `description`이 `"강좌 상세 카드를 확인하세요."` 와 같은 기본값으로 설정되어 있다면 검증이 반려됩니다. 각 노드에 알맞은 요약 정보가 구체적으로 기술되어야 합니다.
4. **동영상 카드(`cards/*.json`) 스키마 검증**:
   - `title`(String)이 누락되면 업로드 API(`/api/admin/packages/upload`)가 즉시 오류를 반환합니다.
   - `type`은 반드시 문자열 `"video"`여야 합니다.
   - `video_info` 객체가 반드시 존재해야 하며, 그 하위의 `provider`는 현재 `"youtube"` 값만 허용됩니다.
   - `video_info.video_id`는 반드시 존재하는 문자열여야 합니다.
   - `video_info.subtitles`가 포함될 경우 반드시 배열(Array) 타입이어야 합니다.
   - **(권장, 서버 미검증)** `subtitles` 각 원소는 `start`(초 단위 시작 시각) < `end`(초 단위 종료 시각) 관계를 만족하고 시간 순으로 정렬된 상태로 제작해야 합니다. 서버는 배열 타입 여부만 검증하므로, 순서가 어긋나거나 구간이 역전된 자막을 넣어도 업로드는 성공하지만 학습 화면의 "자막 탐색" 패널 하이라이트와 클릭 탐색(seek) 기능이 오작동합니다.

---

## 7. 학습 카드 마크다운 가이드라인 (Markdown Card Guidelines)

가독성 높고 일관성 있는 학습 화면 UI를 위해 학습 카드 마크다운 작성 시 아래 가이드라인을 준수할 것을 권장합니다.

1. **헤더 레벨 (H1, H2) 사용**:
   - 학습 카드의 최상단 타이틀은 `# 챕터 및 레슨 제목` (H1) 형태로 시작해야 합니다.
   - 본문 내 주요 주제 구분은 `## 주제` (H2), 하위 항목은 `### 세부 주제` (H3)를 사용하여 구조화합니다. H1 및 H2 요소는 학습 화면에서 하단 경계선과 굵은 볼드 폰트 스타일로 자동 강조됩니다.
2. **테이블 표 (Tables)**:
   - 강좌 제작 시 데이터 비교나 매핑 정보를 표현할 때는 GFM(GitHub Flavored Markdown) 규격인 파이프 기호(`|`)를 사용한 테이블 표를 사용해야 합니다.
   - 예시:
     ```markdown
     | 통신 방식 | 주요 특징 | 추천 활용 상황 |
     | :--- | :--- | :--- |
     | USB | 유선 연결, 디버깅 용이 | PC/스마트폰과 직접 연동 시 |
     | Wi-Fi | 무선 연결, 인터넷 웹 통신 | 클라우드 데이터 전송 시 |
     ```
   - 플랫폼 학습 화면은 이 마크다운 테이블을 반응형 테두리와 정돈된 패딩 스타일을 지닌 프리미엄 테이블 UI로 자동 파싱하여 렌더링합니다.
3. **코드 블록 및 구문 강조 (Code Blocks & Syntax Highlighting)**:
   - 아두이노 스케치 소스 코드 및 프로그래밍 코드를 포함할 때는 반드시 코드 블록 기호(백틱 3개, ` ``` `)를 사용해야 합니다.
   - 이때 반드시 코드 블록 바로 옆에 언어 식별자(예: `cpp`, `arduino`, `javascript`, `json` 등)를 명시하여 소스 코드가 가독성 있게 강조되도록 합니다.
   - 예시:
     ```arduino
     void setup() {
       Serial.begin(9600);
     }
     ```
   - 플랫폼 학습 화면은 이 코드 블록을 다크 모드 기반의 프리미엄 코드 박스(상단 헤더에 언어 표시 및 1-클릭 클립보드 복사 버튼 내장)로 변환하여 제공합니다.
